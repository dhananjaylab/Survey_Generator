// frontend/src/stores/wizardStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FormData {
  projectName: string;
  companyName: string;
  industry: string;
  useCase: string;
  businessOverview: string;
  researchObjectives: string;
}

interface SurveyResult {
  surveyId: string;
  questions: any[];
  documentUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface WizardStore {
  currentStep: number;
  formData: FormData;
  surveyResult: SurveyResult | null;
  
  // Actions
  setCurrentStep: (step: number) => void;
  updateFormData: (data: Partial<FormData>) => void;
  setSurveyResult: (result: SurveyResult) => void;
  resetWizard: () => void;
}

const initialFormData: FormData = {
  projectName: '',
  companyName: '',
  industry: '',
  useCase: '',
  businessOverview: '',
  researchObjectives: '',
};

export const useWizardStore = create<WizardStore>()(
  persist(
    (set) => ({
      currentStep: 1,
      formData: initialFormData,
      surveyResult: null,

      setCurrentStep: (step) => set({ currentStep: step }),

      updateFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),

      setSurveyResult: (result) => set({ surveyResult: result }),

      resetWizard: () =>
        set({
          currentStep: 1,
          formData: initialFormData,
          surveyResult: null,
        }),
    }),
    {
      name: 'survey-wizard-storage',
      partialize: (state) => ({
        formData: state.formData,
        currentStep: state.currentStep,
      }),
    }
  )
);
