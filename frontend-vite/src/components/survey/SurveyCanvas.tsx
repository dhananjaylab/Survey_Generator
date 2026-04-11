import * as React from 'react';
import { useSurveyStore } from '@/stores/surveyStore';
import type { Question } from '@/types/survey';
import { cn } from '@/utils/cn';

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

  return (
    <div className="flex-1 bg-gray-50 p-8 h-full overflow-y-auto">
      <div 
        className={cn(
          "max-w-3xl mx-auto bg-white min-h-[60vh] p-8 shadow-sm transition-all rounded-md tracking-wide",
          isDragOver ? "border-2 border-dashed border-blue-400 bg-blue-50" : "border border-gray-200"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="mb-8 border-b border-gray-200 pb-6">
          <input 
            type="text" 
            className="text-3xl font-bold w-full outline-none placeholder-gray-300"
            placeholder="Survey Title"
            value={currentSurvey?.title || ''}
            onChange={(e) => setCurrentSurvey({ ...currentSurvey!, title: e.target.value })}
          />
          <input 
            type="text" 
            className="text-gray-500 mt-2 w-full outline-none placeholder-gray-300 text-lg"
            placeholder="Survey Description"
            value={currentSurvey?.description || ''}
            onChange={(e) => setCurrentSurvey({ ...currentSurvey!, description: e.target.value })}
          />
        </div>

        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <p>Drag and drop question types here</p>
          </div>
        ) : (
          <div className="space-y-6">
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
                  "p-4 border rounded-md cursor-pointer transition-colors group relative bg-white transform hover:-translate-y-1 hover:shadow-lg",
                  selectedQuestionId === q.id ? "border-blue-500 shadow-sm ring-1 ring-blue-500" : "border-gray-200",
                  draggedIndex === index ? "opacity-50 ring-2 ring-dashed ring-blue-400" : ""
                )}
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-gray-300">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
                <div className="flex bg-gray-100 -mx-4 -mt-4 mb-4 px-4 py-2 text-xs font-mono text-gray-500 uppercase rounded-t-md">
                  {q.type.replace('-', ' ')}
                </div>
                <h4 className="text-lg font-medium text-gray-900">
                  {q.title} {q.required && <span className="text-red-500">*</span>}
                </h4>
                {q.description && <p className="text-sm text-gray-500 mt-1">{q.description}</p>}
                
                {q.type === 'multiple-choice' && (
                  <div className="mt-4 space-y-2">
                    {q.choices?.map(c => (
                      <div key={c.id} className="flex items-center">
                        <input type="radio" disabled className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                        <label className="ml-3 block text-sm font-medium text-gray-700">{c.text}</label>
                      </div>
                    ))}
                  </div>
                )}
                {q.type === 'text' && (
                  <div className="mt-4">
                    <input disabled className="block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 p-2" placeholder="Text input answer..." />
                  </div>
                )}
                {q.type === 'rating' && (
                  <div className="mt-4 flex space-x-2">
                    {[...Array(q.maxScale || 5)].map((_, i) => (
                      <div key={i} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 bg-gray-50">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                )}
                {q.type === 'opinion-scale' && (
                  <div className="mt-4 flex space-x-2">
                    {[...Array(q.maxScale || 10)].map((_, i) => (
                      <div key={i} className="w-10 h-10 border border-gray-300 flex items-center justify-center text-gray-400 bg-gray-50">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                )}
                {q.type === 'nps' && (
                  <div className="mt-4 flex border border-gray-300 rounded-md overflow-hidden bg-gray-50 w-full max-w-2xl">
                    {[...Array(11)].map((_, i) => (
                      <div key={i} className="flex-1 py-3 text-center border-r last:border-r-0 border-gray-300 text-sm text-gray-500">
                        {i}
                      </div>
                    ))}
                  </div>
                )}
                {q.type === 'video' && (
                  <div className="mt-4 bg-gray-100 rounded-md h-40 flex items-center justify-center text-gray-400">
                    {q.videoUrl ? 'Video Embed Placeholder' : 'Click properties to add generic YouTube/Vimeo URL'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
