import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSurveyStore } from '@/stores/surveyStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { validateProjectSetup } from '@/utils/validation';

export const ProjectSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentProject, setCurrentProject } = useSurveyStore();
  const { addNotification } = useUIStore();

  const [formData, setFormData] = React.useState({
    projectName: currentProject?.projectName || '',
    companyName: currentProject?.companyName || '',
    industry: currentProject?.industry || 'technology',
    useCase: currentProject?.useCase || '',
    llmProvider: currentProject?.llmProvider || 'gpt',
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isGeneratingUseCase, setIsGeneratingUseCase] = React.useState(false);

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
      // Get token from storage
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined as any }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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
    navigate('/research');
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Project Setup
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 mb-6">
            Provide the details for your new survey project.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField label="Project Name" error={errors.projectName}>
              <Input
                name="projectName"
                value={formData.projectName}
                onChange={handleChange}
                placeholder="e.g. Employee Satisfaction 2024"
              />
            </FormField>

            <FormField label="Company Name" error={errors.companyName}>
              <Input
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="e.g. Acme Corp"
              />
            </FormField>

            <FormField label="Industry" error={errors.industry}>
              <Select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
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

            <FormField label="Use Case" error={errors.useCase}>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Textarea
                    name="useCase"
                    value={formData.useCase}
                    onChange={handleChange}
                    placeholder="Briefly describe what you want to achieve with this survey..."
                    rows={4}
                    className="flex-1"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateUseCase}
                  disabled={isGeneratingUseCase || !formData.projectName || !formData.companyName}
                >
                  {isGeneratingUseCase ? 'Generating...' : '✨ Generate Use Case with AI'}
                </Button>
                {!formData.projectName || !formData.companyName ? (
                  <p className="text-xs text-gray-500">
                    Please fill in Project Name and Company Name first
                  </p>
                ) : null}
              </div>
            </FormField>

            <FormField label="AI Provider" error={errors.llmProvider}>
              <Select
                name="llmProvider"
                value={formData.llmProvider}
                onChange={handleChange}
                options={[
                  { value: 'gpt', label: 'OpenAI GPT' },
                  { value: 'gemini', label: 'Google Gemini' },
                ]}
              />
              <p className="mt-1 text-sm text-gray-500">
                Select the AI model to use for generating your survey
              </p>
            </FormField>

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit">
                Continue to Research
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
