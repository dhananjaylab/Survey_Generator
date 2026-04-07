import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSurveyStore } from '@/stores/surveyStore';
import { useUIStore } from '@/stores/uiStore';
import { useWebSocket } from '@/services/websocket/useWebSocket';
import { ApiEndpoints } from '@/services/api/endpoints';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export const GeneratePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentProject, businessOverview, isGenerating, setIsGenerating, setError } = useSurveyStore();
  const { addNotification } = useUIStore();
  const [progressLog, setProgressLog] = React.useState<string[]>([]);
  const [requestId, setRequestId] = React.useState<string>('');

  React.useEffect(() => {
    if (!currentProject || !businessOverview) {
      navigate('/research');
    }
  }, [currentProject, businessOverview, navigate]);

  const [lastMessage, setLastMessage] = React.useState<any>(null);

  // Hook into WebSocket
  const { isConnected, connect, disconnect } = useWebSocket({
    requestId,
    onMessage: (msg) => {
      setLastMessage(msg);
    }
  });

  React.useEffect(() => {
    if (requestId) {
      connect().catch(console.error);
    }
    return () => disconnect();
  }, [requestId, connect, disconnect]);

  React.useEffect(() => {
    if (lastMessage) {
      setProgressLog((prev) => [...prev, lastMessage.update]);
      if (lastMessage.completed) {
        setIsGenerating(false);
        addNotification({
          type: 'success',
          title: 'Generation Complete',
          message: 'Your survey has been successfully generated.',
        });
        // Can navigate to builder automatically or show a button
      }
    }
  }, [lastMessage, setIsGenerating, addNotification]);

  const startGeneration = async () => {
    if (!currentProject || !businessOverview) return;
    
    setIsGenerating(true);
    setProgressLog(['Starting API request...']);
    const newReqId = `req-${Date.now()}`;
    setRequestId(newReqId);

    try {
      // Mock triggering the generation pipeline
      await ApiEndpoints.generateSurvey({
        requestId: newReqId,
        projectName: currentProject.projectName,
        companyName: currentProject.companyName,
        industry: currentProject.industry,
        useCase: currentProject.useCase,
        businessOverview: businessOverview,
        researchObjectives: 'Generate standard research objectives.',
        llmModel: 'gpt-4o'
      });
      setProgressLog(prev => [...prev, 'Survey generation triggered successfully. Awaiting updates...']);
    } catch (err: any) {
      setIsGenerating(false);
      setError(err.detail || 'Generation failed');
      addNotification({
        type: 'error',
        title: 'Error',
        message: err.detail || 'Failed to start survey generation.'
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Survey Generation Pipeline</h3>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            We will now use the collected research to dynamically build your survey.
          </p>

          {!isGenerating && progressLog.length === 0 ? (
             <Button size="lg" onClick={startGeneration}>
               Start Survey Generation
             </Button>
          ) : (
            <div className="bg-gray-900 rounded-lg p-6 text-left max-h-96 overflow-y-auto font-mono text-sm shadow-inner relative">
              {isGenerating && (
                <div className="absolute top-4 right-4 flex items-center space-x-2 text-green-400">
                  <Spinner size="sm" className="text-green-400" />
                  <span>Processing</span>
                </div>
              )}
              
              {!isConnected && isGenerating && (
                <p className="text-red-400 opacity-80 mb-2">WebSocket not connected. Polling fallbacks not configured...</p>
              )}

              <div className="space-y-2">
                {progressLog.map((log, index) => (
                  <div key={index} className="text-green-400">
                    <span className="text-gray-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isGenerating && progressLog.length > 0 && (
            <div className="mt-8">
              <Button size="lg" onClick={() => navigate('/builder')}>
                Continue to Survey Builder
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
