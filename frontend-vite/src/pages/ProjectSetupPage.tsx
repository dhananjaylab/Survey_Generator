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
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

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
                  { value: 'finance', label: 'Finance' },
                  { value: 'education', label: 'Education' },
                  { value: 'retail', label: 'Retail' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </FormField>

            <FormField label="Use Case" error={errors.useCase}>
              <Textarea
                name="useCase"
                value={formData.useCase}
                onChange={handleChange}
                placeholder="Briefly describe what you want to achieve with this survey..."
                rows={4}
              />
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
