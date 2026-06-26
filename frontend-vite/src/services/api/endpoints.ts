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

  static async getSettings() {
    const response = await httpService.get('/api/v1/surveys/settings');
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
}
