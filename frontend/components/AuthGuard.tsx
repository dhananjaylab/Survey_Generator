'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, redirectToLogin } from '@/lib/utils'
import { useAuthStore } from '@/lib/store'
import { Loader } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: Readonly<AuthGuardProps>) {
  const { isAuthenticated: authStoreState, setAuthenticated } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated()
      
      if (!authenticated) {
        // Clear auth state and redirect to login
        setAuthenticated(false)
        redirectToLogin()
        return
      }
      
      // Update auth state if not already set
      if (!authStoreState) {
        setAuthenticated(true)
      }
      
      setIsChecking(false)
    }

    checkAuth()
  }, [authStoreState, setAuthenticated])

  // Show loading spinner while checking authentication
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-violet-400 mx-auto mb-4" />
          <p className="text-gray-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}