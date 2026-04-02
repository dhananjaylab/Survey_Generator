'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader, LogIn, UserPlus } from 'lucide-react'
import { login, register, isAuthenticated, getRedirectPath } from '@/lib/utils'
import { useAuthStore } from '@/lib/store'

export default function LoginPage() {
  const router = useRouter()
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated)
  
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      const redirectPath = getRedirectPath()
      router.replace(redirectPath)
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!formData.username || !formData.password) {
        setError('Please fill in all fields')
        return
      }

      if (formData.username.length < 3) {
        setError('Username must be at least 3 characters')
        return
      }

      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters')
        return
      }

      let token: string
      if (isLogin) {
        token = await login(formData.username, formData.password)
      } else {
        token = await register(formData.username, formData.password)
      }

      // Update auth state
      setAuthenticated(true, formData.username)

      // Redirect to original page or home
      const redirectPath = getRedirectPath()
      router.replace(redirectPath)

    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError('')
    setFormData({ username: '', password: '' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8 space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-gray-400">
              {isLogin 
                ? 'Sign in to continue to Survey Generator' 
                : 'Sign up to start creating surveys'
              }
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="field-label">Username</label>
              <input
                type="text"
                placeholder="Enter your username"
                className="input-field"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={loading}
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="input-field pr-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={loading}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {!isLogin && (
                <p className="text-xs text-gray-500 mt-1">
                  Password must be at least 8 characters
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-500/30">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  {isLogin ? 'Signing In...' : 'Creating Account...'}
                </>
              ) : (
                <>
                  {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="text-center pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
            </p>
            <button
              onClick={toggleMode}
              disabled={loading}
              className="text-violet-400 hover:text-violet-300 transition-colors font-medium mt-1"
            >
              {isLogin ? 'Create Account' : 'Sign In'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}