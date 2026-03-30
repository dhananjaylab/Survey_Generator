import { getAuthHeader, ensureAuthenticated } from './utils'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

let isRefreshing = false
let refreshPromise: Promise<string> | null = null

async function apiFetch<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  // Ensure authenticated before making request
  try {
    await ensureAuthenticated()
  } catch (error) {
    console.warn('Authentication warning:', error)
    // Continue anyway, might have basic auth or other auth method
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

    // Handle token expiration with automatic refresh
    if (res.status === 401 && !retried) {
      const errorBody = await res.text().catch(() => '')
      if (errorBody.includes('Token has expired')) {
        // Clear stale token and refresh
        if (typeof window !== 'undefined') {
          localStorage.removeItem('survey_token')
        }
        
        // Ensure we have a fresh token
        try {
          await ensureAuthenticated()
          // Retry the original request with new token
          return apiFetch<T>(path, options, true)
        } catch (error) {
          console.error('Failed to refresh token', error)
          throw new Error('Authentication failed')
        }
      }
    }

    if (!res.ok) {
      const err = await res.text().catch(() => `HTTP ${res.status}`)
      throw new Error(err)
    }

    return res.json() as Promise<T>
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout (30s) - backend may be slow or unresponsive')
    }
    throw error
  }
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
}

export function createWebSocket(requestId: string): WebSocket {
  const wsBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
    .replace(/^http:\/\//, 'ws://')
    .replace(/^https:\/\//, 'wss://')
  return new WebSocket(`${wsBase}/ws/survey/${requestId}`)
}
