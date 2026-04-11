// Survey Type Definitions
// This file contains all survey-related TypeScript interfaces and types
// Note: Backend uses snake_case, so we match that format

export interface ProjectSetupData {
  projectName: string;
  companyName: string;
  industry: string;
  useCase: string;
  llmProvider: 'gpt' | 'gemini';
}

export interface BusinessOverviewRequest {
  request_id: string;
  project_name: string;
  company_name: string;
  industry: string;
  use_case: string;
  llm_model: string;
}

export interface BusinessOverviewResponse {
  success: number;
  request_id: string;
  project_name: string;
  company_name: string;
  business_overview: string;
  industry: string;
  use_case: string;
}

export interface Question {
  id: string;
  type: 'multiple-choice' | 'text' | 'matrix' | 'video' | 'rating' | 'nps' | 'opinion-scale';
  title: string;
  description?: string;
  required: boolean;
  choices?: Choice[];
  // New specific properties
  maxScale?: number;
  lowLabel?: string;
  highLabel?: string;
  videoUrl?: string;
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
  triggers?: {
    triggerType?: 'onLoad' | 'timeDelay' | 'exitIntent' | 'scrollDepth';
    timeDelaySeconds?: number;
    scrollDepthPercent?: number;
  };
}

export interface ResearchObjectiveRequest {
  request_id: string;
  project_name: string;
  company_name: string;
  business_overview: string;
  industry: string;
  use_case: string;
  llm_model: string;
}

export interface SurveyGenerationRequest {
  request_id: string;
  project_name: string;
  company_name: string;
  business_overview: string;
  research_objectives: string;
  industry: string;
  use_case: string;
  llm_model: string;
  use_web_search?: boolean;
}

export interface SurveyStatusResponse {
  success: number;
  status: 'PENDING' | 'STARTING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  request_id: string;
  project_name: string;
  company_name: string;
  research_objectives: string;
  business_overview: string;
  industry: string;
  use_case: string;
  pages: any;
  doc_link: string;
}


export interface RegenerateSurveyDocRequest {
  request_id: string;
  project_name: string;
  company_name: string;
  survey_title: string;
  survey_description: string;
  pages: any[];
}

export interface RegenerateSurveyDocResponse {
  success: number;
  request_id: string;
  doc_link: string;
  message: string;
}
