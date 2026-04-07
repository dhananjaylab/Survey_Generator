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

export const SetupPage: React.FC = () => {
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

  const [formData, setFormData] = React.useState({
    projectName: currentProject?.projectName || '',
    companyName: currentProject?.companyName || '',
    industry: currentProject?.industry || 'technology',
    useCase: currentProject?.useCase || '',
    llmProvider: currentProject?.llmProvider || 'gpt',
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isGeneratingUseCase, setIsGeneratingUseCase] = React.useState(false);
  const [localOverview, setLocalOverview] = React.useState(businessOverview || '');
  const [showResearchSection, setShowResearchSection] = React.useState(false);
  const [progressLog, setProgressLog] = React.useState<string[]>([]);
  const [requestId, setRequestId] = React.useState<string>('');

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
        console.err