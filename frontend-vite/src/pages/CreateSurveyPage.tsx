import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSurveyStore } from '@/stores/surveyStore';
import { useUIStore } from '@/stores/uiStore';
import { useWebSocket } from '@/services/websocket/useWebSocket';
import { ApiEndpoints } from '@/services/api/endpoints';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { Spinner } from '@/components/ui/Spinner';
import { validateProjectSetup } from '@/utils/validation';
import type { Survey, Choice } from '@/types/survey';

export const CreateSurveyPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentProject,
    setCurrentProject,
    businessOverview,
    setBusinessOverview,
    setError,
    isGenerating,
    setIsGenerating,
    setCurrentSurvey,
    setCurrentSurveyDocLink
  } = useSurveyStore();
  const { setIsLoading, addNotification } = useUIStore();

  // Form state
  const [formData, setFormData] = React.useState({
    projectName: currentProject?.projectName || '',
    companyName: currentProject?.companyName || '',
    industry: currentProject?.industry || 'technology',
    useCase: currentProject?.useCase || '',
    llmProvider: currentProject?.llmProvider || 'gpt',
    useWebSearch: false,
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isGeneratingUseCase, setIsGeneratingUseCase] = React.useState(false);
  const [localOverview, setLocalOverview] = React.useState(businessOverview || '');
  const [progressLog, setProgressLog] = React.useState<string[]>([]);
  const [requestId, setRequestId] = React.useState<string>('');
  const [showOverview, setShowOverview] = React.useState(false);

  const [lastMessage, setLastMessage] = React.useState<any>(null);

  // WebSocket integration
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

  // Polling fallback
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
        
        const consolidatedPages = [{
          id: 'page1',
          name: 'page1',
          title: 'Survey Questions',
          questions: allQuestions,
        }];
        
        const survey: Survey = {
          id: requestId,
          title: formData.projectName || 'Draft Survey',
          description: localOverview || 'Survey Description',
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

  const generateUseCase = async () => {
    if (!formData.projectName || !formData.companyName) {
      addNotification({
        type: 'error',
        title: 'Missing Information',
        message: 'Please provide Project Name and Company Name first.',
      });
      return;
    }

    setIsGeneratingUseCase(true);
    try {
      let token = '';
      const authStore = localStorage.getItem('auth-store');
      if (authStore) {
        const parsed = JSON.parse(authStore);
        token = parsed.state?.tokens?.access_token || '';
      }
      
      if (!token) {
        const authTokens = localStorage.getItem('auth-tokens');
        if (authTokens) {
          const parsed = JSON.parse(authTokens);
          token = parsed.access_token || '';
        }
      }

      const response = await fetch('http://localhost:8000/api/v1/surveys/generate-use-case', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_name: formData.projectName,
          company_name: formData.companyName,
          industry: formData.industry,
          existing_use_case: formData.useCase || '',
          llm_model: formData.llmProvider || 'gpt',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate use case');
      }

      const data = await response.json();
      setFormData((prev) => ({ ...prev, useCase: data.use_case }));
      
      addNotification({
        type: 'success',
        title: 'Use Case Generated',
        message: 'AI has generated a use case description for your project.',
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Generation Failed',
        message: error.message || 'Failed to generate use case. Please try again.',
      });
    } finally {
      setIsGeneratingUseCase(false);
    }
  };

  const generateOverview = async () => {
    if (!formData.projectName || !formData.companyName) {
      addNotification({
        type: 'error',
        title: 'Missing Information',
        message: 'Please provide Project Name and Company Name first.',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await ApiEndpoints.generateBusinessOverview({
        request_id: Math.random().toString(36).substring(7),
        project_name: formData.projectName,
        company_name: formData.companyName,
        industry: formData.industry,
        use_case: formData.useCase,
        llm_model: formData.llmProvider || 'gpt',
      });
      
      const newOverview = response.business_overview;
      setLocalOverview(newOverview);
      setBusinessOverview(newOverview);
      setShowOverview(true);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined as any }));
    }
  };

  const startSurveyGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateProjectSetup(formData);
    
    if (validationErrors.length > 0) {
      const newErrors: Record<string, string> = {};
      validationErrors.forEach((err) => {
        if (err.field) {
          newErrors[err.field] = err.message;
        }
      });
      setErrors(newErrors);
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please check the form for errors.',
      });
      return;
    }
    
    setCurrentProject(formData);
    setBusinessOverview(localOverview);
    setIsGenerating(true);
    setProgressLog(['Starting API request...']);
    const newReqId = `req-${Date.now()}`;
    setRequestId(newReqId);

    try {
      await ApiEndpoints.generateSurvey({
        request_id: newReqId,
        project_name: formData.projectName,
        company_name: formData.companyName,
        industry: formData.industry,
        use_case: formData.useCase,
        business_overview: localOverview,
        research_objectives: 'Generate standard research objectives.',
        llm_model: formData.llmProvider || 'gpt',
        use_web_search: formData.useWebSearch
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

  if (isGenerating || progressLog.length > 0) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900">Generating Survey</h3>
            <p className="mt-1 text-sm text-gray-500">
              Please wait while we generate your survey...
            </p>
          </div>

          <div className="px-4 py-5 sm:p-6">
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
                  Continue to Survey Editor
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900">Create New Survey</h3>
          <p className="mt-1 text-sm text-gray-500">
            Fill in the details below to generate your survey with AI
          </p>
        </div>

        <form onSubmit={startSurveyGeneration} className="px-4 py-5 sm:p-6">
          <div className="space-y-6">
            {/* Project Details Section */}
            <div className="space-y-6">
              <FormField label="Project Name" error={errors.projectName}>
                <Input
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleChange}
                  placeholder="e.g. Employee Satisfaction 2024"
                  disabled={isGenerating}
                />
              </FormField>

              <FormField label="Company Name" error={errors.companyName}>
                <Input
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="e.g. Acme Corp"
                  disabled={isGenerating}
                />
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Industry" error={errors.industry}>
                  <Select
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    disabled={isGenerating}
                    options={[
                      { value: 'technology', label: 'Technology' },
                      { value: 'healthcare', label: 'Healthcare' },
                      { value: 'finance', label: 'Finance & Banking' },
                      { value: 'education', label: 'Education' },
                      { value: 'retail', label: 'Retail & E-commerce' },
                      { value: 'manufacturing', label: 'Manufacturing' },
                      { value: 'hospitality', label: 'Hospitality & Tourism' },
                      { value: 'real-estate', label: 'Real Estate' },
                      { value: 'automotive', label: 'Automotive' },
                      { value: 'telecommunications', label: 'Telecommunications' },
                      { value: 'media', label: 'Media & Entertainment' },
                      { value: 'energy', label: 'Energy & Utilities' },
                      { value: 'transportation', label: 'Transportation & Logistics' },
                      { value: 'agriculture', label: 'Agriculture' },
                      { value: 'construction', label: 'Construction' },
                      { value: 'pharmaceutical', label: 'Pharmaceutical' },
                      { value: 'insurance', label: 'Insurance' },
                      { value: 'legal', label: 'Legal Services' },
                      { value: 'consulting', label: 'Consulting' },
                      { value: 'non-profit', label: 'Non-Profit' },
                      { value: 'government', label: 'Government' },
                      { value: 'other', label: 'Other' },
                    ]}
                  />
                </FormField>

                <FormField label="AI Provider" error={errors.llmProvider}>
                  <Select
                    name="llmProvider"
                    value={formData.llmProvider}
                    onChange={handleChange}
                    disabled={isGenerating}
                    options={[
                      { value: 'gpt', label: 'OpenAI GPT' },
                      { value: 'gemini', label: 'Google Gemini' },
                    ]}
                  />
                </FormField>
              </div>

              <FormField label="Use Case" error={errors.useCase}>
                <div className="space-y-2">
                  <Textarea
                    name="useCase"
                    value={formData.useCase}
                    onChange={handleChange}
                    placeholder="Describe what you want to achieve with this survey..."
                    rows={5}
                    disabled={isGenerating}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateUseCase}
                    disabled={isGeneratingUseCase || !formData.projectName || !formData.companyName || isGenerating}
                  >
                    {isGeneratingUseCase ? 'Generating...' : '✨ Generate Use Case with AI'}
                  </Button>
                </div>
              </FormField>
              
              <div className="flex items-center space-x-3 pt-2">
                <input
                  type="checkbox"
                  id="useWebSearch"
                  name="useWebSearch"
                  checked={formData.useWebSearch}
                  onChange={(e) => setFormData(prev => ({ ...prev, useWebSearch: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={isGenerating}
                />
                <label htmlFor="useWebSearch" className="text-sm font-medium text-gray-700">
                  Enable Web Search Intelligence (Fetches latest industry trends via DuckDuckGo)
                </label>
              </div>
            </div>

            {/* Business Overview Section - Collapsible */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">Business Overview</h4>
                  <p className="text-sm text-gray-500">Optional: Provide additional context about your business</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOverview(!showOverview)}
                  disabled={isGenerating}
                >
                  {showOverview ? 'Hide' : 'Show'} Overview
                </Button>
              </div>

              {showOverview && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={generateOverview}
                      variant="secondary"
                      size="sm"
                      disabled={isGenerating || !formData.projectName || !formData.companyName}
                    >
                      Generate Automatically via AI
                    </Button>
                  </div>
                  
                  <textarea
                    className="w-full h-48 p-4 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={localOverview}
                    onChange={(e) => setLocalOverview(e.target.value)}
                    placeholder="Generate an overview or write your own contextual business details here..."
                    disabled={isGenerating}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => navigate('/')} disabled={isGenerating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isGenerating}>
              Generate Survey
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
