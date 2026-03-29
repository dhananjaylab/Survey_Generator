'use client'

import { useEffect, useRef } from 'react'
import { SurveyCreatorModel } from 'survey-creator-core'
import dynamic from 'next/dynamic'

const SurveyCreatorComponent = dynamic(
  () => import('survey-creator-react').then(mod => mod.SurveyCreatorComponent),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin text-2xl mb-4">⚙️</div>
          <p className="text-gray-400">Loading Survey Creator...</p>
        </div>
      </div>
    )
  }
)

interface SurveyCreatorProps {
  initialJson: any
  onChange: (json: any) => void
}

export default function SurveyCreatorWrapper({ initialJson, onChange }: SurveyCreatorProps) {
  const creatorRef = useRef<SurveyCreatorModel | null>(null)

  // Initialize model
  useEffect(() => {
    const model = new SurveyCreatorModel(initialJson || {})
    
    model.onPropertyChanged.add(() => {
      const json = model.JSON
      if (json) {
        onChange(json)
      }
    })

    creatorRef.current = model
  }, [initialJson, onChange])

  if (!creatorRef.current) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Initializing...</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full min-h-96 survey-creator-wrapper">
      <SurveyCreatorComponent model={creatorRef.current} />
    </div>
  )
}
