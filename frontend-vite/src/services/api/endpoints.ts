import { httpService } from './httpService';
// Temporary: Import debug version for troubleshooting
// import { httpServiceDebug as httpService } from './httpService.debug';
import type {
  LoginCredentials,
  RegisterData,
  AuthTokens,
} from '@/types/auth';
import type {
  BusinessOverviewRequest,
  BusinessOverviewResponse,
  ResearchObjectiveRequest,
  SurveyGenerationRequest,
  SurveyStatusResponse,
} from '@/types/survey';

export class ApiEndpoints {
  // Authentication endpoints
  static async login(credentials: LoginCredentials): Promise<AuthTokens> {
    console.log('🔐 [API] Login request:', credentials.username);
    const result = await httpService.post<AuthTokens>('/api/v1/auth/login', credentials);
    console.log('✅ [API] Login successful, token received');
    return result;
  }

  static async register(data: RegisterData): Promise<AuthTokens> {
    return httpService.post<AuthTokens>('/api/v1/auth/register', data);
  }

  // Survey endpoints
  static async generateBusinessOverview(request: BusinessOverviewRequest): Promise<BusinessOverviewResponse> {
    console.log('📊 [API] Generating business overview...');
    console.log('📊 [API] Request data:', request);
    
    // Check localStorage before making request
    const authStore = localStorage.getItem('auth-store');
    const authTokens = localStorage.getItem('auth-tokens');
    console.log('📊 [API] auth-store exists:', !!authStore);
    console.log('📊 [API] auth-tokens exists:', !!authTokens);
    
    if (authStore) {
      const parsed = JSON.parse(authStore);
      console.log('📊 [API] auth-store tokens:', parsed.state?.tokens ? 'Found' : 'Not found');
    }
    if (authTokens) {
      const parsed = JSON.parse(authTokens);
      console.log('📊 [API] auth-tokens:', parsed.accessToken ? 'Found' : 'Not found');
    }
    
    const result = await httpService.post<BusinessOverviewResponse>('/api/v1/surveys/business-overview', request);
    console.log('✅ [API] Business overview generated');
    return result;
  }

  static async generateResearchObjectives(request: ResearchObjectiveRequest): Promise<any> {
    return httpService.post('/api/v1/surveys/research-objectives', request);
  }

  static async generateBusinessResearch(request: BusinessOverviewRequest): Promise<any> {
    return httpService.post('/api/v1/surveys/business-research', request);
  }

  static async generateSurvey(request: SurveyGenerationRequest): Promise<SurveyStatusResponse> {
    return httpService.post<SurveyStatusResponse>('/api/v1/surveys/generate', request);
  }

  static async getSurveyStatus(requestId: string): Promise<SurveyStatusResponse> {
    return httpService.get<SurveyStatusResponse>(`/api/v1/surveys/status/${requestId}`);
  }

  // File endpoints
  static async downloadSurveyDocument(filename: string): Promise<void> {
    return httpService.downloadFile(`/api/v1/files/download/${filename}`, filename);
  }

  static async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<any> {
    return httpService.uploadFile('/api/v1/files/upload', file, onProgress);
  }

  // Health check endpoint
  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return httpService.get('/api/v1/health');
  }
}