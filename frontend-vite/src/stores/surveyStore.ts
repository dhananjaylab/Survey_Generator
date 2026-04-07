import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SurveyState } from '@/types/store';
import type { Survey, ProjectSetupData } from '@/types/survey';

interface SurveyStore extends SurveyState {
  setCurrentProject: (project: ProjectSetupData | null) => void;
  setBusinessOverview: (overview: string | null) => void;
  setResearchObjectives: (objectives: string | null) => void;
  setCurrentSurvey: (survey: Survey | null) => void;
  setCurrentSurveyDocLink: (docLink: string | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: SurveyState = {
  currentProject: null,
  businessOverview: null,
  researchObjectives: null,
  currentSurvey: null,
  currentSurveyDocLink: null,
  isGenerating: false,
  error: null,
};

export const useSurveyStore = create<SurveyStore>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentProject: (currentProject) => set({ currentProject }),
      setBusinessOverview: (businessOverview) => set({ businessOverview }),
      setResearchObjectives: (researchObjectives) => set({ researchObjectives }),
      setCurrentSurvey: (currentSurvey) => set({ currentSurvey }),
      setCurrentSurveyDocLink: (currentSurveyDocLink) => set({ currentSurveyDocLink }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setError: (error) => set({ error }),
      reset: () => set(initialState),
    }),
    {
      name: 'survey-store',
      partialize: (state) => ({
        currentProject: state.currentProject,
        businessOverview: state.businessOverview,
        researchObjectives: state.researchObjectives,
        currentSurvey: state.currentSurvey,
        currentSurveyDocLink: state.currentSurveyDocLink,
      }), // Don't persist isGenerating or error
    }
  )
);
