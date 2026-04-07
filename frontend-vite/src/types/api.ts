// API Type Definitions
// This file contains all API-related TypeScript interfaces and types

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  detail: string;
  errorCode?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FileUploadResponse {
  filename: string;
  url: string;
  size: number;
}