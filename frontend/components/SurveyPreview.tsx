'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Model } from 'survey-core'
import { Survey } from 'survey-react-ui'
import { X } from 'lucide-react'

interface SurveyPreviewProps {
  surveyJson: any
  onClose: () => void
}

export function SurveyPreview({ surveyJson, onClose }: SurveyPreviewProps) {
  const survey = new Model(surveyJson)
  const [responses, setResponses] = useState({})

  const handleComplete = (result: any) => {
    setResponses(result.data)
    alert('Survey complete! Responses: ' + JSON.stringify(result.data))
  }

  survey.onComplete.add(handleComplete)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-dark-bg w-full max-w-2xl max-h-96 overflow-auto rounded-lg shadow-2xl p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-violet-300">Survey Preview</h2>

        <div className="survey-container bg-white p-4 rounded">
          <Survey model={survey} />
        </div>
      </motion.div>
    </motion.div>
  )
}
