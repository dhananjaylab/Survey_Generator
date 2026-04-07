import * as React from 'react';


export const QuestionPalette: React.FC = () => {
  const questionTypes = [
    { type: 'multiple-choice', label: 'Multiple Choice', icon: 'M4 6h16M4 12h16M4 18h16' },
    { type: 'text', label: 'Text Input', icon: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' },
    { type: 'matrix', label: 'Matrix Table', icon: 'M4 6h16M4 12h16M4 18h16' }, // placeholder
    { type: 'video', label: 'Video Question', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4z' },
  ];

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('questionType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 h-full overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
        Question Palette
      </h3>
      <div className="space-y-3">
        {questionTypes.map((q) => (
          <div
            key={q.type}
            draggable
            onDragStart={(e) => handleDragStart(e, q.type)}
            className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-md cursor-grab active:cursor-grabbing hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={q.icon} />
            </svg>
            <span className="text-sm font-medium text-gray-700">{q.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
