import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSurveyStore } from '@/stores/surveyStore';
import { useUIStore } from '@/stores/uiStore';
import { useWebSocket } from '@/services/websocket/useWebSocket';
import { ApiEndpoints } from '@/services/api/endpoints';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { Survey, Choice } from '@/types/survey';

export const GeneratePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentProject, businessOverview, isGenerating, setIsGenerating, setError, setCurrentSurvey, setCurrentSurveyDocLink } = useSurveyStore();
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
        // Fetch the generated survey data
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
        
        // Update progress log based on status
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
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [isGenerating, requestId]);

  const fetchGeneratedSurvey = async () => {
    if (!requestId) return;
    
    try {
      const response = await ApiEndpoints.getSurveyStatus(requestId);
      console.log('📊 Survey Status Response:', response);
      console.log('📊 Response pages:', response.pages);
      console.log('📊 Is pages an array?', Array.isArray(response.pages));
      
      if (response.status === 'COMPLETED' && response.pages) {
        // Backend creates one page per question, but frontend expects all questions in one page
        // So we need to consolidate all elements from all pages into a single page
        const pages = Array.isArray(response.pages) ? response.pages : [];
        console.log('📊 Processing', pages.length, 'backend pages (one per question)');
        
        // Collect all questions from all pages
        const allQuestions: any[] = [];
        pages.forEach((page: any, pageIndex: number) => {
          const elements = page.elements || [];
          console.log(`📊 Page ${pageIndex} has ${elements.length} elements`);
          
          elements.forEach((element: any, elemIndex: number) => {
            console.log(`📊 Element ${elemIndex}:`, element);
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
        
        console.log('📊 Total questions collected:', allQuestions.length);
        
        // Create a single page with all questions
        const consolidatedPages = [{
          id: 'page1',
          name: 'page1',
          title: 'Survey Questions',
          questions: allQuestions,
        }];
        
        console.log('📊 Consolidated into 1 page with', allQuestions.length, 'questions');
        
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
        
        console.log('📊 Final survey object:', survey);
        setCurrentSurvey(survey);
        
        // Store the doc_link for downloading
        if (response.doc_link) {
          console.log('📊 Storing doc_link:', response.doc_link);
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
      console.error('❌ Failed to fetch survey:', error);
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

  const startGeneration = async () => {
    if (!currentProject || !businessOverview) return;
    
    setIsGenerating(true);
    setProgressLog(['Starting API request...']);
    const newReqId = `req-${Date.now()}`;
    setRequestId(newReqId);

    try {
      // Trigger the generation pipeline with snake_case field names
      await ApiEndpoints.generateSurvey({
        request_id: newReqId,
        project_name: currentProject.projectName,
        company_name: currentProject.companyName,
        industry: currentProject.industry,
        use_case: currentProject.useCase,
        business_overview: businessOverview,
        research_objectives: 'Generate standard research objectives.',
        llm_model: currentProject.llmProvider || 'gpt' // Use selected provider
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
