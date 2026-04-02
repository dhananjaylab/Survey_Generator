'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import WizardLayout from '@/components/WizardLayout'
import { ExportMenu } from '@/components/ExportMenu'
import { SurveyPreview } from '@/components/SurveyPreview'
import { useWizardStore } from '@/lib/store'
import { Download, Eye, ArrowLeft } from 'lucide-react'

// Dynamic import to avoid SSR issues
const SurveyCreator = dynamic(() => import('@/components/SurveyCreator'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="text-4xl mb-4">⚙️</div>
        <p className="text-gray-400">Loading SurveyJS Editor...</p>
      </div>
    </div>
  ),
})

export default function SurveyBuilderStep() {
  const router = useRouter()
  const wizardData = useWizardStore()
  const [surveyJson, setSurveyJson] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showExport, setShowExport] = useState(false)

  useEffect(() => {
    if (!wizardData.surveyPages || wizardData.surveyPages.length === 0) {
      router.push('/generate')
      return
    }

    // Initialize survey JSON from pages
    try {
      const pages = Array.isArray(wizardData.surveyPages)
        ? wizardData.surveyPages
        : JSON.parse(wizardData.surveyPages)

      setSurveyJson({
        pages: pages,
        showQuestionNumbers: false,
        showProgressBar: 'top',
        progressBarType: 'questions',
        checkErrorsMode: 'onValueChanged',
      })
    } catch (error) {
      console.error('Failed to parse survey pages:', error)
      setSurveyJson({
        pages: [
          {
            name: 'page1',
            elements: [
              {
                type: 'text',
                name: 'q1',
                title: 'Sample Question',
              },
            ],
          },
        ],
      })
    }
  }, [wizardData, router])

  const handleSurveyChange = (newJson: any) => {
    setSurveyJson(newJson)
  }

  return (
    <WizardLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-full flex flex-col"
      >
        {/* Header */}
        <div className="glass-card p-6 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Survey Builder
            </h1>
            <p className="text-gray-400">Step 4 of 4: Drag, drop, and customize your survey</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(true)}
              className="btn-ghost flex items-center gap-2"
              title="Preview survey"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button onClick={() => setShowExport(true)} className="btn-gradient flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 glass-card p-6 overflow-auto min-h-96 flex flex-col">
          {surveyJson && <SurveyCreator initialJson={surveyJson} onChange={handleSurveyChange} />}
        </div>

        {/* Footer Navigation */}
        <div className="glass-card p-6 mt-6 flex justify-between">
          <button onClick={() => router.push('/generate')} className="btn-ghost flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="btn-gradient flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Your Survey
          </button>
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <SurveyPreview
            surveyJson={surveyJson}
            onClose={() => setShowPreview(false)}
          />
        )}

        {/* Export Menu */}
        {showExport && (
          <ExportMenu
            surveyJson={surveyJson}
            onClose={() => setShowExport(false)}
            docLink={wizardData.docLink}
          />
        )}
      </motion.div>
    </WizardLayout>
  )
}
