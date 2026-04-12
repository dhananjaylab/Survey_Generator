import * as React from 'react';
import { useSurveyStore } from '@/stores/surveyStore';
import { ApiEndpoints } from '@/services/api/endpoints';
import { 
  ClockIcon, 
  ArrowUpIcon, 
  PaperAirplaneIcon,
  BoltIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export const TriggersPanel: React.FC = () => {
  const { currentSurvey, setCurrentSurvey } = useSurveyStore();
  const [syncStatus, setSyncStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [newPath, setNewPath] = React.useState('');
  
  if (!currentSurvey) return null;

  // Initialize triggers if they don't exist
  const triggers = currentSurvey.settings?.triggers || {
    timeOnPage: { enabled: false, seconds: 5 },
    scrollDepth: { enabled: false, percent: 50 },
    exitIntent: { enabled: false },
    targeting: { paths: ['/checkout', '/pricing'] }
  };

  const syncSettings = async (updatedSettings: any) => {
    setSyncStatus('saving');
    try {
      await ApiEndpoints.updateSurveySettings(currentSurvey.id, updatedSettings);
      setSyncStatus('saved');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      console.error('Settings sync failed:', error);
      setSyncStatus('error');
    }
  };

  const updateTriggers = (updates: any) => {
    const newSettings = {
      ...currentSurvey.settings,
      triggers: { ...triggers, ...updates }
    };
    
    setCurrentSurvey({
      ...currentSurvey,
      settings: newSettings
    });

    // Immediate sync
    syncSettings(newSettings);
  };

  const addPath = () => {
    if (!newPath || triggers.targeting.paths.includes(newPath)) return;
    const updatedPaths = [...triggers.targeting.paths, newPath];
    updateTriggers({ targeting: { ...triggers.targeting, paths: updatedPaths } });
    setNewPath('');
  };

  const removePath = (pathToRemove: string) => {
    const updatedPaths = triggers.targeting.paths.filter((p: string) => p !== pathToRemove);
    updateTriggers({ targeting: { ...triggers.targeting, paths: updatedPaths } });
  };

  const TriggerCard = ({ 
    id, 
    icon: Icon, 
    title, 
    description, 
    enabled, 
    onToggle, 
    children 
  }: any) => (
    <div className={`p-4 border rounded-xl transition-all ${enabled ? 'border-gray-900 bg-white ring-1 ring-gray-900' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`${enabled ? 'text-blue-600' : 'text-gray-400'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className={`text-sm font-bold tracking-tight ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>
            {title}
          </span>
        </div>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
        />
      </div>
      {enabled && children && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
      {!enabled && description && (
        <p className="text-xs text-gray-400 leading-relaxed mt-1">{description}</p>
      )}
    </div>
  );

  return (
    <div className="p-6 h-full flex flex-col space-y-8 bg-white relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-gray-900">
          <BoltIcon className="w-5 h-5 text-yellow-500" />
          <h3 className="text-xs font-black uppercase tracking-[0.2em]">
            Behavioral Triggers
          </h3>
        </div>
        
        {/* Sync Status Indicator */}
        <div className="flex items-center text-[10px] uppercase font-bold tracking-widest">
          {syncStatus === 'saving' && (
            <span className="text-blue-500 flex items-center">
              <ArrowPathIcon className="w-3 h-3 mr-1 animate-spin" /> Saving...
            </span>
          )}
          {syncStatus === 'saved' && (
            <span className="text-green-600 flex items-center">
              <CheckCircleIcon className="w-3 h-3 mr-1" /> Saved
            </span>
          )}
          {syncStatus === 'error' && (
            <span className="text-red-500 flex items-center">
              <XMarkIcon className="w-3 h-3 mr-1" /> Sync failed
            </span>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        <TriggerCard
          id="timeOnPage"
          icon={ClockIcon}
          title="Time on Page"
          enabled={triggers.timeOnPage?.enabled}
          onToggle={(val: boolean) => updateTriggers({ timeOnPage: { ...triggers.timeOnPage, enabled: val } })}
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <input
                type="number"
                value={triggers.timeOnPage?.seconds || 5}
                onChange={(e) => updateTriggers({ timeOnPage: { ...triggers.timeOnPage, seconds: parseInt(e.target.value) || 0 } })}
                className="w-20 p-2 text-sm font-bold border border-gray-900 rounded-lg outline-none text-center bg-white shadow-sm"
              />
            </div>
            <span className="text-xs font-semibold text-gray-400">seconds</span>
          </div>
        </TriggerCard>

        <TriggerCard
          id="scrollDepth"
          icon={ArrowUpIcon}
          title="Scroll Depth"
          enabled={triggers.scrollDepth?.enabled}
          onToggle={(val: boolean) => updateTriggers({ scrollDepth: { ...triggers.scrollDepth, enabled: val } })}
        >
          <div className="flex items-center space-x-3">
            <input
              type="number"
              value={triggers.scrollDepth?.percent || 50}
              onChange={(e) => updateTriggers({ scrollDepth: { ...triggers.scrollDepth, percent: parseInt(e.target.value) || 0 } })}
              className="w-20 p-2 text-sm font-bold border border-gray-900 rounded-lg outline-none text-center bg-white shadow-sm"
            />
            <span className="text-xs font-semibold text-gray-400">% of page</span>
          </div>
        </TriggerCard>

        <TriggerCard
          id="exitIntent"
          icon={PaperAirplaneIcon}
          title="Exit Intent"
          description="Trigger when user moves mouse to close the tab."
          enabled={triggers.exitIntent?.enabled}
          onToggle={(val: boolean) => updateTriggers({ exitIntent: { enabled: val } })}
        />
      </div>

      <div className="pt-4 border-t border-gray-100 mt-2">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Targeting Paths</h4>
        
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {triggers.targeting.paths.map((path: string) => (
              <div key={path} className="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 text-xs font-bold">
                {path}
                <button 
                  onClick={() => removePath(path)}
                  className="ml-2 hover:text-red-500 transition-colors"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="relative mt-2">
            <input
              type="text"
              placeholder="Add path (e.g. /checkout)"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPath()}
              className="w-full pl-4 pr-10 py-2.5 text-xs font-bold border border-gray-200 rounded-xl outline-none focus:border-gray-900 bg-gray-50 transition-all"
            />
            <button
              onClick={addPath}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
            >
              <PlusIcon className="w-3 h-3" />
            </button>
          </div>
          
          <p className="text-[10px] text-gray-400 font-medium leading-relaxed uppercase tracking-tighter">
            Note: Path targeting will trigger whenever the URL matches these exact values or starts with them.
          </p>
        </div>
      </div>
    </div>
  );
};
