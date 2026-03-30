'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import WizardLayout from '@/components/WizardLayout'
import { ProgressStream } from '@/components/ProgressStream'
import { useWizardStore } from '@/lib/store'
import { api, createWebSocket } from '@/lib/api'
import { Loader, CheckCircle } from 'lucide-react'

const STEPS = [
  { id: 'drafting', label: 'Drafting questions', icon: '📝' },
  { id: 'variants', label: 'Adding variants', icon: '🔀' },
  { id: 'choices', label: 'Fleshing choices', icon: '✨' },
  { id: 'docx', label: 'Generating DOCX', icon: '📄' },
]

export default function GenerateSurveyStep() {
  const router = useRouter()
  const setData = useWizardStore((state) => state.setData)
  const wizardData = useWizardStore()

  const [status, setStatus] = useState('STARTING')
  const [progress, setProgress] = useState<string[]>([])
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (!wizardData.requestId) {
      router.push('/')
      return
    }

    const initiateGeneration = async () => {
      try {
        // Trigger survey generation
        const response = await api.generateSurvey({
          request_id: wizardData.requestId,
          project_name: wizardData.projectName,
          company_name: wizardData.companyName,
          business_overview: wizardData.businessOverview,
          research_objectives: wizardData.researchObjectives,
          industry: wizardData.industry,
          use_case: wizardData.useCase,
          llm_model: wizardData.selectedLLM || 'gpt',
        })

        setStatus(response.status)
        if (response.pages) {
          const pages = typeof response.pages === 'string' 
            ? JSON.parse(response.pages)
            : response.pages
          setData({ surveyPages: Array.isArray(pages) ? pages : [pages] })
        }

        // Connect to WebSocket for live progress
        connectWebSocket()
      } catch (err: any) {
        setError(err.message || 'Failed to start survey generation')
      }
    }

    initiateGeneration()
  }, [wizardData, router, setData])

  const connectWebSocket = () => {
    const ws = createWebSocket(wizardData.requestId)

    ws.onopen = () => {
      addProgress('Connected to generation stream')
    }

    ws.onmessage = (event) => {
      const message = event.data
      addProgress(message)

      // Detect step progression
      if (message.includes('drafting')) setCurrentStep(0)
      if (message.includes('variant')) setCurrentStep(1)
      if (message.includes('choice')) setCurrentStep(2)
      if (message.includes('DOCX')) setCurrentStep(3)
      if (message.includes('SUCCESS')) {
        setStatus('COMPLETED')
        // Poll final status
        setTimeout(pollStatus, 1000)
      }
    }

    ws.onerror = (error) => {
      addProgress(`WebSocket error: ${error}`)
      // Fallback to polling
      startPolling()
    }

    ws.onclose = () => {
      addProgress('Connection closed, switching to polling...')
      startPolling()
    }
  }

  const addProgress = (message: string) => {
    setProgress((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const startPolling = () => {
    let pollAttempts = 0
    const MAX_ATTEMPTS = 300 // 10 minutes at 2 second intervals
    
    const pollInterval = setInterval(async () => {
      pollAttempts++
      
      // Safety timeout after 10 minutes
      if (pollAttempts > MAX_ATTEMPTS) {
        clearInterval(pollInterval)
        addProgress('⚠️ Timeout: Survey generation took too long (10+ minutes)')
        setStatus('TIMEOUT')
        return
      }
      
      try {
        const response = await api.getSurveyStatus(wizardData.requestId)
        setStatus(response.status)

        if (response.pages && !wizardData.surveyPages.length) {
          const pages = typeof response.pages === 'string' 
            ? JSON.parse(response.pages)
            : response.pages
          setData({ surveyPages: Array.isArray(pages) ? pages : [pages] })
        }
        if (response.doc_link) {
          setData({ docLink: response.doc_link })
        }

        if (response.status === 'COMPLETED') {
          addProgress('✅ Survey generation completed successfully!')
          setCurrentStep(4)
          clearInterval(pollInterval)
          setTimeout(() => router.push('/builder'), 2000)
        }
        
        if (response.status === 'FAILED') {
          addProgress('❌ Survey generation failed on backend')
          clearInterval(pollInterval)
        }
      } catch (err: any) {
        console.error(`Polling error (attempt ${pollAttempts}/${MAX_ATTEMPTS}):`, err)
        addProgress(`⚠️ Polling error (attempt ${pollAttempts}): ${err?.message || 'Unknown error'}`)
        
        // Stop polling after too many errors
        if (pollAttempts > 10) {
          clearInterval(pollInterval)
          addProgress('❌ Polling failed after 10 attempts. Please check backend logs.')
        }
      }
    }, 2000)
  }

  const pollStatus = async () => {
    try {
      const response = await api.getSurveyStatus(wizardData.requestId)
      if (response.pages) {
        const pages = typeof response.pages === 'string' 
          ? JSON.parse(response.pages)
          : response.pages
        setData({ surveyPages: Array.isArray(pages) ? pages : [pages] })
      }
      if (response.doc_link) {
        setData({ docLink: response.doc_link })
      }
      setTimeout(() => router.push('/builder'), 1500)
    } catch (err: any) {
      console.error('Failed to fetch final status:', err)
      // Try again
      setTimeout(pollStatus, 2000)
    }
  }

  return (
    <WizardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto space-y-6"
      >
        <div className="glass-card p-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Generating Your Survey
          </h1>
          <p className="text-gray-400">Step 3 of 4: AI is crafting your questions...</p>
        </div>

        {/* Animated Step Stepper */}
        <div className="glass-card p-8">
          <div className="space-y-4">
            {STEPS.map((step, idx) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                  idx < currentStep
                    ? 'bg-green-900/20 border border-green-500/30'
                    : idx === currentStep
                      ? 'bg-violet-900/20 border border-violet-500/30 ring-2 ring-violet-400/20'
                      : 'bg-gray-900/20 border border-gray-700/30'
                }`}
              >
                <div className="text-2xl">{step.icon}</div>
                <div className="flex-1">
                  <p className="font-semibold">{step.label}</p>
                  <p className="text-xs text-gray-400">
                    {idx < currentStep ? 'Complete' : idx === currentStep ? 'In progress' : 'Pending'}
                  </p>
                </div>
                {idx < currentStep && <CheckCircle className="w-6 h-6 text-green-400" />}
                {idx === currentStep && <Loader className="w-6 h-6 text-violet-400 animate-spin" />}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Progress Stream */}
        <ProgressStream messages={progress} />

        {error && (
          <div className="glass-card bg-red-900/20 border-red-500/30 p-4 text-red-300 text-sm">{error}</div>
        )}

        {status === 'COMPLETED' && (
          <div className="glass-card bg-green-900/20 border-green-500/30 p-4">
            <p className="text-green-300 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Survey generated successfully! Redirecting to builder...
            </p>
          </div>
        )}
      </motion.div>
    </WizardLayout>
  )
}
