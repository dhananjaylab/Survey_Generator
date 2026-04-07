# HTTP Service Documentation

This directory contains the HTTP service implementation for the React (Vite) application, providing a robust and feature-rich API client for communicating with the FastAPI backend.

## Features

- **Axios-based HTTP client** with request/response interceptors
- **Automatic authentication token handling** via request interceptors
- **Comprehensive error handling** with user-friendly error messages
- **Retry logic** with exponential backoff for failed requests
- **File upload/download** capabilities with progress tracking
- **Configurable timeouts** and base URLs
- **TypeScript support** with full type safety

## Components

### HttpService (`httpService.ts`)

The core HTTP service class that provides:

- HTTP methods (GET, POST, PUT, PATCH, DELETE)
- File operations (upload/download)
- Authentication token management
- Error handling and retry logic
- Configuration methods

```typescript
import { httpService } from '@/services/api';

// Basic usage
const data = await httpService.get('/api/v1/users');
const result = await httpService.post('/api/v1/users', { name: 'John' });

// File upload with progress
await httpService.uploadFile('/api/v1/files/upload', file, (progress) => {
  console.log(`Upload progress: ${progress}%`);
});

// Configuration
httpService.setBaseURL('https://api.example.com');
httpService.setTimeout(60000);
httpService.setRetryConfig(5, 2000);
```

### ApiEndpoints (`endpoints.ts`)

Pre-configured API endpoints for the application:

```typescript
import { ApiEndpoints } from '@/services/api';

// Authentication
const tokens = await ApiEndpoints.login({ username, password });
await ApiEndpoints.register({ username, password });

// Survey operations
const overview = await ApiEndpoints.generateBusinessOverview(request);
const status = await ApiEndpoints.getSurveyStatus(requestId);

// File operations
await ApiEndpoints.downloadSurveyDocument('survey.pdf');
await ApiEndpoints.uploadFile(file, onProgress);
```

### Error Handling (`errorHandler.ts`)

Sophisticated error handling utilities:

```typescript
import { ApiErrorHandler } from '@/services/api';

try {
  await httpService.get('/api/endpoint');
} catch (error) {
  const apiError = ApiErrorHandler.handle(error);
  console.error('API Error:', apiError.detail);
  
  if (ApiErrorHandler.isRetryableError(error)) {
    // Implement retry logic
  }
}
```

### Retry Handler (`retryHandler.ts`)

Flexible retry mechanisms:

```typescript
import { RetryHandler } from '@/services/api';

// Exponential backoff retry
const result = await RetryHandler.withExponentialBackoff(
  () => httpService.get('/api/endpoint'),
  3 // max attempts
);

// Custom retry logic
const result = await RetryHandler.withRetry(
  () => httpService.post('/api/endpoint', data),
  {
    maxAttempts: 5,
    baseDelay: 1000,
    retryCondition: (error) => error.response?.status >= 500,
    onRetry: (error, attempt) => console.log(`Retry attempt ${attempt}`)
  }
);
```

## Configuration

### Environment Variables

Configure the HTTP service using environment variables:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000

# Environment
VITE_NODE_ENV=development
```

### Default Configuration

- **Base URL**: `http://localhost:8000` (fallback)
- **Timeout**: 30 seconds
- **Max Retries**: 3 attempts
- **Retry Delay**: 1 second (with exponential backoff)
- **Content Type**: `application/json`

## Authentication

The HTTP service automatically handles JWT token authentication:

1. **Token Storage**: Tokens are stored in localStorage via Zustand persistence
2. **Request Interceptor**: Automatically adds `Authorization: Bearer <token>` header
3. **Token Expiration**: Automatically redirects to login on 401 errors
4. **Token Refresh**: Clears expired tokens and redirects to login

## Error Handling

The service provides comprehensive error handling:

### HTTP Status Codes

- **400**: Bad Request - Input validation errors
- **401**: Unauthorized - Authentication required
- **403**: Forbidden - Insufficient permissions
- **404**: Not Found - Resource not found
- **408**: Request Timeout - Request took too long
- **422**: Validation Error - Data validation failed
- **429**: Rate Limited - Too many requests
- **500+**: Server Errors - Internal server issues

### Retry Logic

Automatic retry for:
- Network errors (no response)
- Server errors (5xx status codes)
- Timeout errors (408 status)
- Rate limit errors (429 status)

Non-retryable errors:
- Authentication errors (401, 403)
- Client errors (400, 404, 422)

### Error Logging

Errors are automatically logged with context:
- Development: Console logging with full details
- Production: Structured logging for error tracking services

## File Operations

### File Upload

```typescript
const file = document.querySelector('input[type="file"]').files[0];

await httpService.uploadFile('/api/v1/files/upload', file, (progress) => {
  console.log(`Upload: ${progress}%`);
});
```

### File Download

```typescript
await httpService.downloadFile('/api/v1/files/download/survey.pdf', 'survey.pdf');
```

## Testing

The HTTP service includes comprehensive tests:

- **Unit Tests**: Test individual methods and error handling
- **Integration Tests**: Test with mocked backend responses
- **Property Tests**: Test universal properties across inputs

Run tests:

```bash
npm run test:run src/services/api
```

## Best Practices

1. **Use ApiEndpoints**: Prefer pre-configured endpoints over direct httpService calls
2. **Handle Errors**: Always wrap API calls in try-catch blocks
3. **Progress Tracking**: Use progress callbacks for file operations
4. **Retry Logic**: Use RetryHandler for critical operations
5. **Type Safety**: Use TypeScript interfaces for request/response data
6. **Error Logging**: Log errors with sufficient context for debugging

## Integration with Stores

The HTTP service integrates seamlessly with Zustand stores:

```typescript
// In a store action
const loginUser = async (credentials: LoginCredentials) => {
  try {
    set({ isLoading: true, error: null });
    const tokens = await ApiEndpoints.login(credentials);
    set({ tokens, isAuthenticated: true, isLoading: false });
  } catch (error) {
    const apiError = ApiErrorHandler.handle(error);
    set({ error: apiError.detail, isLoading: false });
    throw error;
  }
};
```

## Performance Considerations

- **Request Deduplication**: Avoid duplicate concurrent requests
- **Caching**: Implement response caching for static data
- **Compression**: Enable gzip compression for large payloads
- **Timeouts**: Set appropriate timeouts for different operations
- **Retry Limits**: Prevent infinite retry loops

## Security

- **HTTPS Only**: Use HTTPS in production
- **Token Security**: Store tokens securely (consider httpOnly cookies)
- **CSRF Protection**: Implement CSRF tokens for state-changing operations
- **Input Validation**: Validate all inputs before sending to API
- **Error Sanitization**: Don't expose sensitive information in error messages