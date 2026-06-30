/**
 * API endpoints — typed wrappers around httpService.
 *
 * Phase 2 addition: refreshTokens() for the silent refresh interceptor.
 */
import { httpService } from './httpService';
import type { AuthTokens, LoginCredentials, RegisterData } from '@/types/auth';
import { logger } from '@/utils/logger';

export class ApiEndpoints {
  // ── Auth ──────────────────────────────────────────────────────────────────

  static async login(credentials: LoginCredentials): Promise<AuthTokens> {
    logger.http('[endpoints] POST /auth/login');
    const response = await httpService.post<AuthTokens>('/api/v1/auth/login', credentials);
    return response.data;
  }

  static async register(data: RegisterData): Promise<AuthTokens> {
    logger.http('[endpoints] POST /auth/register');
    const response = await httpService.post<AuthTokens>('/api/v1/auth/register', data);
    return response.data;
  }

  /** Called only by the HTTP interceptor — use a bare axios call there to avoid loops. */
  static async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    logger.http('[endpoints] POST /auth/refresh');
    const response = await httpService.post<AuthTokens>('/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  }

  // ── Survey generation ─────────────────────────────────────────────────────

  static async getBusinessOverview(payload: {
    company_name: string;
    raw_input: string;
    llm_model?: string;
  }) {
    logger.http('[endpoints] POST /surveys/business-overview');
    const response = await httpService.post('/api/v1/surveys/business-overview', payload);
    return response.data;
  }

  static async generateUseCase(payload: {
    company_name: string;
    business_overview: string;
    llm_model?: string;
  }) {
    logger.http('[endpoints] POST /surveys/generate-use-case');
    const response = await httpService.post('/api/v1/surveys/generate-use-case', payload);
    return response.data;
  }

  static async getResearchObjectives(payload: {
    business_overview: string;
    use_case: string;
    llm_model?: string;
  }) {
    logger.http('[endpoints] POST /surveys/research-objectives');
    const response = await httpService.post('/api/v1/surveys/research-objectives', payload);
    return response.data;
  }

  static async generateSurvey(payload: {
    request_id: string;
    project_name: string;
    company_name: string;
    business_overview: string;
    research_objectives: string;
    industry: string;
    use_case: string;
    llm_model?: string;
    use_web_search?: boolean;
  }) {
    logger.http('[endpoints] POST /surveys/generate');
    const response = await httpService.post('/api/v1/surveys/generate', payload);
    return response.data;
  }

  static async getSurveyStatus(requestId: string) {
    logger.http('[endpoints] GET /surveys/status/' + requestId);
    const response = await httpService.get(`/api/v1/surveys/status/${requestId}`);
    return response.data;
  }

  static async listSurveys() {
    logger.http('[endpoints] GET /surveys/');
    const response = await httpService.get('/api/v1/surveys/');
    return response.data;
  }

  static async deleteSurvey(requestId: string) {
    logger.http('[endpoints] DELETE /surveys/' + requestId);
    const response = await httpService.delete(`/api/v1/surveys/${requestId}`);
    return response.data;
  }

  static async regenerateDocument(payload: {
    request_id: string;
    project_name: string;
  }) {
    logger.http('[endpoints] POST /surveys/regenerate-document');
    const response = await httpService.post('/api/v1/surveys/regenerate-document', payload);
    return response.data;
  }

  /** Full regenerate with all survey data — used by the Builder page. */
  static async regenerateSurveyDocument(payload: {
    request_id: string;
    project_name: string;
    company_name: string;
    survey_title: string;
    pages: unknown[];
  }) {
    logger.http('[endpoints] POST /surveys/regenerate-document (full)');
    const response = await httpService.post('/api/v1/surveys/regenerate-document', payload);
    return response.data as { success: boolean; doc_link: string };
  }

  /** Alias for listSurveys — returns the authenticated user's surveys. */
  static async getUserSurveys() {
    return ApiEndpoints.listSurveys();
  }

  static async getSettings() {
    const response = await httpService.get('/api/v1/surveys/settings');
    return response.data;
  }

  static async updateSurveySettings(surveyId: string, settings: Record<string, unknown>) {
    logger.http('[endpoints] PUT /surveys/' + surveyId + '/settings');
    const response = await httpService.put(`/api/v1/surveys/${surveyId}/settings`, settings);
    return response.data;
  }

  // ── File downloads ────────────────────────────────────────────────────────

  static async downloadFile(filename: string): Promise<Blob> {
    logger.http('[endpoints] GET /files/download/' + filename);
    const response = await httpService.get(`/api/v1/files/download/${filename}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Download a file from a pre-signed or absolute URL and trigger a browser save.
   * Public R2 URLs should be opened directly by the browser so we avoid CORS
   * failures from trying to fetch them with axios first.
   */
  static async downloadFileByUrl(url: string, filename: string): Promise<void> {
    logger.http('[endpoints] GET file by URL: ' + filename);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }
}
