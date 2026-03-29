'use client'

import { motion } from 'framer-motion'

interface Step {
  label: string
  path: string
  icon: string
}

interface StepIndicatorProps {
  steps: Step[]
  activeStep: number
}

export default function StepIndicator({ steps, activeStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-4 mb-12 flex-wrap">
      {steps.map((step, idx) => (
        <motion.div
          key={step.path}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.1 }}
          className="flex items-center"
        >
          {/* Step Circle */}
          <motion.div
            animate={{
              scale: idx === activeStep ? 1.15 : idx < activeStep ? 0.95 : 1,
              boxShadow:
                idx === activeStep
                  ? '0 0 20px rgba(139, 92, 246, 0.6)'
                  : idx < activeStep
                    ? 'none'
                    : 'none',
            }}
            className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
              idx < activeStep
                ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                : idx === activeStep
                  ? 'glass-card border-violet-400 text-white ring-2 ring-violet-400/30'
                  : 'glass-card border-gray-600 text-gray-400'
            }`}
          >
            {idx < activeStep ? '✓' : step.icon}
          </motion.div>

          {/* Label */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 + 0.05 }}
            className="hidden sm:block ml-3 mr-4"
          >
            <p className={`text-sm font-medium ${idx <= activeStep ? 'text-white' : 'text-gray-500'}`}>
              {step.label}
            </p>
          </motion.div>

          {/* Connector Line */}
          {idx < steps.length - 1 && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: idx * 0.15 + 0.1, duration: 0.6 }}
              className={`hidden sm:block w-16 h-1 origin-left rounded ${
                idx < activeStep
                  ? 'bg-emerald-500/40'
                  : 'bg-gray-700/40'
              }`}
            />
          )}
        </motion.div>
      ))}
    </div>
  )
}
