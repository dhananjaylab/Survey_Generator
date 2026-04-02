'use client'

import { useEffect, useRef, useState } from 'react'
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

// Separate component to isolate model state and rendering
function ModelRendererWrapper({ model, onChange }: { model: SurveyCreatorModel; onChange: (json: any) => void }) {
  const onChangeRef = useRef(onChange)
  const listenerRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!model) {
      console.error('Model is null in ModelRendererWrapper')
      return
    }

    try {
      // Create listener function
      const handlePropertyChanged = () => {
        try {
          const json = model.JSON
          if (json && onChangeRef.current) {
            onChangeRef.current(json)
          }
        } catch (e) {
          console.error('Error in property change handler:', e)
        }
      }

      // Add listener
      model.onPropertyChanged.add(handlePropertyChanged)
      listenerRef.current = handlePropertyChanged

      return () => {
        // Clean up listener
        if (listenerRef.current && model?.onPropertyChanged) {
          try {
            model.onPropertyChanged.remove(listenerRef.current)
          } catch (e) {
            console.error('Error removing listener:', e)
          }
        }
      }
    } catch (e) {
      console.error('Error setting up model listener:', e)
    }
  }, [model])

  return (
    <div className="w-full h-full min-h-96 survey-creator-wrapper">
      <SurveyCreatorComponent model={model} />
    </div>
  )
}

export default function SurveyCreatorWrapper({ initialJson, onChange }: SurveyCreatorProps) {
  const [model, setModel] = useState<SurveyCreatorModel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initRef = useRef(false)

  useEffect(() => {
    // Prevent double initialization in React strict mode
    if (initRef.current) return
    initRef.current = true

    const createModel = () => {
      try {
        console.log('Creating SurveyCreatorModel...')
        const newModel = new SurveyCreatorModel(initialJson ?? {})
        
        if (!newModel) {
          throw new Error('SurveyCreatorModel creation returned null')
        }

        console.log('Model created successfully:', newModel)
        setModel(newModel)
        setError(null)
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to create SurveyCreatorModel:', err)
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize creator'
        setError(errorMsg)
        setModel(null)
        setIsLoading(false)
      }
    }

    // Use setTimeout to defer model creation slightly
    const timer = setTimeout(createModel, 0)

    return () => {
      clearTimeout(timer)
    }
  }, [initialJson])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin text-2xl mb-4">⚙️</div>
          <p className="text-gray-400">Initializing Survey Editor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-500 text-2xl mb-2">⚠️</div>
          <p className="text-gray-300 font-medium">Failed to Initialize Survey Creator</p>
          <p className="text-gray-500 text-sm mt-2">{error}</p>
        </div>
      </div>
    )
  }

  if (!model) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-yellow-500 text-2xl mb-2">⚠️</div>
          <p className="text-gray-300">Survey Creator model unavailable</p>
        </div>
      </div>
    )
  }

  return <ModelRendererWrapper model={model} onChange={onChange} />
}
