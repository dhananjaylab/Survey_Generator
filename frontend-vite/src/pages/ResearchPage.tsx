import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSurveyStore } from '@/stores/surveyStore';
import { useUIStore } from '@/stores/uiStore';
import { ApiEndpoints } from '@/services/api/endpoints';
import { Button } from '@/components/ui/Button';

export const ResearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentProject, businessOverview, setBusinessOverview, setError } = useSurveyStore();
  const { setIsLoading, addNotification } = useUIStore();
  
  const [localOverview, setLocalOverview] = React.useState(businessOverview || '');

  React.useEffect(() => {
    if (!currentProject) {
      navigate('/project-setup');
    }
  }, [currentProject, navigate]);

  const generateOverview = async () => {
    if (!currentProject) return;

    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call to generate business overview using currentProject
      const response = await ApiEndpoints.generateBusinessOverview({
        requestId: Math.random().toString(36).substring(7),
        ...currentProject,
        llmModel: 'gpt-4o', // default model
      });
      
      const newOverview = response.businessOverview;
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

  const handleContinue = () => {
    if (!localOverview.trim()) {
      addNotification({
        type: 'error',
        title: 'Required',
        message: 'Business overview is required to continue. Please generate or write one.',
      });
      return;
    }
    setBusinessOverview(localOverview);
    navigate('/generate');
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
            <Button onClick={generateOverview} variant="secondary" size="sm">
              Generate Automatically via AI
            </Button>
          </div>
          
          <textarea
            className="w-full h-64 p-4 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={localOverview}
            onChange={(e) => setLocalOverview(e.target.value)}
            placeholder="Generate an overview or write your own contextual business details here..."
          />
        </div>
        
        <div className="px-4 py-4 sm:px-6 border-t border-gray-200 flex justify-end gap-4">
          <Button onClick={handleContinue} disabled={!localOverview.trim()}>
            Continue to Survey Generation
          </Button>
        </div>
      </div>
    </div>
  );
};
