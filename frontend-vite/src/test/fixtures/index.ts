// Test fixtures for consistent test data

export const mockUser = {
  username: 'testuser',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

export const mockTokens = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzU1MDUyMjgsInN1YiI6InVzZXIxMjMiLCJpYXQiOjE3NzU1MDE2Mjh9.mockSignature',
  tokenType: 'bearer' as const,
}

export const mockProjectSetup = {
  projectName: 'Test Project',
  companyName: 'Test Company',
  industry: 'Technology' as const,
  useCase: 'Testing the survey generation system',
}

export const mockSurveyQuestion = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  type: 'multiple-choice' as const,
  title: 'What is your favorite color?',
  description: 'Please select your preferred color from the options below',
  required: true,
  choices: [
    { id: '1', text: 'Red', value: 'red' },
    { id: '2', text: 'Blue', value: 'blue' },
    { id: '3', text: 'Green', value: 'green' },
  ],
}

export const mockSurvey = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  title: 'Customer Satisfaction Survey',
  description: 'A survey to measure customer satisfaction',
  pages: [
    {
      id: '123e4567-e89b-12d3-a456-426614174002',
      name: 'page1',
      title: 'General Questions',
      questions: [mockSurveyQuestion],
    },
  ],
  settings: {
    showProgressBar: true,
    showQuestionNumbers: true,
    allowBack: true,
    completeText: 'Thank you for your participation!',
  },
}

export const mockApiResponse = <T>(data: T) => ({
  data,
  success: true,
  message: 'Operation completed successfully',
})

export const mockApiError = (message: string, errorCode?: string) => ({
  detail: message,
  errorCode,
  timestamp: new Date().toISOString(),
})