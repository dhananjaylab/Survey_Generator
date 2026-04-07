import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSurveyStore } from '@/stores/surveyStore';
import { useUIStore } from '@/stores/uiStore';
import { useWebSocket } from '@/services/websocket/useWebSocket';
import { ApiEndpoints } from '@/services/api/endpoints';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { Survey, Choice } from '@/types/survey';

export const ResearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentProject, 
    businessOverview, 
    setBusinessOverview, 
    setError,
    isGenerating,
    setIsGenerating,
    setCurrentSurvey,
    setCurrentSurveyDocLink
  } = useSurveyStore();
  const { setIsLoading, addNotification } = useUIStore();
  
  const [localOverview, setLocalOverview] = React.useState(businessOverview || '');
  const [progressLog, setProgressLog] = React.useState<string[]>([]);
  const [requestId, setRequestId] = React.useState<string>('');

  React.useEffect(() => {
    if (!currentProject) {
      navigate('/project-setup');
    }
  }, [currentProject, navigate]);

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
        fetchGeneratedSurvey();
      }
    }
  }, [lastMessage, setIsGenerating, addNotification]);

  // Fallback: Poll for survey status if WebSocket is not connected
  React.useEffect(() => {
    if (!isGenerating || !requestId) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await ApiEndpoints.getSurveyStatus(requestId);
        
        if (response.status === 'COMPLETED') {
          clearInterval(pollInterval);
          setIsGenerating(false);
          setProgressLog(prev => [...prev, 'SUCCESS']);
          addNotification({
            type: 'success',
            title: 'Generation Complete',
            message: 'Your survey has been successfully generated.',
          });
          fetchGeneratedSurvey();
        } else if (response.status === 'FAILED') {
          clearInterval(pollInterval);
          setIsGenerating(false);
          setProgressLog(prev => [...prev, 'ERROR: Survey generation failed']);
          addNotification({
            type: 'error',
            title: 'Generation Failed',
            message: 'Survey generation encountered an error.',
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [isGenerating, requestId]);

  const fetchGeneratedSurvey = async () => {
    if (!requestId) return;
    
    try {
      const response = await ApiEndpoints.getSurveyStatus(requestId);
      
      if (response.status === 'COMPLETED' && response.pages) {
        const pages = Array.isArray(response.pages) ? response.pages : [];
        
        // Collect all questions from all pages
        const allQuestions: any[] = [];
        pages.forEach((page: any) => {
          const elements = page.elements || [];
          
          elements.forEach((element: any, elemIndex: number) => {
            allQuestions.push({
              id: element.surveyQID || element.name || `q-${Date.now()}-${elemIndex}`,
              type: mapQuestionType(element.type),
              title: stripHtmlTags(element.title || ''),
              description: element.description || '',
              required: element.isRequired || false,
              choices: mapChoices(element),
            });
          });
        });
        
        // Create a single page with all questions
        const consolidatedPages = [{
          id: 'page1',
          name: 'page1',
          title: 'Survey Questions',
          questions: allQuestions,
        }];
        
        const survey: Survey = {
          id: requestId,
          title: currentProject?.projectName || 'Draft Survey',
          description: businessOverview || 'Survey Description',
          pages: consolidatedPages,
          settings: {
            showProgressBar: true,
            showQuestionNumbers: true,
            allowBack: true,
            completeText: 'Submit Survey',
          },
        };
        
        setCurrentSurvey(survey);
        
        if (response.doc_link) {
          setCurrentSurveyDocLink(response.doc_link);
        }
        
        const totalQuestions = survey.pages.reduce((acc, p) => acc + p.questions.length, 0);
        addNotification({
          type: 'success',
          title: 'Survey Loaded',
          message: `${totalQuestions} questions loaded successfully.`,
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch survey:', error);
      addNotification({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load generated survey data.',
      });
    }
  };

  const mapQuestionType = (backendType: string): 'multiple-choice' | 'text' | 'matrix' | 'video' => {
    switch (backendType) {
      case 'radiogroup':
      case 'checkbox':
        return 'multiple-choice';
      case 'comment':
        return 'text';
      case 'matrix':
        return 'matrix';
      case 'videofeedback':
        return 'video';
      default:
        return 'text';
    }
  };

  const stripHtmlTags = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const mapChoices = (element: any): Choice[] => {
    if (element.choices && Array.isArray(element.choices)) {
      return element.choices.map((choice: any, index: number) => ({
        id: `choice-${index}`,
        text: stripHtmlTags(choice.text || choice.value || choice),
        value: choice.value || choice.text || choice,
      }));
    }
    return [];
  };

  const generateOverview = async () => {
    if (!currentProject) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await ApiEndpoints.generateBusinessOverview({
        request_id: Math.random().toString(36).substring(7),
        project_name: currentProject.projectName,
        company_name: currentProject.companyName,
        industry: currentProject.industry,
        use_case: currentProject.useCase,
        llm_model: currentProject.llmProvider || 'gpt',
      });
      
      const newOverview = response.business_overview;
      setLocalOverview(newOverview);
      setBusinessOverview(newOverview);
      addNotification({
        type: 'success',
        title: 'Overview Generated',
        message: 'Successfully generated business overview.',
      });
    } catch (err: any) {
      setError(err.detail || 'Failed to generate overview');
      addNotification({
        type: 'error',
        title: 'Generation Failed',
        message: err.detail || 'There was an error communicating with the API.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startSurveyGeneration = async () => {
    if (!currentProject || !localOverview.trim()) {
      addNotification({
        type: 'error',
        title: 'Required',
        message: 'Business overview is required to continue. Please generate or write one.',
      });
      return;
    }
    
    setBusinessOverview(localOverview);
    setIsGenerating(true);
    setProgressLog(['Starting API request...']);
    const newReqId = `req-${Date.now()}`;
    setRequestId(newReqId);

    try {
      await ApiEndpoints.generateSurvey({
        request_id: newReqId,
        project_name: currentProject.projectName,
        company_name: currentProject.companyName,
        industry: currentProject.industry,
        use_case: currentProject.useCase,
        business_overview: localOverview,
        research_objectives: 'Generate standard research objectives.',
        llm_model: currentProject.llmProvider || 'gpt'
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

  if (!currentProject) return null;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white shadow sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6 flex justify-between items-center bg-gray-50 border-b border-gray-200">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Research Configuration</h3>
            <p className="mt-1 text-sm text-gray-500">
              Project: {currentProject.projectName} | Company: {currentProject.companyName}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/project-setup')}>
            Edit Project
          </Button>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-6 flex justify-between items-center">
            <h4 className="text-md font-medium text-gray-900">Business Overview</h4>
            <Button onClick={generateOverview} variant="secondary" size="sm" disabled={isGenerating}>
              Generate Automatically via AI
            </Button>
          </div>
          
          <textarea
            className="w-full h-64 p-4 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={localOverview}
            onChange={(e) => setLocalOverview(e.target.value)}
            placeholder="Generate an overview or write your own contextual business details here..."
            disabled={isGenerating}
          />
        </div>
        
        {!isGenerating && progressLog.length === 0 && (
          <div className="px-4 py-4 sm:px-6 border-t border-gray-200 flex justify-end gap-4">
            <Button onClick={startSurveyGeneration} disabled={!localOverview.trim()}>
              Generate Survey
            </Button>
          </div>
        )}

        {(isGenerating || progressLog.length > 0) && (
          <div className="px-4 py-5 sm:p-6 border-t border-gray-200">
            <h4 className="text-md font-medium text-gray-900 mb-4">Survey Generation Progress</h4>
            <div className="bg-gray-900 rounded-lg p-6 text-left max-h-96 overflow-y-auto font-mono text-sm shadow-inner relative">
              {isGenerating && (
                <div className="absolute top-4 right-4 flex items-center space-x-2 text-green-400">
                  <Spinner size="sm" className="text-green-400" />
                  <span>Processing</span>
                </div>
              )}
              
              {!isConnected && isGenerating && (
                <p className="text-yellow-400 opacity-80 mb-2">WebSocket not connected. Using polling fallback...</p>
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

            {!isGenerating && progressLog.length > 0 && (
              <div className="mt-6 flex justify-end">
                <Button size="lg" onClick={() => navigate('/builder')}>
                  Continue to Survey Builder
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
