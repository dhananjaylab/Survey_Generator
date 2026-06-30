import * as React from 'react';
import { QuestionPalette } from '@/components/survey/QuestionPalette';
import { SurveyCanvas } from '@/components/survey/SurveyCanvas';
import { PropertiesPanel } from '@/components/survey/PropertiesPanel';
import { Button } from '@/components/ui/Button';
import { useSurveyStore } from '@/stores/surveyStore';
import { useUIStore } from '@/stores/uiStore';
import { useNavigate } from 'react-router-dom';
import { TriggersPanel } from '@/components/survey/TriggersPanel';
import { ApiEndpoints } from '@/services/api/endpoints';

export const BuilderPage: React.FC = () => {
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const { currentSurvey, currentProject } = useSurveyStore();
  const { addNotification } = useUIStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<'properties' | 'triggers'>('properties');
  const [exportMode, setExportMode] = React.useState<'local' | 'r2' | 'both'>('r2');

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
          element.rows = (question as any).rows || [{ value: 'row1', text: '<p>Row 1</p>' }];
          element.columns = (question as any).columns || [{ value: 'col1', text: '<p>Column 1</p>' }];
        } else if (question.type === 'video') {
          element.type = 'videofeedback';
        } else if (question.type === 'rating' || question.type === 'opinion-scale' || question.type === 'nps') {
          element.type = 'rating';
          element.rateMax = question.maxScale || (question.type === 'nps' ? 10 : 5);
          element.minRateDescription = question.lowLabel;
          element.maxRateDescription = question.highLabel;
        } else {
          // Fallback for unknown types
          element.type = 'comment';
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
        duration: 3000,
      });
      return;
    }

    if (!currentProject) {
      addNotification({
        type: 'error',
        title: 'Missing Project',
        message: 'Project information is missing. Please start from the beginning.',
        duration: 3000,
      });
      return;
    }

    const requestId = currentSurvey.id || (currentSurvey as any).request_id;
    if (!requestId) {
      addNotification({
        type: 'error',
        title: 'Missing Survey ID',
        message: 'We could not find the survey request ID needed for export.',
        duration: 3000,
      });
      return;
    }

    setIsSaving(true);

    try {
      const filename = `${currentSurvey.title.replace(/\s+/g, '_')}_survey.docx`;

      const backendPages = convertSurveyToBackendFormat();

      const exportResponse = await ApiEndpoints.exportDocument({
        request_id: requestId,
        project_name: currentProject.projectName,
        company_name: currentProject.companyName,
        survey_title: currentSurvey.title,
        survey_description: currentSurvey.description,
        pages: backendPages,
        delivery_mode: exportMode,
      });

      if (exportResponse.doc_link) {
        await ApiEndpoints.downloadFileByUrl(exportResponse.doc_link, filename);
      }

      addNotification({
        type: 'success',
        title: 'Export complete',
        message: exportMode === 'r2'
          ? 'Your DOCX has been uploaded to R2.'
          : exportMode === 'both'
            ? 'Your DOCX has been saved locally and uploaded to R2.'
            : 'Your DOCX has been saved locally.',
        duration: 3000,
      });
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
        message: error.detail || error.message || 'Failed to save and download survey. Please try again.',
        duration: 4000,
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
          <Button variant="outline" size="sm" onClick={() => navigate('/preview')} className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Preview</span>
          </Button>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1 shadow-sm">
            <button
              type="button"
              onClick={() => setExportMode('local')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${exportMode === 'local' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Local
            </button>
            <button
              type="button"
              onClick={() => setExportMode('r2')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${exportMode === 'r2' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              R2
            </button>
            <button
              type="button"
              onClick={() => setExportMode('both')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${exportMode === 'both' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Both
            </button>
          </div>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>{isSaving ? 'Exporting...' : 'Export DOCX'}</span>
          </Button>
        </div>
      </div>

      {/* Main Builder Area */}
      <div className="flex flex-1 overflow-hidden">
        <QuestionPalette />
        
        <SurveyCanvas 
          selectedQuestionId={selectedQuestionId} 
          onSelectQuestion={(q) => {
            setSelectedQuestionId(q.id);
            setActiveTab('properties'); // Auto switch to properties on selection
          }} 
        />
        
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full">
          <div className="p-4 border-b border-gray-100 flex justify-center">
            <div className="bg-gray-100 p-1 rounded-lg flex w-full max-w-[280px]">
              <button
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'properties' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('properties')}
              >
                Properties
              </button>
              <button
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'triggers' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('triggers')}
              >
                Triggers
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'properties' ? (
              <PropertiesPanel selectedQuestionId={selectedQuestionId} />
            ) : (
              <TriggersPanel />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


