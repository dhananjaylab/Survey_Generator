import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface WizardData {
  requestId: string
  projectName: string
  companyName: string
  industry: string
  useCase: string
  businessOverview: string
  researchObjectives: string
  surveyPages: any[]
  docLink: string
  generationStatus: string
  selectedLLM: string
}

interface WizardStore extends WizardData {
  setData: (data: Partial<WizardData>) => void
  reset: () => void
}

// Authentication store
interface AuthState {
  isAuthenticated: boolean
  username: string | null
  setAuthenticated: (isAuth: boolean, username?: string) => void
  logout: () => void
}

const initialState: WizardData = {
  requestId: '',
  projectName: '',
  companyName: '',
  industry: '',
  useCase: '',
  businessOverview: '',
  researchObjectives: '',
  surveyPages: [],
  docLink: '',
  generationStatus: '',
  selectedLLM: 'gpt',
}

export const useWizardStore = create<WizardStore>()(
  persist(
    (set) => ({
      ...initialState,
      setData: (data) => set((state) => ({ ...state, ...data })),
      reset: () => set(initialState),
    }),
    {
      name: 'survey-wizard-state',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return sessionStorage
        return { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      }),
    }
  )
)

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      username: null,
      setAuthenticated: (isAuth, username) => 
        set({ isAuthenticated: isAuth, username: username || null }),
      logout: () => set({ isAuthenticated: false, username: null }),
    }),
    {
      name: 'survey-auth-state',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return localStorage
        return { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      }),
    }
  )
)
