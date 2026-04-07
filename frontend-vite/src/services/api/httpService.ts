import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types/api';
import type { AuthTokens } from '@/types/auth';

class HttpService {
  private client: AxiosInstance;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(baseURL: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') {
    
    try {
      this.client = axios.create({
        baseURL,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      this.setupInterceptors();
    } catch (error) {
      // Fallback for testing environments
      console.warn('Failed to create axios instance, using fallback');
      this.client = axios as any;
    }
  }

  private setupInterceptors(): void {
    // Check if client has interceptors (might not in test environment)
    if (!this.client?.interceptors) {
      console.warn('Axios interceptors not available');
      return;
    }

    // Request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        // Get tokens from localStorage (will be replaced with store access later)
        const storedTokens = this.getStoredTokens();
        if (storedTokens?.accessToken) {
          config.headers.Authorization = `Bearer ${storedTokens.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling and retry logic
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors (token expired)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          // Clear stored tokens
          this.clearStoredTokens();
          
          // Redirect to login (will be handled by auth store later)
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        // Implement retry logic for retryable errors
        if (this.isRetryableError(error) && !originalRequest._retryCount) {
          originalRequest._retryCount = 0;
        }

        if (
          this.isRetryableError(error) &&
          originalRequest._retryCount < this.maxRetries
        ) {
          originalRequest._retryCount++;
          
          // Calculate delay with exponential backoff
          const delay = this.retryDelay * Math.pow(2, originalRequest._retryCount - 1);
          
          console.log(`Retrying request (attempt ${originalRequest._retryCount}/${this.maxRetries}) in ${delay}ms...`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.client(originalRequest);
        }

        // Handle network errors
        if (!error.response) {
          throw new Error('Network error - please check your connection');
        }

        // Transform API errors
        const apiError: ApiError = {
          detail: error.response.data?.detail || 'An unexpected error occurred',
          errorCode: error.response.data?.errorCode,
          timestamp: error.response.data?.timestamp || new Date().toISOString(),
        };

        throw apiError;
      }
    );
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors or 5xx server errors
    if (!error.response) return true;
    
    const status = error.response.status;
    return status >= 500 || status === 408 || status === 429;
  }

  private getStoredTokens(): AuthTokens | null {
    try {
      const stored = localStorage.getItem('auth-store');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.state?.tokens || null;
      }
    } catch (error) {
      console.error('Failed to get stored tokens:', error);
    }
    return null;
  }

  private clearStoredTokens(): void {
    try {
      localStorage.removeItem('auth-store');
    } catch (error) {
      console.error('Failed to clear stored tokens:', error);
    }
  }

  // HTTP Methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // File Operations
  async uploadFile(
    url: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await this.client.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Configuration methods
  setBaseURL(baseURL: string): void {
    this.client.defaults.baseURL = baseURL;
  }

  setTimeout(timeout: number): void {
    this.client.defaults.timeout = timeout;
  }

  setRetryConfig(maxRetries: number, retryDelay: number): void {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  // Get the underlying Axios instance for advanced usage
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}

// Create and export a singleton instance
export const httpService = new HttpService();
export { HttpService };