'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import WizardLayout from '@/components/WizardLayout'
import { useWizardStore } from '@/lib/store'
import { generateRequestId } from '@/lib/utils'
import { api } from '@/lib/api'
import { ArrowRight, Loader } from 'lucide-react'

const INDUSTRIES = [
  'Healthcare',
  'Finance',
  'Retail',
  'Technology',
  'Manufacturing',
  'Hospitality',
  'Education',
  'Other',
]

const USE_CASES = [
  'Customer Satisfaction',
  'Market Research',
  'Product Feedback',
  'Employee Engagement',
  'Brand Awareness',
  'Lead Generation',
  'Other',
]

export default function ProjectDetailsStep() {
  const router = useRouter()
  const setData = useWizardStore((state) => state.setData)
  const wizardData = useWizardStore()

  const [formData, setFormData] = useState({
    companyName: wizardData.companyName || '',
    projectName: wizardData.projectName || '',
    industry: wizardData.industry || '',
    useCase: wizardData.useCase || '',
  })

  const [selectedLLM, setSelectedLLM] = useState(wizardData.selectedLLM || 'gpt')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!formData.companyName || !formData.projectName || !formData.industry || !formData.useCase) {
        setError('Please fill in all fields')
        setLoading(false)
        return
      }

      const requestId = generateRequestId()
      setData({
        requestId,
        companyName: formData.companyName,
        projectName: formData.projectName,
        industry: formData.industry,
        useCase: formData.useCase,
        selectedLLM: selectedLLM,
      })

      // Generate business overview with selected LLM
      const response = await api.getBusinessResearch({
        request_id: requestId,
        project_name: formData.projectName,
        company_name: formData.companyName,
        industry: formData.industry,
        use_case: formData.useCase,
        llm_model: selectedLLM,
      })

      setData({
        businessOverview: response.business_overview,
        researchObjectives: response.research_obj,
      })

      router.push('/research')
    } catch (err: any) {
      console.error('API Error:', err)
      
      // Handle specific error types
      if (err.message.includes('Authentication')) {
        setError('Please log in to continue')
      } else if (err.message.includes('Too many requests')) {
        setError('Too many requests. Please try again later.')
      } else {
        setError(err.message || 'Failed to generate business overview')
      }
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
        className="max-w-2xl mx-auto"
      >
        <div className="glass-card p-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Let's Create Your Survey
            </h1>
            <p className="text-gray-400">Step 1 of 4: Tell us about your project</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Name */}
            <div>
              <label className="field-label">Company Name</label>
              <input
                type="text"
                placeholder="e.g., Acme Corporation"
                className="input-field"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                disabled={loading}
              />
            </div>

            {/* Project Name */}
            <div>
              <label className="field-label">Project Name</label>
              <input
                type="text"
                placeholder="e.g., Q3 Customer Feedback Initiative"
                className="input-field"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                disabled={loading}
              />
            </div>

            {/* Industry */}
            <div>
              <label className="field-label">Industry</label>
              <select
                className="select-field"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                disabled={loading}
              >
                <option value="">Select an industry</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            {/* Use Case */}
            <div>
              <label className="field-label">Use Case</label>
              <select
                className="select-field"
                value={formData.useCase}
                onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                disabled={loading}
              >
                <option value="">Select a use case</option>
                {USE_CASES.map((uc) => (
                  <option key={uc} value={uc}>
                    {uc}
                  </option>
                ))}
              </select>
            </div>

            {/* LLM Model Selection */}
            <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/30 rounded-lg p-4">
              <label className="field-label">AI Model</label>
              <p className="text-gray-400 text-sm mb-3">Choose which AI model to use for generating your survey:</p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded border border-violet-500/20 hover:bg-violet-500/5 transition">
                  <input
                    type="radio"
                    name="llm-model"
                    value="gpt"
                    checked={selectedLLM === 'gpt'}
                    onChange={(e) => setSelectedLLM(e.target.value)}
                    disabled={loading}
                    className="w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold text-white">GPT-4O Mini (OpenAI)</span>
                    <p className="text-xs text-gray-500">Fastest & most cost-effective model</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded border border-violet-500/20 hover:bg-violet-500/5 transition">
                  <input
                    type="radio"
                    name="llm-model"
                    value="gemini"
                    checked={selectedLLM === 'gemini'}
                    onChange={(e) => setSelectedLLM(e.target.value)}
                    disabled={loading}
                    className="w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold text-white">Gemini 2.0 Flash (Google)</span>
                    <p className="text-xs text-gray-500">Latest multimodal capabilities</p>
                  </div>
                </label>
              </div>
            </div>

            {error && <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded">{error}</div>}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-gradient flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Next: Research Objectives
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </WizardLayout>
  )
}
