import * as React from 'react';
import { useSurveyStore } from '@/stores/surveyStore';
import type { Question } from '@/types/survey';

interface PropertiesPanelProps {
  selectedQuestionId: string | null;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedQuestionId }) => {
  const { currentSurvey, setCurrentSurvey } = useSurveyStore();
  
  if (!selectedQuestionId) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4 h-full flex flex-col items-center justify-center text-gray-400">
        <p>Select a question to edit properties</p>
      </div>
    );
  }

  // Find question
  const pageIndex = 0; // MVP
  const questions = currentSurvey?.pages[pageIndex]?.questions || [];
  const questionIndex = questions.findIndex(q => q.id === selectedQuestionId);
  if (questionIndex === -1) return null;
  const question = questions[questionIndex];
  if (!question) return null;

  const updateQuestion = (updates: Partial<Question>) => {
    if (!currentSurvey || !currentSurvey.pages || currentSurvey.pages.length === 0) return;
    const newQuestions = [...questions];
    const newQuestion: Question = { ...question, ...updates } as Question;
    newQuestions[questionIndex] = newQuestion;
    
    const newPages = [...currentSurvey.pages];
    const targetPage = newPages[pageIndex];
    if (targetPage) {
      targetPage.questions = newQuestions;
    }
    
    setCurrentSurvey({ ...currentSurvey, pages: newPages });
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 h-full overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">
        Properties
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Question Title</label>
          <input
            type="text"
            value={question.title}
            onChange={(e) => updateQuestion({ title: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border outline-none"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
          <textarea
            value={question.description || ''}
            onChange={(e) => updateQuestion({ description: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border outline-none min-h-[60px]"
          />
        </div>

        <div className="flex items-center mt-4">
          <input
            id="required-checkbox"
            type="checkbox"
            checked={question.required}
            onChange={(e) => updateQuestion({ required: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="required-checkbox" className="ml-2 block text-sm text-gray-900">
            Required Question
          </label>
        </div>

        {question.type === 'multiple-choice' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Choices</label>
            <div className="space-y-2">
              {question.choices?.map((choice, idx) => (
                <div key={choice.id} className="flex gap-2">
                  <input
                    type="text"
                    value={choice.text}
                    onChange={(e) => {
                      const newChoices = [...(question.choices || [])];
                      newChoices[idx] = { ...choice, text: e.target.value, value: e.target.value };
                      updateQuestion({ choices: newChoices });
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1.5 border outline-none"
                  />
                  <button 
                    onClick={() => {
                      const newChoices = question.choices?.filter(c => c.id !== choice.id);
                      updateQuestion({ choices: newChoices });
                    }}
                    className="text-red-500 hover:text-red-700 font-bold"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <button
                className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-2"
                onClick={() => {
                  const newChoices = [...(question.choices || []), { id: `c-${Date.now()}`, text: 'New Option', value: 'opt' }];
                  updateQuestion({ choices: newChoices });
                }}
              >
                + Add Choice
              </button>
            </div>
          </div>
        )}

        {(question.type === 'rating' || question.type === 'opinion-scale' || question.type === 'nps') && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 uppercase mb-4">Scale Settings</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Scale (e.g. 5 or 10)</label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={question.maxScale || (question.type === 'nps' ? 10 : 5)}
                  onChange={(e) => updateQuestion({ maxScale: parseInt(e.target.value) || 5 })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border outline-none"
                  disabled={question.type === 'nps'} // NPS is fixed 0-10
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Left Label (Low)</label>
                <input
                  type="text"
                  placeholder="e.g. Not likely"
                  value={question.lowLabel || ''}
                  onChange={(e) => updateQuestion({ lowLabel: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Right Label (High)</label>
                <input
                  type="text"
                  placeholder="e.g. Very likely"
                  value={question.highLabel || ''}
                  onChange={(e) => updateQuestion({ highLabel: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {question.type === 'video' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 uppercase mb-4">Video Settings</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Video Embed URL (YouTube/Vimeo)</label>
              <input
                type="text"
                placeholder="https://www.youtube.com/embed/..."
                value={question.videoUrl || ''}
                onChange={(e) => updateQuestion({ videoUrl: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border outline-none font-mono text-xs"
              />
              <p className="text-xs text-gray-500 mt-2">
                Make sure to use the <strong>embed</strong> URL format, not the standard watch link.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
