'use client'

import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, User } from 'lucide-react'
import StepIndicator from './StepIndicator'
import { logout } from '@/lib/utils'
import { useAuthStore } from '@/lib/store'

const STEPS = [
  { label: 'Project Details', path: '/', icon: '📋' },
  { label: 'Research Objectives', path: '/research', icon: '🔬' },
  { label: 'Generate Survey', path: '/generate', icon: '⚡' },
  { label: 'Survey Builder', path: '/builder', icon: '🎨' },
]

export default function WizardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const currentStep = STEPS.findIndex((s) => s.path === pathname)
  const activeStep = currentStep >= 0 ? currentStep : 0
  const { username } = useAuthStore()

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      logout()
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 md:py-12">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center mb-8 md:mb-12 relative w-full max-w-3xl"
      >
        {/* User info and logout button */}
        <div className="absolute top-0 right-0 flex items-center gap-2 text-sm text-gray-400">
          <User className="w-4 h-4" />
          <span>{username}</span>
          <button
            onClick={handleLogout}
            className="ml-2 p-1 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400 bg-clip-text text-transparent mb-3">
          🤖 Knit AI Survey Generator
        </h1>
        <p className="text-[var(--text-secondary)] text-base md:text-lg max-w-xl mx-auto">
          Create bespoke, AI-powered survey designs in minutes.
        </p>
      </motion.header>

      {/* Step Indicator */}
      <StepIndicator steps={STEPS} activeStep={activeStep} />

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-3xl"
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </div>
  )
}
