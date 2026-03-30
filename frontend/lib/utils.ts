import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getAuthHeader(): string {
  // Try to get JWT token from localStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('survey_token')
    if (token) {
      return `Bearer ${token}`
    }
  }
  
  // Fallback to environment variables (for server-side rendering)
  const token = process.env.NEXT_PUBLIC_JWT_TOKEN
  if (token) {
    return `Bearer ${token}`
  }
  
  // Final fallback to Basic Auth headers if available
  const username = process.env.NEXT_PUBLIC_API_USERNAME ?? 'admin'
  const password = process.env.NEXT_PUBLIC_API_PASSWORD ?? 'surveygen2024'
  const encoded =
    typeof window !== 'undefined'
      ? btoa(`${username}:${password}`)
      : Buffer.from(`${username}:${password}`).toString('base64')
  return `Basic ${encoded}`
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    const payload = JSON.parse(atob(parts[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true // Invalid token = expired
  }
}

export async function ensureAuthenticated(): Promise<string> {
  // Check if token exists and is not expired
  if (typeof window !== 'undefined') {
    let token = localStorage.getItem('survey_token')
    if (token && !isTokenExpired(token)) {
      return token
    }
    
    // Clear invalid/expired token
    localStorage.removeItem('survey_token')
    
    // Get a new token from login endpoint
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'default', password: 'default' }),
      })
      if (!res.ok) throw new Error('Login failed')
      const data = await res.json()
      token = data.access_token
      if (token) {
        localStorage.setItem('survey_token', token)
        return token
      }
      throw new Error('No access token in response')
    } catch (error) {
      console.error('Failed to authenticate', error)
      throw error
    }
  }
  
  return ''
}

