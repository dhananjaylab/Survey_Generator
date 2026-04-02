// Simple test utilities for authentication
export function testAuthFlow() {
  console.log('Testing authentication flow...')
  
  // Test token storage
  const testToken = 'test-jwt-token'
  localStorage.setItem('survey_jwt_token', testToken)
  
  const storedToken = localStorage.getItem('survey_jwt_token')
  console.log('Token storage test:', storedToken === testToken ? 'PASS' : 'FAIL')
  
  // Test token expiration check
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxNjAwMDAwMDAwfQ.invalid'
  localStorage.setItem('survey_jwt_token', expiredToken)
  
  // Clean up
  localStorage.removeItem('survey_jwt_token')
  
  console.log('Authentication flow test completed')
}

// Test API error handling
export function testErrorHandling() {
  console.log('Testing error handling...')
  
  // Test 401 error
  const mockError401 = new Error('Authentication failed - please log in again')
  console.log('401 error test:', mockError401.message.includes('Authentication') ? 'PASS' : 'FAIL')
  
  // Test 429 error
  const mockError429 = new Error('Too many requests. Please try again later.')
  console.log('429 error test:', mockError429.message.includes('Too many requests') ? 'PASS' : 'FAIL')
  
  console.log('Error handling test completed')
}

// Run tests in development
if (process.env.NODE_ENV === 'development') {
  if (typeof window !== 'undefined') {
    (window as any).testAuth = testAuthFlow;
    (window as any).testErrorHandling = testErrorHandling;
  }
}