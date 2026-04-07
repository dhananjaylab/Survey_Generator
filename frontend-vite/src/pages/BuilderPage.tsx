import * as React from 'react';
import { QuestionPalette } from '@/components/survey/QuestionPalette';
import { SurveyCanvas } from '@/components/survey/SurveyCanvas';
import { PropertiesPanel } from '@/components/survey/PropertiesPanel';
import { Button } from '@/components/ui/Button';
import { useSurveyStore } from '@/stores/surveyStore';
import { useUIStore } from '@/stores/uiStore';
import { useNavigate } from 'react-router-dom';

export const BuilderPage: React.FC = () => {
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<string | null>(null);
  const { currentSurvey } = useSurveyStore();
  const { addNotification } = useUIStore();
  const navigate = useNavigate();

  const handleSave = () => {
    // Validate survey
    if (!currentSurvey?.title) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Survey must have a title before saving.',
      });
      return;
    }

    // In a real app we would dispatch an API save call here
    addNotification({
      type: 'success',
      title: 'Survey Saved',
      message: 'Your survey has been successfully saved to the server.',
    });
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
          <Button size="sm" onClick={handleSave}>Save Survey</Button>
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
