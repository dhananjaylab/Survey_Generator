import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// JWT Token Management
const TOKEN_KEY = 'survey_jwt_token'

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

export function getAuthHeader(): string {
  const token = getStoredToken()
  if (token) {
    return `Bearer ${token}`
  }
  
  // Fallback to environment variables (for development/testing)
  const envToken = process.env.NEXT_PUBLIC_JWT_TOKEN
  if (envToken) {
    return `Bearer ${envToken}`
  }
  
  // No token available
  return ''
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    
    const payload = JSON.parse(atob(parts[1]))
    const currentTime = Math.floor(Date.now() / 1000)
    
    // Add 30 second buffer to prevent edge cases
    return payload.exp < (currentTime + 30)
  } catch {
    return true // Invalid token = expired
  }
}

export function isAuthenticated(): boolean {
  const token = getStoredToken()
  return token !== null && !isTokenExpired(token)
}

export function redirectToLogin(): void {
  if (typeof window === 'undefined') return
  
  // Store current path to redirect back after login
  const currentPath = window.location.pathname + window.location.search
  if (currentPath !== '/login') {
    localStorage.setItem('redirect_after_login', currentPath)
  }
  
  // Redirect to login page
  window.location.href = '/login'
}

export function getRedirectPath(): string {
  if (typeof window === 'undefined') return '/'
  
  const redirectPath = localStorage.getItem('redirect_after_login')
  if (redirectPath) {
    localStorage.removeItem('redirect_after_login')
    return redirectPath
  }
  
  return '/'
}

export async function ensureAuthenticated(): Promise<string> {
  const token = getStoredToken()
  
  if (token && !isTokenExpired(token)) {
    return token
  }
  
  // Clear invalid/expired token
  clearAuthToken()
  
  // Redirect to login instead of trying to auto-authenticate
  throw new Error('Authentication required')
}

// Login function
export async function login(username: string, password: string): Promise<string> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  
  try {
    const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Login failed')
      
      if (response.status === 401) {
        throw new Error('Invalid username or password')
      } else if (response.status === 429) {
        throw new Error('Too many login attempts. Please try again later.')
      } else {
        throw new Error(errorText)
      }
    }
    
    const data = await response.json()
    const token = data.access_token
    
    if (!token) {
      throw new Error('No access token received')
    }
    
    setStoredToken(token)
    return token
    
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Network error - please check your connection')
  }
}

// Register function
export async function register(username: string, password: string): Promise<string> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  
  try {
    const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Registration failed')
      
      if (response.status === 400) {
        throw new Error('Username already exists or invalid input')
      } else if (response.status === 422) {
        throw new Error('Username must be 3-255 characters, password must be at least 8 characters')
      } else if (response.status === 429) {
        throw new Error('Too many registration attempts. Please try again later.')
      } else {
        throw new Error(errorText)
      }
    }
    
    const data = await response.json()
    const token = data.access_token
    
    if (!token) {
      throw new Error('No access token received')
    }
    
    setStoredToken(token)
    return token
    
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Network error - please check your connection')
  }
}

// Logout function
export function logout(): void {
  clearAuthToken()
  
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

