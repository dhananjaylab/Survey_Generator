// API Constants
// This file contains all API-related constants

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