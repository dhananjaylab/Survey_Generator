import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getAuthHeader(): string {
  const username = process.env.NEXT_PUBLIC_API_USERNAME ?? 'admin'
  const password = process.env.NEXT_PUBLIC_API_PASSWORD ?? 'surveygen2024'
  const encoded =
    typeof window !== 'undefined'
      ? btoa(`${username}:${password}`)
      : Buffer.from(`${username}:${password}`).toString('base64')
  return `Basic ${encoded}`
}
