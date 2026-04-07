import * as React from 'react';
import { QuestionPalette } from '@/components/survey/QuestionPalette';
import { SurveyCanvas } from '@/components/survey/SurveyCanvas';
import { PropertiesPanel } from '@/components/survey/PropertiesPanel';
import { Button } from '@/components/ui/Button';
import { useSurveyStore } from '@/stores/surveyStore';
import { useUIStore } from '@/stores/uiStore';
import { useNavigate } from 'react-router-dom';
import { ApiEndpoints } from '@/services/api/endpoints';

export const BuilderPage: React.FC = () => {
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const { currentSurvey, currentSurveyDocLink, currentProject, setCurrentSurveyDocLink } = useSurveyStore();
  const { addNotification } = useUIStore();
  const navigate = useNavigate();

  const convertSurveyToBackendFormat = () => {
    // Convert frontend Survey format to backend SurveyJS format
    if (!currentSurvey) return [];
    
    const backendPages: any[] = [];
    
    currentSurvey.pages.forEach((page) => {
      page.questions.forEach((question, index) => {
        const element: any = {
          name: `question${index + 1}`,
          title: `<p>${question.title}</p>`,
          surveyQID: question.id,
          isRequired: question.required,
        };
        
        // Map question type
        if (question.type === 'multiple-choice') {
          element.type = 'radiogroup';
          element.choices = (question.choices || []).map(choice => ({
            value: choice.value,
            text: `<p>${choice.text}</p>`,
          }));
        } else if (question.type === 'text') {
          element.type = 'comment';
        } else if (question.type === 'matrix') {
          element.type = 'matrix';
          // Matrix questions need rows and columns
          // For now, use placeholder data
          element.rows = [{ value: 'row1', text: '<p>Row 1</p>' }];
          element.columns = [{ value: 'col1', text: '<p>Column 1</p>' }];
        } else if (question.type === 'video') {
          element.type = 'videofeedback';
        }
        
        backendPages.push({
          name: `page${index + 1}`,
          elements: [element],
        });
      });
    });
    
    return backendPages;
  };

  const handleSave = async () => {
    // Validate survey
    if (!currentSurvey?.title) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Survey must have a title before saving.',
        duration: 5000,
      });
      return;
    }

    if (!currentProject) {
      addNotification({
        type: 'error',
        title: 'Missing Project',
        message: 'Project information is missing. Please start from the beginning.',
        duration: 5000,
      });
      return;
    }

    setIsSaving(true);

    try {
      // Step 1: Regenerate the document with current survey state
      addNotification({
        type: 'info',
        title: 'Generating Document',
        message: 'Creating document with your current survey changes...',
        duration: 3000,
      });

      const backendPages = convertSurveyToBackendFormat();
      
      console.log('📄 Regenerating document with:', {
        request_id: currentSurvey.id,
        project_name: currentProject.projectName,
        company_name: currentProject.companyName,
        survey_title: currentSurvey.title,
        pages_count: backendPages.length,
      });
      
      const regenerateResponse = await ApiEndpoints.regenerateSurveyDocument({
        request_id: currentSurvey.id,
        project_name: currentProject.projectName,
        company_name: currentProject.companyName,
        survey_title: currentSurvey.title,
        survey_description: currentSurvey.description,
        pages: backendPages,
      });

      if (regenerateResponse.success) {
        // Update the doc_link with the new one
        setCurrentSurveyDocLink(regenerateResponse.doc_link);
        
        addNotification({
          type: 'success',
          title: 'Server Upload Successful',
          message: 'Survey has been uploaded to cloud storage.',
          duration: 4000,
        });

        // Step 2: Download the regenerated document
        const filename = `${currentSurvey.title.replace(/\s+/g, '_')}_survey.docx`;
        
        const response = await fetch(regenerateResponse.doc_link);
        
        if (!response.ok) {
          throw new Error('Failed to download survey document');
        }
        
        const blob = await response.blob();
        
        // Create a download link and trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        addNotification({
          type: 'success',
          title: 'Survey Downloaded',
          message: `Survey document "${filename}" has been downloaded successfully.`,
          duration: 5000,
        });
      }
    } catch (error: any) {
      console.error('Save error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
      });
      
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: error.message || 'Failed to save and download survey. Please try again.',
        duration: 7000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-[85vh] -mx-4 sm:-mx-6 lg:-mx-8 -my-8">
      {/* Builder Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center z-10">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-bold text-gray-800">
            {currentSurvey?.title || 'Survey Builder'}
          </h2>
          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
            Draft
          </span>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/preview')}>Preview</Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Downloading...' : 'Save Survey'}
          </Button>
        </div>
      </div>

      {/* Main Builder Area */}
      <div className="flex flex-1 overflow-hidden">
        <QuestionPalette />
        
        <SurveyCanvas 
          selectedQuestionId={selectedQuestionId} 
          onSelectQuestion={(q) => setSelectedQuestionId(q.id)} 
        />
        
        <PropertiesPanel 
          selectedQuestionId={selectedQuestionId} 
        />
      </div>
    </div>
  );
};
