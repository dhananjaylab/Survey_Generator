import fc from 'fast-check'

// Configure property tests to run minimum 100 iterations
export const propertyTestConfig = {
  numRuns: 100,
  verbose: true,
  seed: 42, // For reproducible tests
}

// Custom arbitraries for domain objects
export const arbitraries = {
  // Project setup data arbitrary
  projectSetupData: () => fc.record({
    projectName: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length >= 3),
    companyName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length >= 1),
    industry: fc.constantFrom('Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail'),
    useCase: fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length >= 10),
  }),

  // Survey question arbitrary
  surveyQuestion: () => fc.record({
    id: fc.uuid(),
    type: fc.constantFrom('multiple-choice', 'text', 'matrix', 'video'),
    title: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length >= 5),
    description: fc.option(fc.string({ maxLength: 200 })),
    required: fc.boolean(),
    choices: fc.option(fc.array(fc.record({
      id: fc.uuid(),
      text: fc.string({ minLength: 1, maxLength: 50 }),
      value: fc.string({ minLength: 1, maxLength: 50 }),
    }), { minLength: 2, maxLength: 10 })),
  }),

  // JWT token arbitrary
  jwtToken: () => fc.record({
    accessToken: fc.string({ minLength: 20, maxLength: 50 }).map(s => 
      `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ 
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: 'user123',
        iat: Math.floor(Date.now() / 1000)
      }))}.${s.replace(/[^a-zA-Z0-9]/g, 'A')}`
    ),
    tokenType: fc.constant('bearer'),
  }),

  // User arbitrary
  user: () => fc.record({
    username: fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
    isActive: fc.boolean(),
    createdAt: fc.date().map(d => d.toISOString()),
    updatedAt: fc.date().map(d => d.toISOString()),
  }),

  // API response arbitrary
  apiResponse: <T>(dataArbitrary: fc.Arbitrary<T>) => fc.record({
    data: dataArbitrary,
    success: fc.boolean(),
    message: fc.option(fc.string({ maxLength: 100 })),
  }),

  // WebSocket message arbitrary
  webSocketMessage: () => fc.record({
    requestId: fc.uuid(),
    update: fc.string({ minLength: 1, maxLength: 100 }),
    completed: fc.option(fc.boolean()),
  }),

  // Survey arbitrary
  survey: () => fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 5, maxLength: 100 }),
    description: fc.string({ maxLength: 500 }),
    pages: fc.array(fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      title: fc.string({ minLength: 1, maxLength: 100 }),
      questions: fc.array(arbitraries.surveyQuestion(), { maxLength: 20 }),
    }), { minLength: 1, maxLength: 10 }),
    settings: fc.record({
      showProgressBar: fc.boolean(),
      showQuestionNumbers: fc.boolean(),
      allowBack: fc.boolean(),
      completeText: fc.string({ maxLength: 50 }),
    }),
  }),

  // File arbitrary
  file: () => fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0).map(s => `${s.trim()}.docx`),
    size: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }), // 1KB to 10MB
    type: fc.constantFrom('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    lastModified: fc.integer({ min: 1, max: Date.now() }),
  }),

  // HTTP status codes
  httpStatusCode: () => fc.constantFrom(200, 201, 400, 401, 403, 404, 422, 429, 500, 502, 503),

  // Route paths
  routePath: () => fc.constantFrom('/', '/login', '/research', '/generate', '/builder'),
}

// Helper function to create property test with consistent configuration
export const createPropertyTest = (
  property: any,
  config: Partial<any> = {}
) => {
  return fc.assert(property, { ...propertyTestConfig, ...config })
}

// Mock data generators for testing
export const mockGenerators = {
  // Generate mock API responses
  mockApiSuccess: <T>(data: T) => ({
    data,
    success: true,
    message: 'Operation completed successfully',
  }),

  mockApiError: (message: string, errorCode?: string) => ({
    detail: message,
    errorCode,
    timestamp: new Date().toISOString(),
  }),

  // Generate mock WebSocket messages
  mockWebSocketProgress: (requestId: string, update: string, completed = false) => ({
    requestId,
    update,
    completed,
  }),

  // Generate mock survey data
  mockSurveyStatus: (requestId: string, status: 'PENDING' | 'STARTING' | 'RUNNING' | 'COMPLETED' | 'FAILED') => ({
    success: 1,
    status,
    requestId,
    projectName: 'Test Project',
    companyName: 'Test Company',
    researchObjectives: 'Test objectives',
    businessOverview: 'Test overview',
    industry: 'Technology',
    useCase: 'Testing',
    pages: [],
    docLink: status === 'COMPLETED' ? 'test-document.docx' : '',
  }),
}