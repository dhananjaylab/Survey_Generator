'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Download, X, FileText, Sheet, Code } from 'lucide-react'
import { exportToDocx, exportToQualtrics, exportToTypeform } from '@/lib/exportUtils'

interface ExportMenuProps {
  surveyJson: any
  onClose: () => void
  docLink?: string
}

export function ExportMenu({ surveyJson, onClose, docLink }: ExportMenuProps) {
  const [exporting, setExporting] = useState(false)
  const [exportType, setExportType] = useState<'docx' | 'qualtrics' | 'typeform' | null>(null)

  const handleExport = async (type: 'docx' | 'qualtrics' | 'typeform') => {
    setExporting(true)
    setExportType(type)
    try {
      switch (type) {
        case 'docx':
          // If we have a pre-generated DOCX link from backend
          if (docLink) {
            window.open(docLink, '_blank')
          } else {
            await exportToDocx(surveyJson)
          }
          break
        case 'qualtrics':
          await exportToQualtrics(surveyJson)
          break
        case 'typeform':
          await exportToTypeform(surveyJson)
          break
      }
      // Close after successful export
      setTimeout(onClose, 500)
    } catch (error) {
      console.error('Export failed:', error)
      alert(`Export failed: ${error}`)
    } finally {
      setExporting(false)
      setExportType(null)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="glass-card p-8 w-full max-w-md relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-bold mb-6 text-violet-300 flex items-center gap-2">
            <Download className="w-6 h-6" />
            Export Survey
          </h2>

          <div className="space-y-3">
            {/* DOCX Export */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleExport('docx')}
              disabled={exporting && exportType === 'docx'}
              className="w-full btn-gradient flex items-center gap-3 justify-center py-3 text-lg font-semibold"
            >
              {exporting && exportType === 'docx' ? (
                <>
                  <div className="animate-spin">⌛</div>
                  Exporting...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Export as DOCX
                </>
              )}
            </motion.button>

            {/* Qualtrics Export */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleExport('qualtrics')}
              disabled={exporting && exportType === 'qualtrics'}
              className="w-full glass-card border border-indigo-500/30 p-3 text-center font-semibold text-indigo-300 hover:bg-indigo-900/20 transition flex items-center gap-3 justify-center"
            >
              {exporting && exportType === 'qualtrics' ? (
                <>
                  <div className="animate-spin">⌛</div>
                  Exporting...
                </>
              ) : (
                <>
                  <Code className="w-5 h-5" />
                  Export to Qualtrics (JSON)
                </>
              )}
            </motion.button>

            {/* Typeform Export */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleExport('typeform')}
              disabled={exporting && exportType === 'typeform'}
              className="w-full glass-card border border-sky-500/30 p-3 text-center font-semibold text-sky-300 hover:bg-sky-900/20 transition flex items-center gap-3 justify-center"
            >
              {exporting && exportType === 'typeform' ? (
                <>
                  <div className="animate-spin">⌛</div>
                  Exporting...
                </>
              ) : (
                <>
                  <Sheet className="w-5 h-5" />
                  Export to Typeform (CSV)
                </>
              )}
            </motion.button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-6">
            💡 You can download your survey in multiple formats for use in other platforms.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
