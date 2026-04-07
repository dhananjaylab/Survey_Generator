// Store Type Definitions
// This file contains all store-related TypeScript interfaces and types

import type { AuthState } from './auth';
import type { WebSocketState } from './websocket';
import type { Survey, ProjectSetupData } from './survey';

export interface SurveyState {
  currentProject: ProjectSetupData | null;
  businessOverview: string | null;
  researchObjectives: string | null;
  currentSurvey: Survey | null;
  currentSurveyDocLink: string | null;
  isGenerating: boolean;
  error: string | null;
}

export interface UIState {
  isLoading: boolean;
  notifications: Notification[];
  modals: ModalState[];
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
}

export interface ModalState {
  id: string;
  component: string;
  props: Record<string, any>;
  isOpen: boolean;
}

export interface RootState {
  auth: AuthState;
  survey: SurveyState;
  ui: UIState;
  websocket: WebSocketState;
}