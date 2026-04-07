import { ApiErrorHandler } from './errorHandler';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
  retryCondition?: (error: any) => boolean;
  onRetry?: (error: any, attempt: number) => void;
}

export class RetryHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      backoffFactor = 2,
      jitter = true,
      retryCondition = ApiErrorHandler.isRetryableError,
      onRetry,
    } = options;

    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry if condition is not met
        if (!retryCondition(error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        let delay = baseDelay * Math.pow(backoffFactor, attempt - 1);
        
        // Add jitter to prevent thundering herd
        if (jitter) {
          const jitterAmount = delay * 0.1 * Math.random();
          delay += jitterAmount;
        }
        
        // Cap the delay
        delay = Math.min(delay, maxDelay);

        console.log(`Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`);
        
        // Call retry callback if provided
        if (onRetry) {
          onRetry(error, attempt);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  static async withExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3
  ): Promise<T> {
    return this.withRetry(operation, {
      maxAttempts,
      baseDelay: 1000,
      backoffFactor: 2,
      jitter: true,
    });
  }

  static async withLinearBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    return this.withRetry(operation, {
      maxAttempts,
      baseDelay: delay,
      backoffFactor: 1,
      jitter: false,
    });
  }

  static async withCustomRetry<T>(
    operation: () => Promise<T>,
    shouldRetry: (error: any, attempt: number) => boolean,
    getDelay: (attempt: number) => number,
    maxAttempts: number = 3
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (!shouldRetry(error, attempt) || attempt === maxAttempts) {
          break;
        }

        const delay = getDelay(attempt);
        console.log(`Custom retry attempt ${attempt}, waiting ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}