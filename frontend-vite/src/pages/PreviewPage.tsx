import * as React from 'react';
import { useSurveyStore } from '@/stores/surveyStore';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';

export const PreviewPage: React.FC = () => {
  const { currentSurvey } = useSurveyStore();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = React.useState<'desktop' | 'mobile'>('desktop');
  
  if (!currentSurvey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-xl text-gray-600 mb-4">No survey selected for preview.</p>
        <Button onClick={() => navigate('/builder')}>Back to Builder</Button>
      </div>
    );
  }

  // MVP single page preview
  const questions = currentSurvey.pages[0]?.questions || [];

  const handleSimulateResponse = () => {
    alert("Survey submission simulated successfully!");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Preview Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center z-10 sticky top-0">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/builder')}>
            &larr; Back to Editor
          </Button>
          <span className="text-sm font-medium text-gray-500">Previewing: {currentSurvey.title}</span>
        </div>
        
        <div className="flex items-center space-x-4 bg-gray-100 p-1 rounded-lg">
          <button 
            className={cn(
              "px-3 py-1 text-sm font-medium rounded-md transition-shadow",
              viewMode === 'desktop' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            )}
            onClick={() => setViewMode('desktop')}
          >
            Desktop
          </button>
          <button 
            className={cn(
              "px-3 py-1 text-sm font-medium rounded-md transition-shadow",
              viewMode === 'mobile' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            )}
            onClick={() => setViewMode('mobile')}
          >
            Mobile
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 bg-gray-100 overflow-y-auto p-4 md:p-8 flex justify-center">
        <div 
          className={cn(
            "bg-white shadow-md transition-all duration-300 relative",
            viewMode === 'desktop' ? "w-full max-w-4xl rounded-lg min-h-[70vh]" : "w-[375px] min-h-[812px] rounded-3xl border-[8px] border-black my-8"
          )}
        >
          {viewMode === 'mobile' && (
            <div className="w-40 h-6 bg-black absolute top-0 left-1/2 -translate-x-1/2 rounded-b-xl z-20"></div>
          )}
          
          <div className={cn("h-full", viewMode === 'mobile' ? "pt-10 px-5 pb-8 overflow-y-auto" : "p-8 md:p-12")}>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentSurvey.title}</h1>
              {currentSurvey.description && (
                <p className="text-lg text-gray-600">{currentSurvey.description}</p>
              )}
            </div>

            <div className="space-y-8">
              {questions.length === 0 ? (
                <p className="text-center text-gray-500 my-12">This survey has no questions.</p>
              ) : (
                questions.map((question, index) => (
                  <div key={question.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {index + 1}. {question.title}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                    {question.description && (
                      <p className="text-sm text-gray-500 mb-4">{question.description}</p>
                    )}
                    
                    <div className="mt-4">
                      {question.type === 'text' && (
                        <input 
                          type="text" 
                          className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                          placeholder="Your answer"
                        />
                      )}
                      
                      {question.type === 'multiple-choice' && (
                        <div className="space-y-2">
                          {question.choices?.map(choice => (
                            <label key={choice.id} className="flex items-start p-3 border border-gray-200 rounded-md hover:bg-white cursor-pointer transition-colors bg-white">
                              <input 
                                type="radio" 
                                name={`q-${question.id}`} 
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <span className="ml-3 block text-gray-700">{choice.text}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {questions.length > 0 && (
              <div className="mt-12 flex justify-center border-t border-gray-200 pt-8">
                <Button size="lg" className="w-full md:w-auto md:min-w-[200px]" onClick={handleSimulateResponse}>
                  Submit Response
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
