import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiEndpoints } from '../endpoints';
import { httpService } from '../httpService';
import type { LoginCredentials, RegisterData } from '@/types/auth';
import type { BusinessOverviewRequest } from '@/types/survey';

// Mock the httpService
vi.mock('../httpService', () => ({
  httpService: {
    post: vi.fn(),
    get: vi.fn(),
    downloadFile: vi.fn(),
    uploadFile: vi.fn(),
  },
}));

const mockedHttpService = vi.mocked(httpService);

describe('ApiEndpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication endpoints', () => {
    it('calls login endpoint correctly', async () => {
      const credentials: LoginCredentials = {
        username: 'testuser',
        password: 'password123',
      };
      
      const mockResponse = {
        accessToken: 'test-token',
        tokenType: 'bearer',
      };

      mockedHttpService.post.mockResolvedValue(mockResponse);

      const result = await ApiEndpoints.login(credentials);

      expect(mockedHttpService.post).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        credentials
      );
      expect(result).toEqual(mockResponse);
    });

    it('calls register endpoint correctly', async () => {
      const registerData: RegisterData = {
        username: 'newuser',
        password: 'password123',
      };
      
      const mockResponse = {
        accessToken: 'test-token',
        tokenType: 'bearer',
      };

      mockedHttpService.post.mockResolvedValue(mockResponse);

      const result = await ApiEndpoints.register(registerData);

      expect(mockedHttpService.post).toHaveBeenCalledWith(
        '/api/v1/auth/register',
        registerData
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('survey endpoints', () => {
    it('calls generateBusinessOverview endpoint correctly', async () => {
      const request: BusinessOverviewRequest = {
        requestId: 'test-request-id',
        projectName: 'Test Project',
        companyName: 'Test Company',
        industry: 'Technology',
        useCase: 'Testing',
        llmModel: 'gpt',
      };
      
      const mockResponse = {
        success: 1,
        requestId: 'test-request-id',
        projectName: 'Test Project',
        companyName: 'Test Company',
        businessOverview: 'Generated overview',
        industry: 'Technology',
        useCase: 'Testing',
      };

      mockedHttpService.post.mockResolvedValue(mockResponse);

      const result = await ApiEndpoints.generateBusinessOverview(request);

      expect(mockedHttpService.post).toHaveBeenCalledWith(
        '/api/v1/surveys/business-overview',
        request
      );
      expect(result).toEqual(mockResponse);
    });

    it('calls generateResearchObjectives endpoint correctly', async () => {
      const request = {
        requestId: 'test-request-id',
        projectName: 'Test Project',
        companyName: 'Test Company',
        businessOverview: 'Test overview',
        industry: 'Technology',
        useCase: 'Testing',
        llmModel: 'gpt',
      };

      const mockResponse = {
        research_objectives: 'Generated objectives',
      };

      mockedHttpService.post.mockResolvedValue(mockResponse);

      const result = await ApiEndpoints.generateResearchObjectives(request);

      expect(mockedHttpService.post).toHaveBeenCalledWith(
        '/api/v1/surveys/research-objectives',
        request
      );
      expect(result).toEqual(mockResponse);
    });

    it('calls generateSurvey endpoint correctly', async () => {
      const request = {
        requestId: 'test-request-id',
        projectName: 'Test Project',
        companyName: 'Test Company',
        businessOverview: 'Test overview',
        researchObjectives: 'Test objectives',
        industry: 'Technology',
        useCase: 'Testing',
        llmModel: 'gpt',
      };

      const mockResponse = {
        success: 1,
        status: 'RUNNING' as const,
        requestId: 'test-request-id',
        projectName: 'Test Project',
        companyName: 'Test Company',
        researchObjectives: 'Test objectives',
        businessOverview: 'Test overview',
        industry: 'Technology',
        useCase: 'Testing',
        pages: {},
        docLink: '',
      };

      mockedHttpService.post.mockResolvedValue(mockResponse);

      const result = await ApiEndpoints.generateSurvey(request);

      expect(mockedHttpService.post).toHaveBeenCalledWith(
        '/api/v1/surveys/generate',
        request
      );
      expect(result).toEqual(mockResponse);
    });

    it('calls getSurveyStatus endpoint correctly', async () => {
      const requestId = 'test-request-id';
      const mockResponse = {
        success: 1,
        status: 'COMPLETED' as const,
        requestId: 'test-request-id',
        projectName: 'Test Project',
        companyName: 'Test Company',
        researchObjectives: 'Test objectives',
        businessOverview: 'Test overview',
        industry: 'Technology',
        useCase: 'Testing',
        pages: { page1: {} },
        docLink: 'http://example.com/doc.pdf',
      };

      mockedHttpService.get.mockResolvedValue(mockResponse);

      const result = await ApiEndpoints.getSurveyStatus(requestId);

      expect(mockedHttpService.get).toHaveBeenCalledWith(
        `/api/v1/surveys/status/${requestId}`
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('file endpoints', () => {
    it('calls downloadSurveyDocument endpoint correctly', async () => {
      const filename = 'survey.pdf';

      mockedHttpService.downloadFile.mockResolvedValue(undefined);

      await ApiEndpoints.downloadSurveyDocument(filename);

      expect(mockedHttpService.downloadFile).toHaveBeenCalledWith(
        `/api/v1/files/download/${filename}`,
        filename
      );
    });

    it('calls uploadFile endpoint correctly', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockProgress = vi.fn();
      const mockResponse = {
        filename: 'test.txt',
        url: 'http://example.com/test.txt',
        size: 1024,
      };

      mockedHttpService.uploadFile.mockResolvedValue(mockResponse);

      const result = await ApiEndpoints.uploadFile(mockFile, mockProgress);

      expect(mockedHttpService.uploadFile).toHaveBeenCalledWith(
        '/api/v1/files/upload',
        mockFile,
        mockProgress
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('health check endpoint', () => {
    it('calls health check endpoint correctly', async () => {
      const mockResponse = {
        status: 'healthy',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockedHttpService.get.mockResolvedValue(mockResponse);

      const result = await ApiEndpoints.healthCheck();

      expect(mockedHttpService.get).toHaveBeenCalledWith('/api/v1/health');
      expect(result).toEqual(mockResponse);
    });
  });
});