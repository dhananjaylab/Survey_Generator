import * as React from 'react';
import { useSurveyStore } from '@/stores/surveyStore';
import type { Question } from '@/types/survey';


export const QuestionPalette: React.FC = () => {
  const questionTypes = [
    { type: 'multiple-choice', label: 'Multiple Choice', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { type: 'text', label: 'Text Input', icon: 'M4 7V4h16v3M12 4v16' },
    { type: 'matrix', label: 'Matrix Table', icon: 'M4 6h16M4 12h16M4 18h16' },
    { type: 'rating', label: 'Rating', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    { type: 'nps', label: 'NPS', icon: 'M9 19V6m5 13v-8m5 8V4M4 19h16' },
    { type: 'opinion-scale', label: 'Opinion Scale', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
    { type: 'video', label: 'Video Question', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4z M4 6h10a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z' },
  ];

  const { currentSurvey, setCurrentSurvey } = useSurveyStore();

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('questionType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleClick = (type: string) => {
    const qType = type as Question['type'];
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      type: qType,
      title: 'New Question',
      required: false,
      choices: qType === 'multiple-choice' ? [{ id: 'c1', text: 'Option 1', value: 'opt1' }] : undefined,
    };

    const newPages = currentSurvey?.pages && currentSurvey.pages.length > 0 
      ? [...currentSurvey.pages] 
      : [{ id: 'p1', name: 'Page 1', title: 'Page 1', questions: [] as Question[] }];
      
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

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-5 h-full overflow-y-auto">
      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-5">
        QUESTION TYPES
      </h3>
      <div className="space-y-3">
        {questionTypes.map((q) => (
          <div
            key={q.type}
            draggable
            onDragStart={(e) => handleDragStart(e, q.type)}
            onClick={() => handleClick(q.type)}
            className="flex items-center p-3.5 bg-white border border-gray-900 rounded-xl cursor-pointer active:scale-95 hover:bg-gray-50 hover:shadow-sm transition-all transform hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5 text-gray-900 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={q.icon} />
            </svg>
            <span className="text-sm font-medium text-gray-900 tracking-wide">{q.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
