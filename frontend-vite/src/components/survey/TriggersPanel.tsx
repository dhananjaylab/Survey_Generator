import * as React from 'react';
import { useSurveyStore } from '@/stores/surveyStore';

export const TriggersPanel: React.FC = () => {
  const { currentSurvey, setCurrentSurvey } = useSurveyStore();
  
  if (!currentSurvey) return null;

  const triggers = currentSurvey.settings?.triggers || {};

  const updateTriggers = (updates: any) => {
    setCurrentSurvey({
      ...currentSurvey,
      settings: {
        ...currentSurvey.settings,
        triggers: { ...triggers, ...updates }
      }
    });
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 h-full overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">
        Behavioral Triggers
      </h3>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">When should this survey appear?</label>
          <select
            value={triggers.triggerType || 'onLoad'}
            onChange={(e) => updateTriggers({ triggerType: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border outline-none bg-white"
          >
            <option value="onLoad">Immediately on page load</option>
            <option value="timeDelay">After a time delay</option>
            <option value="scrollDepth">On scrolling down</option>
            <option value="exitIntent">On exit intent (mouse leaves page)</option>
          </select>
        </div>

        {triggers.triggerType === 'timeDelay' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Delay Time (Seconds)</label>
            <input
              type="number"
              min="1"
              value={triggers.timeDelaySeconds || 5}
              onChange={(e) => updateTriggers({ timeDelaySeconds: parseInt(e.target.value) || 5 })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border outline-none"
            />
          </div>
        )}

        {triggers.triggerType === 'scrollDepth' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Scroll Depth (%)</label>
            <input
              type="number"
              min="10"
              max="100"
              step="10"
              value={triggers.scrollDepthPercent || 50}
              onChange={(e) => updateTriggers({ scrollDepthPercent: parseInt(e.target.value) || 50 })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border outline-none"
            />
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Note: Triggers dictate how the conversational popup behaves when embedded on an external website. It does not affect standalone links.
          </p>
        </div>
      </div>
    </div>
  );
};
