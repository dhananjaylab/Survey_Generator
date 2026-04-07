import type { ApiError } from '@/types/api';

export class ApiErrorHandler {
  static handle(error: any): ApiError {
    // Network errors
    if (!error.response) {
      return {
        detail: 'Network error - please check your connection',
        errorCode: 'NETWORK_ERROR',
        timestamp: new Date().toISOString(),
      };
    }

    // HTTP errors
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 400:
        return {
          detail: data?.detail || 'Bad request - please check your input',
          errorCode: 'BAD_REQUEST',
          timestamp: new Date().toISOString(),
        };
      case 401:
        return {
          detail: 'Authentication required - please log in',
          errorCode: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        };
      case 403:
        return {
          detail: 'Access forbidden - insufficient permissions',
          errorCode: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        };
      case 404:
        return {
          detail: 'Resource not found',
          errorCode: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        };
      case 408:
        return {
          detail: 'Request timeout - please try again',
          errorCode: 'TIMEOUT',
          timestamp: new Date().toISOString(),
        };
      case 422:
        return {
          detail: data?.detail || 'Validation error - please check your input',
          errorCode: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        };
      case 429:
        return {
          detail: 'Rate limit exceeded - please try again later',
          errorCode: 'RATE_LIMITED',
          timestamp: new Date().toISOString(),
        };
      case 500:
        return {
          detail: 'Server error - please try again later',
          errorCode: 'SERVER_ERROR',
          timestamp: new Date().toISOString(),
        };
      case 502:
        return {
          detail: 'Bad gateway - service temporarily unavailable',
          errorCode: 'BAD_GATEWAY',
          timestamp: new Date().toISOString(),
        };
      case 503:
        return {
          detail: 'Service unavailable - please try again later',
          errorCode: 'SERVICE_UNAVAILABLE',
          timestamp: new Date().toISOString(),
        };
      case 504:
        return {
          detail: 'Gateway timeout - please try again',
          errorCode: 'GATEWAY_TIMEOUT',
          timestamp: new Date().toISOString(),
        };
      default:
        return {
          detail: data?.detail || 'An unexpected error occurred',
          errorCode: 'UNKNOWN_ERROR',
          timestamp: new Date().toISOString(),
        };
    }
  }

  static isRetryableError(error: any): boolean {
    if (!error.response) return true; // Network errors are retryable
    
    const status = error.response.status;
    // Retry on server errors, timeouts, and rate limits
    return status >= 500 || status === 408 || status === 429;
  }

  static getRetryDelay(attempt: number, baseDelay: number = 1000): number {
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  static shouldRetry(error: any, attempt: number, maxRetries: number): boolean {
    return (
      attempt < maxRetries &&
      this.isRetryableError(error) &&
      !error.config?._isRetry // Prevent infinite retry loops
    );
  }

  static logError(error: ApiError, context?: Record<string, any>): void {
    const logData = {
      error: {
        detail: error.detail,
        errorCode: error.errorCode,
        timestamp: error.timestamp,
      },
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('API Error:', logData);
    }

    // In production, you would send this to your error tracking service
    if (import.meta.env.PROD) {
      // Example: Send to Sentry, LogRocket, etc.
      console.error('Production API Error:', logData);
    }
  }
}