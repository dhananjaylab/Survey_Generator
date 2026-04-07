// Survey Type Definitions
// This file contains all survey-related TypeScript interfaces and types

export interface ProjectSetupData {
  projectName: string;
  companyName: string;
  industry: string;
  useCase: string;
}

export interface BusinessOverviewRequest {
  requestId: string;
  projectName: string;
  companyName: string;
  industry: string;
  useCase: string;
  llmModel: string;
}

export interface BusinessOverviewResponse {
  success: number;
  requestId: string;
  projectName: string;
  companyName: string;
  businessOverview: string;
  industry: string;
  useCase: string;
}

export interface Question {
  id: string;
  type: 'multiple-choice' | 'text' | 'matrix' | 'video';
  title: string;
  description?: string;
  required: boolean;
  choices?: Choice[];
}

export interface Choice {
  id: string;
  text: string;
  value: string;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  pages: SurveyPage[];
  settings: SurveySettings;
}

export interface SurveyPage {
  id: string;
  name: string;
  title: string;
  questions: Question[];
}

export interface SurveySettings {
  showProgressBar: boolean;
  showQuestionNumbers: boolean;
  allowBack: boolean;
  completeText: string;
}

export interface ResearchObjectiveRequest {
  requestId: string;
  projectName: string;
  companyName: string;
  businessOverview: string;
  industry: string;
  useCase: string;
  llmModel: string;
}

export interface SurveyGenerationRequest {
  requestId: string;
  projectName: string;
  companyName: string;
  businessOverview: string;
  researchObjectives: string;
  industry: string;
  useCase: string;
  llmModel: string;
}

export interface SurveyStatusResponse {
  success: number;
  status: 'PENDING' | 'STARTING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  requestId: string;
  projectName: string;
  companyName: string;
  researchObjectives: string;
  businessOverview: string;
  industry: string;
  useCase: string;
  pages: any;
  docLink: string;
}