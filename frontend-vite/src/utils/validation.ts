// Validation Utility Functions
// This file contains validation functions and error handling

import type { ProjectSetupData } from '@/types';

export class ValidationError extends Error {
  public field: string;
  public code: string;

  constructor(
    message: string,
    field: string,
    code: string
  ) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = code;
  }
}

/**
 * Validates project setup data
 */
export const validateProjectSetup = (data: ProjectSetupData): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!data.projectName?.trim()) {
    errors.push(new ValidationError('Project name is required', 'projectName', 'REQUIRED'));
  } else if (data.projectName.length < 3) {
    errors.push(new ValidationError('Project name must be at least 3 characters', 'projectName', 'MIN_LENGTH'));
  }

  if (!data.companyName?.trim()) {
    errors.push(new ValidationError('Company name is required', 'companyName', 'REQUIRED'));
  }

  if (!data.industry?.trim()) {
    errors.push(new ValidationError('Industry is required', 'industry', 'REQUIRED'));
  }

  if (!data.useCase?.trim()) {
    errors.push(new ValidationError('Use case is required', 'useCase', 'REQUIRED'));
  }

  return errors;
};

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 */
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};