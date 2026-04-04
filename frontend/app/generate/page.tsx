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

  const [initiated, setInitiated] = useState(false)
  const [status, setStatus] = useState('STARTING')
  const [progress, setProgress] = useState<string[]>([])
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  
  useEffect(() => {
    if (!wizardData.requestId) {
      router.push('/')
      return
    }

    // Only initiate once
    if (initiated) return
    setInitiated(true)

    const initiateGeneration = async () => {
      try {
        addProgress('🚀 Initializing survey generation...')
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
        console.error('Generation error:', err)
        setError(err.message || 'Failed to start survey generation')
        // If we get a 429, we should still try to connect WS or poll if it's already running
        if (err.message?.includes('429') || err.message?.includes('Too many requests')) {
           addProgress('⚠️ Rate limit hit, but generation may be in progress. Connecting to stream...')
           connectWebSocket()
        }
      }
    }

    initiateGeneration()
  }, [wizardData.requestId, initiated, router, setData])

  const connectWebSocket = () => {
    // Prevent multiple connections
    if (typeof window !== 'undefined' && (window as any)._currentWS) {
       (window as any)._currentWS.close()
    }

    const ws = createWebSocket(wizardData.requestId)
    if (typeof window !== 'undefined') (window as any)._currentWS = ws

    ws.onopen = () => {
      addProgress('📡 Connected to live generation stream')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const update = data.update || data.message || event.data
        
        if (typeof update === 'string') {
          addProgress(update)

          // Detect step progression
          if (update.includes('Drafting')) setCurrentStep(0)
          if (update.includes('Adding')) setCurrentStep(1)
          if (update.includes('choices')) setCurrentStep(2)
          if (update.includes('DOCX')) setCurrentStep(3)
          
          if (update === 'SUCCESS' || data.completed) {
            addProgress('✨ AI has finished crafting your survey!')
            setStatus('COMPLETED')
            setCurrentStep(4)
            // Poll final status to get the data
            setTimeout(pollStatus, 500)
          }
        }
      } catch (e) {
        // Fallback for non-json messages
        addProgress(event.data)
        if (event.data === 'SUCCESS') {
           setStatus('COMPLETED')
           setCurrentStep(4)
           setTimeout(pollStatus, 500)
        }
      }
    }

    ws.onerror = (error) => {
      console.warn('WebSocket error:', error)
      addProgress('⚠️ Connection interrupted, switching to adaptive polling...')
      startPolling()
    }

    ws.onclose = (event) => {
      if (!event.wasClean) {
        addProgress('🔌 Connection lost, retrying via polling...')
        startPolling()
      }
    }
  }

  const addProgress = (message: string) => {
    if (!message) return
    setProgress((prev) => {
      // Don't add duplicate messages
      if (prev.length > 0) {
        const last = prev[prev.length - 1]
        if (last.endsWith(message)) return prev
      }
      return [...prev, `${new Date().toLocaleTimeString()}: ${message}`]
    })
  }

  const startPolling = async () => {
    try {
      addProgress('🔄 Polling for updates...')
      const response = await api.pollSurveyStatus(wizardData.requestId)
      
      setStatus(response.status)
      updateWizardData(response)
      
      if (response.status === 'COMPLETED') {
        addProgress('✅ Survey generation completed!')
        setCurrentStep(4)
        setTimeout(() => router.push('/builder'), 1500)
      } else if (response.status === 'FAILED') {
        setError('Generation failed. Please try again or check logs.')
      }
    } catch (err: any) {
      console.error('Polling failed:', err)
      setError(err?.message || 'Failed to poll survey status')
    }
  }

  const updateWizardData = (response: any) => {
    if (response.pages) {
      const pages = typeof response.pages === 'string' 
        ? JSON.parse(response.pages)
        : response.pages
      if (Array.isArray(pages) && pages.length > 0) {
        setData({ surveyPages: pages })
      }
    }
    if (response.doc_link) {
      setData({ docLink: response.doc_link })
    }
  }

  const pollStatus = async () => {
    try {
      const response = await api.getSurveyStatus(wizardData.requestId)
      updateWizardData(response)
      if (response.status === 'COMPLETED') {
        setTimeout(() => router.push('/builder'), 1000)
      } else {
        // Not completed yet, try again
        setTimeout(pollStatus, 2000)
      }
    } catch (err: any) {
      console.error('Final status poll failed:', err)
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
