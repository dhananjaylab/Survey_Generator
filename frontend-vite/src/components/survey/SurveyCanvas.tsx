import * as React from 'react';
import { useSurveyStore } from '@/stores/surveyStore';
import type { Question } from '@/types/survey';
import { cn } from '@/utils/cn';
import { 
  Bars2Icon, 
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface SurveyCanvasProps {
  onSelectQuestion: (question: Question) => void;
  selectedQuestionId: string | null;
}

export const SurveyCanvas: React.FC<SurveyCanvasProps> = ({ onSelectQuestion, selectedQuestionId }) => {
  const { currentSurvey, setCurrentSurvey } = useSurveyStore();
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

  // For MVP, we operate on a single page or the first page
  const questions = currentSurvey?.pages[0]?.questions || [];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    // Ignore if this is an internal reorder drop (handled by specific elements)
    if (e.dataTransfer.getData('source') === 'canvas-reorder') return;
    
    const type = e.dataTransfer.getData('questionType') as Question['type'];
    if (!type) return;

    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      type,
      title: 'New Question',
      required: false,
      choices: type === 'multiple-choice' ? [{ id: 'c1', text: 'Option 1', value: 'opt1' }] : undefined,
    };

    const newPages = currentSurvey?.pages && currentSurvey.pages.length > 0 ? [...currentSurvey.pages] : [{ id: 'p1', name: 'Page 1', title: 'Page 1', questions: [] as Question[] }];
    const firstPage = newPages[0];
    if (firstPage) {
        firstPage.questions = [...(firstPage.questions || []), newQuestion];
    }

    setCurrentSurvey({
      ...currentSurvey,
      id: currentSurvey?.id || `sim-${Date.now()}`,
      title: currentSurvey?.title || 'Draft Survey',
      description: currentSurvey?.description || '',
      settings: currentSurvey?.settings || { showProgressBar: true, showQuestionNumbers: true, allowBack: true, completeText: 'Done' },
      pages: newPages,
    });
  };

  const handleSortDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('source', 'canvas-reorder');
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleSortDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }
    
    const newPages = currentSurvey?.pages && currentSurvey.pages.length > 0 ? [...currentSurvey.pages] : [];
    const targetPage = newPages[0];
    if (targetPage) {
      const newQuestions = [...targetPage.questions];
      const [movedItem] = newQuestions.splice(draggedIndex, 1);
      newQuestions.splice(dropIndex, 0, movedItem);
      targetPage.questions = newQuestions;
      
      setCurrentSurvey({
        ...currentSurvey!,
        pages: newPages,
      });
    }
    setDraggedIndex(null);
  };

  const deleteQuestion = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newPages = [...(currentSurvey?.pages || [])];
    const targetPage = newPages[0];
    if (targetPage) {
      targetPage.questions = targetPage.questions.filter(q => q.id !== id);
      setCurrentSurvey({
        ...currentSurvey!,
        pages: newPages
      });
    }
  };

  return (
    <div className="flex-1 bg-[#F9FAFB] p-12 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto mb-10">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Survey Builder</h1>
        <p className="text-gray-500 font-medium mt-1">Drag and drop to reorder questions.</p>
      </div>

      <div 
        className={cn(
          "max-w-4xl mx-auto min-h-[70vh] transition-all rounded-3xl",
          isDragOver ? "ring-4 ring-blue-500/20 bg-blue-50/50" : ""
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 bg-white shadow-sm">
            <PlusIcon className="w-12 h-12 mb-4 text-gray-300" />
            <p className="font-semibold">Drag and drop question types here</p>
            <p className="text-xs mt-2 uppercase tracking-widest font-bold opacity-60">or click them in the palette</p>
          </div>
        ) : (
          <div className="space-y-8">
            {questions.map((q, index) => (
              <div 
                key={q.id}
                draggable
                onDragStart={(e) => handleSortDragStart(e, index)}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => handleSortDrop(e, index)}
                onDragEnd={() => setDraggedIndex(null)}
                onClick={() => onSelectQuestion(q)}
                className={cn(
                  "bg-white border p-6 rounded-2xl cursor-pointer transition-all relative group flex items-start space-x-6",
                  selectedQuestionId === q.id 
                    ? "border-gray-900 shadow-xl ring-2 ring-gray-900" 
                    : "border-gray-100 shadow-md hover:shadow-lg hover:border-gray-300",
                  draggedIndex === index ? "opacity-30 scale-95" : "scale-100"
                )}
              >
                {/* Drag Handle */}
                <div className="flex-shrink-0 pt-1">
                  <Bars2Icon className="w-5 h-5 text-gray-400 cursor-grab active:cursor-grabbing" />
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-2 py-1 rounded">
                      {q.type.replace('-', ' ')}
                    </span>
                  </div>
                  
                  <h4 className="text-lg font-bold text-gray-900 break-words leading-tight">
                    {q.title || 'Untitled Question'}
                    {q.required && <span className="text-red-500 ml-1">*</span>}
                  </h4>
                  
                  {q.description && (
                    <p className="text-sm text-gray-500 mt-2 font-medium leading-relaxed italic">
                      {q.description}
                    </p>
                  )}
                  
                  {/* Type Preview */}
                  <div className="mt-6 pointer-events-none origin-left">
                    {q.type === 'multiple-choice' && (
                      <div className="space-y-3">
                        {q.choices?.slice(0, 5).map(c => (
                          <div key={c.id} className="flex items-center space-x-3">
                            <div className="w-5 h-5 rounded-full border-2 border-gray-200 bg-white" />
                            <span className="text-sm font-medium text-gray-400 capitalize whitespace-nowrap overflow-hidden text-ellipsis">
                              {c.text || c.value}
                            </span>
                          </div>
                        ))}
                        {q.choices && q.choices.length > 5 && (
                          <span className="text-[10px] text-gray-300 font-bold uppercase tracking-tighter">
                            + {q.choices.length - 5} more options
                          </span>
                        )}
                      </div>
                    )}
                    {q.type === 'text' && (
                      <div className="h-12 w-full bg-gray-50 border border-gray-200 rounded-xl flex items-center px-4">
                        <span className="text-xs text-gray-300 font-bold uppercase tracking-widest">User Text Response</span>
                      </div>
                    )}
                    {(q.type === 'rating' || q.type === 'nps' || q.type === 'opinion-scale') && (
                      <div className="space-y-2">
                        <div className="flex space-x-1 overflow-x-auto pb-1 no-scrollbar">
                          {[...Array(q.type === 'nps' ? 11 : (q.maxScale || 5))].map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-xs font-black text-gray-300">
                              {q.type === 'rating' ? i + 1 : i}
                            </div>
                          ))}
                        </div>
                        {(q.lowLabel || q.highLabel) && (
                          <div className="flex justify-between w-full text-[10px] font-black text-gray-300 uppercase tracking-tighter">
                            <span>{q.lowLabel || 'Low'}</span>
                            <span>{q.highLabel || 'High'}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {q.type === 'video' && (
                      <div className="aspect-video w-full max-w-sm bg-gray-900 rounded-2xl flex flex-col items-center justify-center text-gray-500 border border-gray-800 shadow-inner">
                        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Video Content Preview</span>
                        {q.videoUrl && <span className="text-[10px] text-blue-400/50 mt-1 font-medium truncate px-4 w-full text-center">{q.videoUrl}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => deleteQuestion(e, q.id)}
                  className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors p-1"
                  title="Delete Question"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

