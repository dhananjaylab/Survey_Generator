import { getAuthHeader, ensureAuthenticated } from './utils'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Ensure authenticated before making request
  try {
    await ensureAuthenticated()
  } catch (error) {
    console.warn('Authentication warning:', error)
    // Continue anyway, might have basic auth or other auth method
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
      ...(options.headers as Record<string, string>),
    },
  })
  if (!res.ok) {
    const err = await res.text().catch(() => `HTTP ${res.status}`)
    throw new Error(err)
  }
  return res.json() as Promise<T>
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
