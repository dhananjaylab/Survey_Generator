// frontend/src/components/wizard/SurveyWizard.tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Sparkles, FileText, Target } from 'lucide-react';
import { useWizardStore } from '@/stores/wizardStore';
import { useSurveyGeneration } from '@/hooks/useSurveyGeneration';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface WizardStep {
  id: number;
  title: string;
  icon: React.ReactNode;
  description: string;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 1,
    title: 'Project Details',
    icon: <FileText className="w-5 h-5" />,
    description: 'Basic information about your project',
  },
  {
    id: 2,
    title: 'Research Goals',
    icon: <Target className="w-5 h-5" />,
    description: 'Define your research objectives',
  },
  {
    id: 3,
    title: 'Survey Generation',
    icon: <Sparkles className="w-5 h-5" />,
    description: 'AI generates your custom survey',
  },
];

export function SurveyWizard() {
  const router = useRouter();
  const { currentStep, setCurrentStep, formData } = useWizardStore();
  const { generateSurvey, isGenerating, progress } = useSurveyGeneration();

  const handleNext = useCallback(async () => {
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1);
      
      // If moving to final step, trigger survey generation
      if (currentStep === 2) {
        await generateSurvey(formData);
      }
    }
  }, [currentStep, formData, generateSurvey, setCurrentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, setCurrentStep]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            AI Survey Generator
          </h1>
          <p className="text-gray-600 text-lg">
            Create professional surveys in minutes with AI assistance
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute left-0 top-5 h-1 bg-gray-200 w-full -z-10" />
            <motion.div
              className="absolute left-0 top-5 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 -z-10"
              initial={{ width: '0%' }}
              animate={{ width: `${((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.3 }}
            />

            {WIZARD_STEPS.map((step, index) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div key={step.id} className="flex flex-col items-center relative flex-1">
                  <motion.div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                      isCompleted && 'bg-gradient-to-r from-indigo-500 to-purple-500 border-transparent',
                      isCurrent && 'bg-white border-indigo-500 shadow-lg scale-110',
                      !isCompleted && !isCurrent && 'bg-white border-gray-300'
                    )}
                    whileHover={{ scale: 1.1 }}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <span className={cn(
                        'text-sm font-semibold',
                        isCurrent ? 'text-indigo-600' : 'text-gray-400'
                      )}>
                        {step.id}
                      </span>
                    )}
                  </motion.div>

                  <div className="mt-3 text-center">
                    <p className={cn(
                      'text-sm font-medium transition-colors',
                      isCurrent ? 'text-indigo-600' : 'text-gray-500'
                    )}>
                      {step.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card Container */}
        <motion.div
          className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Card Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
            <div className="flex items-center space-x-3 text-white">
              {WIZARD_STEPS[currentStep - 1].icon}
              <div>
                <h2 className="text-2xl font-bold">
                  {WIZARD_STEPS[currentStep - 1].title}
                </h2>
                <p className="text-indigo-100 mt-1">
                  {WIZARD_STEPS[currentStep - 1].description}
                </p>
              </div>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Step content will be rendered here */}
                {currentStep === 1 && <ProjectDetailsStep />}
                {currentStep === 2 && <ResearchObjectivesStep />}
                {currentStep === 3 && (
                  <GenerationStep 
                    isGenerating={isGenerating} 
                    progress={progress} 
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Card Footer */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isGenerating}
              className="px-6"
            >
              Previous
            </Button>

            <Button
              onClick={handleNext}
              disabled={isGenerating || currentStep === WIZARD_STEPS.length}
              className="px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : currentStep === WIZARD_STEPS.length ? (
                'Complete'
              ) : (
                'Next'
              )}
            </Button>
          </div>
        </motion.div>

        {/* Progress Indicator for Generation */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                Survey Generation Progress
              </span>
              <span className="text-sm font-semibold text-indigo-600">
                {progress}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-gray-500 mt-2">
              The AI is analyzing your requirements and generating questions...
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Step Components (simplified - you'll expand these)
function ProjectDetailsStep() {
  return <div>Project details form...</div>;
}

function ResearchObjectivesStep() {
  return <div>Research objectives form...</div>;
}

function GenerationStep({ isGenerating, progress }: { isGenerating: boolean; progress: number }) {
  return (
    <div className="text-center py-12">
      {isGenerating ? (
        <div className="space-y-6">
          <Loader2 className="w-16 h-16 mx-auto text-indigo-600 animate-spin" />
          <h3 className="text-xl font-semibold">Creating Your Survey</h3>
          <p className="text-gray-600">
            Our AI is analyzing your business context and generating relevant questions...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <Check className="w-16 h-16 mx-auto text-green-500" />
          <h3 className="text-xl font-semibold">Survey Generated!</h3>
          <p className="text-gray-600">Your survey is ready to review and download.</p>
        </div>
      )}
    </div>
  );
}
