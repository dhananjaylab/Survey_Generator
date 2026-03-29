// frontend/src/hooks/useSurveyGeneration.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { useWizardStore } from '@/stores/wizardStore';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface GenerationOptions {
  enableWebSocket?: boolean;
  pollingInterval?: number;
}

export function useSurveyGeneration(options: GenerationOptions = {}) {
  const { enableWebSocket = true, pollingInterval = 2000 } = options;
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const { setSurveyResult } = useWizardStore();
  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection for real-time updates
  const connectWebSocket = useCallback((surveyId: string) => {
    if (!enableWebSocket) return;

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/ws/survey/${surveyId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress') {
          setProgress(data.progress);
        } else if (data.type === 'completed') {
          setProgress(100);
          setIsGenerating(false);
          setSurveyResult(data.result);
          toast.success('Survey generated successfully!');
          ws.close();
        } else if (data.type === 'error') {
          setError(data.message);
          setIsGenerating(false);
          toast.error('Survey generation failed');
          ws.close();
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      // Fallback to polling
      startPolling(surveyId);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    wsRef.current = ws;
  }, [enableWebSocket, setSurveyResult]);

  // Polling fallback for progress updates
  const startPolling = useCallback((surveyId: string) => {
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await apiClient.get(`/surveys/${surveyId}/status`);
        const { status, progress: currentProgress, result } = response.data;

        setProgress(currentProgress);

        if (status === 'completed') {
          setIsGenerating(false);
          setSurveyResult(result);
          toast.success('Survey generated successfully!');
          
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
        } else if (status === 'failed') {
          setIsGenerating(false);
          setError('Survey generation failed');
          toast.error('Survey generation failed');
          
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, pollingInterval);
  }, [pollingInterval, setSurveyResult]);

  // Main generation function
  const generateSurvey = useCallback(async (formData: any) => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      // Start generation
      const response = await apiClient.post('/surveys/generate', {
        project_name: formData.projectName,
        company_name: formData.companyName,
        industry: formData.industry,
        use_case: formData.useCase,
        business_overview: formData.businessOverview,
        research_objectives: formData.researchObjectives,
      });

      const { survey_id } = response.data;

      // Connect to WebSocket or start polling
      if (enableWebSocket) {
        connectWebSocket(survey_id);
      } else {
        startPolling(survey_id);
      }

      toast.info('Survey generation started');
    } catch (err: any) {
      setIsGenerating(false);
      const errorMessage = err.response?.data?.message || 'Failed to start survey generation';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }, [connectWebSocket, enableWebSocket, startPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return {
    generateSurvey,
    isGenerating,
    progress,
    error,
  };
}
