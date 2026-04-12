import * as React from 'react';
import { useSurveyStore } from '@/stores/surveyStore';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { getEmbedUrl } from '@/utils/helpers';

export const PreviewPage: React.FC = () => {
  const { currentSurvey } = useSurveyStore();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = React.useState<'desktop' | 'mobile'>('desktop');
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState<number>(-1); // -1 is the "Welcome" screen
  const [answers, setAnswers] = React.useState<Record<string, any>>({});
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);
  
  if (!currentSurvey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-xl text-gray-600 mb-4">No survey selected for preview.</p>
        <Button onClick={() => navigate('/builder')}>Back to Builder</Button>
      </div>
    );
  }

  const questions = currentSurvey.pages[0]?.questions || [];

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSimulateResponse();
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > -1) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSimulateResponse = () => {
    setShowSuccessModal(true);
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
      <div className="flex-1 bg-gray-50 overflow-y-auto p-4 md:p-12 flex justify-center items-center">
        <div 
          className={cn(
            "bg-white shadow-2xl transition-all duration-500 relative flex flex-col items-center justify-center",
            viewMode === 'desktop' ? "w-full max-w-5xl rounded-[40px] min-h-[70vh] p-16" : "w-[375px] min-h-[812px] rounded-[60px] border-[12px] border-black my-8 p-10"
          )}
        >
          {viewMode === 'mobile' && (
            <div className="w-32 h-7 bg-black absolute top-0 left-1/2 -translate-x-1/2 rounded-b-[2rem] z-20"></div>
          )}
          
          <div className="w-full max-w-2xl h-full flex flex-col justify-center animate-in fade-in zoom-in-95 duration-500">
            {currentQuestionIndex === -1 ? (
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <h1 className="text-5xl font-black text-gray-900 leading-tight">{currentSurvey.title}</h1>
                  {currentSurvey.description && (
                    <p className="text-xl text-gray-500 font-medium leading-relaxed italic">{currentSurvey.description}</p>
                  )}
                </div>
                <div className="pt-8">
                  <Button size="lg" onClick={() => setCurrentQuestionIndex(0)} className="px-12 py-8 text-xl font-bold rounded-2xl shadow-xl hover:scale-105 transition-transform">
                    Get Started
                  </Button>
                  <p className="text-xs text-gray-400 mt-4 font-bold uppercase tracking-widest">press Enter ↵</p>
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <span className="text-blue-600 font-black text-2xl">{currentQuestionIndex + 1} →</span>
                    <h3 className="text-3xl font-black text-gray-900 leading-tight">
                      {questions[currentQuestionIndex].title}
                      {questions[currentQuestionIndex].required && <span className="text-red-500 ml-2">*</span>}
                    </h3>
                  </div>
                  {questions[currentQuestionIndex].description && (
                    <p className="text-lg text-gray-400 font-medium italic pl-12">
                      {questions[currentQuestionIndex].description}
                    </p>
                  )}
                </div>

                <div className="pl-12 pt-4">
                  {questions[currentQuestionIndex].type === 'video' && (
                    <div className="aspect-video w-full rounded-3xl overflow-hidden shadow-2xl bg-black border border-gray-100">
                      {questions[currentQuestionIndex].videoUrl ? (
                        <iframe 
                          src={getEmbedUrl(questions[currentQuestionIndex].videoUrl)} 
                          className="w-full h-full" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          Video URL not set in properties
                        </div>
                      )}
                    </div>
                  )}

                  {questions[currentQuestionIndex].type === 'multiple-choice' && (
                    <div className="space-y-3">
                      {questions[currentQuestionIndex].choices?.map((choice, idx) => (
                        <button 
                          key={choice.id}
                          onClick={() => {
                            setAnswers({ ...answers, [questions[currentQuestionIndex].id]: choice.value });
                            handleNext();
                          }}
                          className="w-full flex items-center p-4 border-2 border-gray-100 rounded-2xl hover:border-gray-900 hover:bg-gray-50 transition-all font-bold text-gray-800 text-left group"
                        >
                          <span className="w-8 h-8 flex items-center justify-center border-2 border-gray-200 rounded-lg mr-4 group-hover:bg-gray-900 group-hover:text-white transition-colors text-xs">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          {choice.text}
                        </button>
                      ))}
                    </div>
                  )}

                  {questions[currentQuestionIndex].type === 'text' && (
                    <div className="space-y-4">
                      <textarea 
                        className="w-full p-6 text-2xl font-bold bg-transparent border-b-2 border-gray-100 outline-none focus:border-gray-900 transition-colors placeholder-gray-200 min-h-[120px]" 
                        placeholder="Type your answer here..."
                        autoFocus
                        value={answers[questions[currentQuestionIndex].id] || ''}
                        onChange={(e) => setAnswers({ ...answers, [questions[currentQuestionIndex].id]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleNext()}
                      />
                    </div>
                  )}

                  {(questions[currentQuestionIndex].type === 'rating' || questions[currentQuestionIndex].type === 'opinion-scale' || questions[currentQuestionIndex].type === 'nps') && (
                    <div className="space-y-6">
                      <div className="flex flex-wrap gap-2">
                        {[...Array((questions[currentQuestionIndex].maxScale || (questions[currentQuestionIndex].type === 'nps' ? 10 : 5)) + 1)].map((_, i) => {
                          const val = questions[currentQuestionIndex].type === 'rating' ? i + 1 : i;
                          if (questions[currentQuestionIndex].type === 'rating' && val > (questions[currentQuestionIndex].maxScale || 5)) return null;
                          
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                setAnswers({ ...answers, [questions[currentQuestionIndex].id]: val });
                                handleNext();
                              }}
                              className="w-14 h-14 flex items-center justify-center border-2 border-gray-100 rounded-2xl font-black text-xl hover:border-gray-900 hover:bg-gray-50 transition-all"
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                      {(questions[currentQuestionIndex].lowLabel || questions[currentQuestionIndex].highLabel) && (
                        <div className="flex justify-between text-xs font-black uppercase tracking-widest text-gray-400 max-w-xl">
                          <span>{questions[currentQuestionIndex].lowLabel || 'Poor'}</span>
                          <span>{questions[currentQuestionIndex].highLabel || 'Excellent'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-6 pl-12 pt-8">
                  <Button size="lg" onClick={handleNext} className="px-10 py-6 text-lg font-bold rounded-xl shadow-lg">
                    {currentQuestionIndex === questions.length - 1 ? 'Submit' : 'OK ✓'}
                  </Button>
                  <div className="flex space-x-2">
                    <button onClick={handlePrev} className="p-3 text-gray-400 hover:text-gray-900 transition-colors">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button onClick={handleNext} className="p-3 text-gray-400 hover:text-gray-900 transition-colors">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {currentQuestionIndex > -1 && (
            <div className="absolute top-0 left-0 w-full h-2 bg-gray-50">
              <div 
                className="h-full bg-blue-600 transition-all duration-500" 
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
