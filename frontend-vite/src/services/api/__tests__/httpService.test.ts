import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { HttpService } from '../httpService';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('HttpService', () => {
  let service: HttpService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      defaults: {
        baseURL: '',
        timeout: 30000,
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    // Clear localStorage
    localStorage.clear();
    
    // Create new service instance after mocking
    service = new HttpService('http://test-api.com');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('creates axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://test-api.com',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('HTTP methods', () => {
    beforeEach(() => {
      // Mock successful responses
      mockAxiosInstance.get.mockResolvedValue({ data: { success: true } });
      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });
      mockAxiosInstance.put.mockResolvedValue({ data: { success: true } });
      mockAxiosInstance.patch.mockResolvedValue({ data: { success: true } });
      mockAxiosInstance.delete.mockResolvedValue({ data: { success: true } });
    });

    it('makes GET requests correctly', async () => {
      const result = await service.get('/test');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual({ success: true });
    });

    it('makes POST requests correctly', async () => {
      const data = { name: 'test' };
      const result = await service.post('/test', data);
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', data, undefined);
      expect(result).toEqual({ success: true });
    });

    it('makes PUT requests correctly', async () => {
      const data = { name: 'test' };
      const result = await service.put('/test', data);
      
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test', data, undefined);
      expect(result).toEqual({ success: true });
    });

    it('makes PATCH requests correctly', async () => {
      const data = { name: 'test' };
      const result = await service.patch('/test', data);
      
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/test', data, undefined);
      expect(result).toEqual({ success: true });
    });

    it('makes DELETE requests correctly', async () => {
      const result = await service.delete('/test');
      
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual({ success: true });
    });
  });

  describe('configuration methods', () => {
    it('sets base URL correctly', () => {
      service.setBaseURL('http://new-api.com');
      expect(mockAxiosInstance.defaults.baseURL).toBe('http://new-api.com');
    });

    it('sets timeout correctly', () => {
      service.setTimeout(60000);
      expect(mockAxiosInstance.defaults.timeout).toBe(60000);
    });

    it('returns axios instance', () => {
      const instance = service.getAxiosInstance();
      expect(instance).toBe(mockAxiosInstance);
    });
  });

  describe('file operations', () => {
    it('uploads files with progress tracking', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockProgress = vi.fn();
      
      mockAxiosInstance.post.mockResolvedValue({ data: { filename: 'test.txt' } });

      await service.uploadFile('/upload', mockFile, mockProgress);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/upload',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: expect.any(Function),
        })
      );
    });
  });
});