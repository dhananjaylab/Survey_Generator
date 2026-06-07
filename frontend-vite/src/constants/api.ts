// API Constants
// This file contains all API-related constants

/**
 * Base URL for all HTTP API requests.
 * Reads from VITE_API_BASE_URL in .env.development / .env.production.
 * Falls back to localhost:8000 for local development only.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Base URL for WebSocket connections.
 * Reads from VITE_WS_BASE_URL in .env.development / .env.production.
 * Falls back to ws://localhost:8000 for local development only.
 */
export const WS_BASE_URL: string =
  import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
  },
  SURVEYS: {
    BUSINESS_OVERVIEW: '/api/v1/surveys/business-overview',
    RESEARCH_OBJECTIVES: '/api/v1/surveys/research-objectives',
    BUSINESS_RESEARCH: '/api/v1/surveys/business-research',
    GENERATE: '/api/v1/surveys/generate',
    STATUS: '/api/v1/surveys/status',
  },
  FILES: {
    DOWNLOAD: '/api/v1/files/download',
  },
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
} as const;

export const REQUEST_TIMEOUT = 30000; // 30 seconds