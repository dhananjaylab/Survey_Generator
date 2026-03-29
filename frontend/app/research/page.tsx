'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import WizardLayout from '@/components/WizardLayout'
import { useWizardStore } from '@/lib/store'
import { api } from '@/lib/api'
import { ArrowRight, ArrowLeft, Loader } from 'lucide-react'

export default function ResearchObjectivesStep() {
  const router = useRouter()
  const setData = useWizardStore((state) => state.setData)
  const wizardData = useWizardStore()

  const [editableOverview, setEditableOverview] = useState(wizardData.businessOverview || '')
  const [editableObjectives, setEditableObjectives] = useState(wizardData.researchObjectives || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!wizardData.businessOverview && !wizardData.researchObjectives) {
      router.push('/')
    }
  }, [wizardData, router])

  const handleNext = async () => {
    setError('')
    setLoading(true)

    try {
      setData({
        businessOverview: editableOverview,
        researchObjectives: editableObjectives,
      })

      // Call research objectives endpoint with edited data
      const response = await api.getResearchObjectives({
        request_id: wizardData.requestId,
        project_name: wizardData.projectName,
        company_name: wizardData.companyName,
        business_overview: editableOverview,
        industry: wizardData.industry,
        use_case: wizardData.useCase,
      })

      setData({
        researchObjectives: response.research_objectives || editableObjectives,
      })

      router.push('/generate')
    } catch (err: any) {
      setError(err.message || 'Failed to proceed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <WizardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        <div className="glass-card p-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Review & Edit Research Objectives
          </h1>
          <p className="text-gray-400">Step 2 of 4: Refine the AI-generated insights</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Overview */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-card p-6"
          >
            <h2 className="text-lg font-semibold mb-4 text-violet-300">Business Overview</h2>
            <textarea
              value={editableOverview}
              onChange={(e) => setEditableOverview(e.target.value)}
              className="w-full h-48 bg-black/40 border border-violet-500/30 rounded p-3 text-white resize-none focus:outline-none focus:border-violet-400"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-2">Edit the business overview as needed</p>
          </motion.div>

          {/* Research Objectives */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-card p-6"
          >
            <h2 className="text-lg font-semibold mb-4 text-violet-300">Research Objectives</h2>
            <textarea
              value={editableObjectives}
              onChange={(e) => setEditableObjectives(e.target.value)}
              className="w-full h-48 bg-black/40 border border-violet-500/30 rounded p-3 text-white resize-none focus:outline-none focus:border-violet-400"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-2">Edit the research objectives as needed</p>
          </motion.div>
        </div>

        {error && (
          <div className="glass-card bg-red-900/20 border-red-500/30 p-4 text-red-300 text-sm">{error}</div>
        )}

        {/* Navigation */}
        <div className="flex gap-4 justify-between">
          <button
            onClick={() => router.push('/')}
            className="btn-ghost flex items-center gap-2"
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button onClick={handleNext} className="btn-gradient flex items-center gap-2" disabled={loading}>
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Generate Survey
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </WizardLayout>
  )
}
