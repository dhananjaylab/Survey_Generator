/**
 * HTTP Service Usage Examples
 * 
 * This file demonstrates how to use the HTTP service in real application scenarios.
 * These examples show integration with React components and Zustand stores.
 */

import { httpService, ApiEndpoints, ApiErrorHandler, RetryHandler } from '@/services/api';
import type { LoginCredentials, AuthTokens } from '@/types/auth';
import type { BusinessOverviewRequest } from '@/types/survey';

// Example 1: Basic API calls in a React component
export const basicUsageExample = {
  // Simple GET request
  async fetchUserProfile(userId: string) {
    try {
      const profile = await httpService.get(`/api/v1/users/${userId}`);
      return profile;
    } catch (error) {
      const apiError = ApiErrorHandler.handle(error);
      console.error('Failed to fetch user profile:', apiError.detail);
      throw apiError;
    }
  },

  // POST request with data
  async createProject(projectData: any) {
    try {
      const result = await httpService.post('/api/v1/projects', projectData);
      return result;
    } catch (error) {
      const apiError = ApiErrorHandler.handle(error);
      throw apiError;
    }
  }
};

// Example 2: Authentication flow
export const authenticationExample = {
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    try {
      // Using pre-configured endpoint
      const tokens = await ApiEndpoints.login(credentials);
      
      // Tokens are automatically stored and will be used in subsequent requests
      console.log('Login successful, tokens stored');
      return tokens;
    } catch (error) {
      const apiError = ApiErrorHandler.handle(error);
      
      // Handle specific error cases
      if (apiError.errorCode === 'UNAUTHORIZED') {
        throw new Error('Invalid username or password');
      }
      
      throw new Error(apiError.detail);
    }
  },

  async logout() {
    try {
      // Call logout endpoint (if exists)
      await httpService.post('/api/v1/auth/logout');
    } catch (error) {
      // Even if logout fails, clear local tokens
      console.warn('Logout request failed, but clearing local session');
    } finally {
      // Clear stored tokens
      localStorage.removeItem('auth-store');
    }
  }
};

// Example 3: Survey workflow with retry logic
export const surveyWorkflowExample = {
  async generateBusinessOverview(request: BusinessOverviewRequest) {
    // Use retry handler for critical operations
    return RetryHandler.withExponentialBackoff(
      () => ApiEndpoints.generateBusinessOverview(request),
      3 // max attempts
    );
  },

  async pollSurveyStatus(requestId: string) {
    // Custom retry logic for polling
    return RetryHandler.withCustomRetry(
      () => ApiEndpoints.getSurveyStatus(requestId),
      (error, attempt) => {
        // Retry on network errors or server errors, but not on 404
        return ApiErrorHandler.isRetryableError(error) && 
               error.response?.status !== 404 && 
               attempt < 10;
      },
      (attempt) => Math.min(1000 * attempt, 5000), // Linear backoff, max 5s
      10 // max attempts
    );
  }
};

// Example 4: File operations with progress tracking
export const fileOperationsExample = {
  async uploadSurveyDocument(file: File, onProgress?: (progress: number) => void) {
    try {
      const result = await ApiEndpoints.uploadFile(file, onProgress);
      console.log('File uploaded successfully:', result);
      return result;
    } catch (error) {
      const apiError = ApiErrorHandler.handle(error);
      
      // Handle specific file upload errors
      if (apiError.errorCode === 'BAD_REQUEST') {
        throw new Error('Invalid file format or size');
      }
      
      throw new Error(`Upload failed: ${apiError.detail}`);
    }
  },

  async downloadSurveyDocument(filename: string) {
    try {
      await ApiEndpoints.downloadSurveyDocument(filename);
      console.log('File download started');
    } catch (error) {
      const apiError = ApiErrorHandler.handle(error);
      
      if (apiError.errorCode === 'NOT_FOUND') {
        throw new Error('File not found');
      }
      
      throw new Error(`Download failed: ${apiError.detail}`);
    }
  }
};

// Example 5: Integration with Zustand store
export const storeIntegrationExample = {
  // This would be used inside a Zustand store action
  createStoreAction() {
    return async (credentials: LoginCredentials) => {
      // set({ isLoading: true, error: null });
      
      try {
        const tokens = await ApiEndpoints.login(credentials);
        
        // Update store state
        // set({ 
        //   tokens, 
        //   isAuthenticated: true, 
        //   isLoading: false,
        //   error: null 
        // });
        
        return tokens;
      } catch (error) {
        const apiError = ApiErrorHandler.handle(error);
        
        // Update store with error
        // set({ 
        //   isLoading: false, 
        //   error: apiError.detail 
        // });
        
        // Log error for debugging
        ApiErrorHandler.logError(apiError, {
          action: 'login',
          timestamp: new Date().toISOString()
        });
        
        throw apiError;
      }
    };
  }
};

// Example 6: React component integration
export const reactComponentExample = {
  // This would be used in a React component
  useApiCall() {
    // const [loading, setLoading] = useState(false);
    // const [error, setError] = useState<string | null>(null);
    
    const handleApiCall = async () => {
      // setLoading(true);
      // setError(null);
      
      try {
        const result = await httpService.get('/api/v1/data');
        console.log('API call successful:', result);
        return result;
      } catch (error) {
        const apiError = ApiErrorHandler.handle(error);
        // setError(apiError.detail);
        console.error('API call failed:', apiError);
        return null;
      } finally {
        // setLoading(false);
      }
    };
    
    return { handleApiCall };
  }
};

// Example 7: Configuration and customization
export const configurationExample = {
  // Configure HTTP service for different environments
  setupForEnvironment(environment: 'development' | 'staging' | 'production') {
    const configs = {
      development: {
        baseURL: 'http://localhost:8000',
        timeout: 30000,
        retries: 3
      },
      staging: {
        baseURL: 'https://staging-api.example.com',
        timeout: 45000,
        retries: 5
      },
      production: {
        baseURL: 'https://api.example.com',
        timeout: 60000,
        retries: 3
      }
    };
    
    const config = configs[environment];
    
    httpService.setBaseURL(config.baseURL);
    httpService.setTimeout(config.timeout);
    httpService.setRetryConfig(config.retries, 1000);
    
    console.log(`HTTP service configured for ${environment}`);
  },

  // Health check with custom retry
  async performHealthCheck() {
    try {
      const health = await RetryHandler.withRetry(
        () => ApiEndpoints.healthCheck(),
        {
          maxAttempts: 3,
          baseDelay: 500,
          retryCondition: (error) => {
            // Only retry on network errors or 5xx errors
            return !error.response || error.response.status >= 500;
          },
          onRetry: (error, attempt) => {
            console.log(`Health check failed, retry ${attempt}/3`, error);
          }
        }
      );
      
      console.log('Health check passed:', health);
      return health;
    } catch (error) {
      console.error('Health check failed after retries:', error);
      throw error;
    }
  }
};

// Example 8: Error handling patterns
export const errorHandlingExample = {
  // Comprehensive error handling
  async robustApiCall(endpoint: string, data?: any) {
    try {
      const result = await httpService.post(endpoint, data);
      return { success: true, data: result };
    } catch (error) {
      const apiError = ApiErrorHandler.handle(error);
      
      // Log error with context
      ApiErrorHandler.logError(apiError, {
        endpoint,
        data,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
      
      // Return structured error response
      return {
        success: false,
        error: {
          message: apiError.detail,
          code: apiError.errorCode,
          retryable: ApiErrorHandler.isRetryableError(error)
        }
      };
    }
  },

  // Graceful degradation
  async fetchDataWithFallback(primaryEndpoint: string, fallbackEndpoint: string) {
    try {
      return await httpService.get(primaryEndpoint);
    } catch (error) {
      console.warn('Primary endpoint failed, trying fallback:', error);
      
      try {
        return await httpService.get(fallbackEndpoint);
      } catch (fallbackError) {
        console.error('Both endpoints failed:', fallbackError);
        
        // Return cached data or default values
        return { data: [], cached: true };
      }
    }
  }
};