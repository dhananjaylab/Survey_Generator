import { getAuthHeader, ensureAuthenticated, clearAuthToken, redirectToLogin } from './utils'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
}

// Sleep utility for retry delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Calculate exponential backoff delay
function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt)
  return Math.min(delay, RETRY_CONFIG.maxDelay)
}

async function apiFetch<T>(path: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
  // Ensure authenticated before making request
  try {
    await ensureAuthenticated()
  } catch (error) {
    console.warn('Authentication warning:', error)
    redirectToLogin()
    throw new Error('Authentication required')
  }

  // Add timeout abort controller
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
        ...(options.headers as Record<string, string>),
      },
    })

    clearTimeout(timeoutId)

    // Handle 401 Unauthorized - token expired or invalid
    if (res.status === 401) {
      console.warn('API returned 401 - clearing token and redirecting to login')
      clearAuthToken()
      redirectToLogin()
      throw new Error('Authentication failed - please log in again')
    }

    // Handle 429 Rate Limit Exceeded
    if (res.status === 429) {
      const errorMessage = 'Too many requests. Please try again later.'
      
      // Show user-friendly message using custom event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('show-notification', {
          detail: {
            type: 'warning',
            title: 'Rate Limit Exceeded',
            message: errorMessage
          }
        }))
      }
      
      throw new Error(errorMessage)
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => `HTTP ${res.status}`)
      
      // Check if this is a retryable error (5xx server errors or network issues)
      const isRetryable = res.status >= 500 || res.status === 0
      
      if (isRetryable && retryCount < RETRY_CONFIG.maxRetries) {
        const delay = getRetryDelay(retryCount)
        console.warn(`Request failed with ${res.status}, retrying in ${delay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`)
        
        await sleep(delay)
        return apiFetch<T>(path, options, retryCount + 1)
      }
      
      throw new Error(errorText)
    }

    return res.json() as Promise<T>
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout (30s) - backend may be slow or unresponsive')
    }
    
    // Check if this is a network error that should be retried
    const isNetworkError = error instanceof TypeError && (
      error.message.includes('fetch') || 
      error.message.includes('NetworkError') || 
      error.message.includes('Failed to fetch')
    )
    
    if (isNetworkError && retryCount < RETRY_CONFIG.maxRetries) {
      const delay = getRetryDelay(retryCount)
      console.warn(`Network error detected (Backend at ${API_BASE}):`, error.message)
      console.warn(`Retrying in ${delay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`)
      
      await sleep(delay)
      return apiFetch<T>(path, options, retryCount + 1)
    }
    
    if (isNetworkError) {
      console.error(`Final network error reaching backend at ${API_BASE}:`, error)
      throw new Error(`Cannot connect to backend API at ${API_BASE}. Please ensure the backend server is running and CORS is configured correctly.`)
    }
    
    throw error
  }
}

// Polling with retry logic and exponential backoff
export async function pollWithRetry<T>(
  pollFn: () => Promise<T>,
  shouldContinue: (result: T) => boolean,
  options: {
    maxAttempts?: number
    baseInterval?: number
    maxInterval?: number
    backoffMultiplier?: number
  } = {}
): Promise<T> {
  const {
    maxAttempts = 60, // 5 minutes with 5s intervals
    baseInterval = 5000, // 5 seconds
    maxInterval = 30000, // 30 seconds max
    backoffMultiplier = 1.1
  } = options

  let attempt = 0
  let interval = baseInterval

  while (attempt < maxAttempts) {
    try {
      const result = await pollFn()
      
      if (!shouldContinue(result)) {
        return result
      }
      
      // Reset interval on successful request
      interval = baseInterval
      
    } catch (error) {
      console.warn(`Polling attempt ${attempt + 1} failed:`, error)
      
      // Increase interval on failure (exponential backoff)
      interval = Math.min(interval * backoffMultiplier, maxInterval)
    }
    
    attempt++
    
    if (attempt < maxAttempts) {
      await sleep(interval)
    }
  }
  
  throw new Error(`Polling failed after ${maxAttempts} attempts`)
}

export interface BusinessResearchResponse {
  success: number
  request_id: string
  project_name: string
  company_name: string
  business_overview: string
  research_obj: string
  industry: string
  use_case: string
}

export interface SurveyStatusResponse {
  success: number
  status: string
  request_id: string
  project_name: string
  company_name: string
  business_overview: string
  research_objectives: string
  industry: string
  use_case: string
  pages: any[] | string
  doc_link: string
}

export const api = {
  getBusinessResearch: (data: {
    request_id: string
    project_name: string
    company_name: string
    industry: string
    use_case: string
    llm_model: string
  }) =>
    apiFetch<BusinessResearchResponse>('/api/v1/surveys/business-research', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getResearchObjectives: (data: {
    request_id: string
    project_name: string
    company_name: string
    business_overview: string
    industry: string
    use_case: string
    llm_model: string
  }) =>
    apiFetch<{ research_objectives: string }>('/api/v1/surveys/research-objectives', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateSurvey: (data: {
    request_id: string
    project_name: string
    company_name: string
    business_overview: string
    research_objectives: string
    industry: string
    use_case: string
    llm_model: string
  }) =>
    apiFetch<SurveyStatusResponse>('/api/v1/surveys/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSurveyStatus: (requestId: string) =>
    apiFetch<SurveyStatusResponse>(`/api/v1/surveys/status/${requestId}`),

  // Enhanced polling method for survey status with retry logic
  pollSurveyStatus: (requestId: string) =>
    pollWithRetry(
      () => api.getSurveyStatus(requestId),
      (result) => result.status === 'RUNNING' || result.status === 'STARTING',
      {
        maxAttempts: 60, // 5 minutes with 5s base interval
        baseInterval: 5000, // 5 seconds
        maxInterval: 15000, // 15 seconds max
        backoffMultiplier: 1.1
      }
    ),

  // Authentication endpoints
  login: (credentials: { username: string; password: string }) =>
    fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.text().catch(() => `HTTP ${res.status}`)
        throw new Error(error)
      }
      return res.json() as Promise<{ access_token: string; token_type: string }>
    }),

  register: (credentials: { username: string; password: string }) =>
    fetch(`${API_BASE}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.text().catch(() => `HTTP ${res.status}`)
        throw new Error(error)
      }
      return res.json() as Promise<{ access_token: string; token_type: string }>
    }),
}

export function createWebSocket(requestId: string): WebSocket {
  const wsBase = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000')
    .replace(/^http:\/\//, 'ws://')
    .replace(/^https:\/\//, 'wss://')
  return new WebSocket(`${wsBase}/ws/survey/${requestId}`)
}
