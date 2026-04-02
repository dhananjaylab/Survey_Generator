'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Loader } from 'lucide-react'

interface ProgressStreamProps {
  messages: string[]
}

export function ProgressStream({ messages }: ProgressStreamProps) {
  return (
    <div className="glass-card p-6 space-y-2">
      <h3 className="text-sm font-semibold text-violet-300 mb-4">Progress Log</h3>
      <div className="max-h-64 overflow-y-auto space-y-2 font-mono text-xs text-gray-400">
        <AnimatePresence mode="popLayout">
          {messages.map((msg, idx) => (
            <motion.div
              key={`${idx}-${msg}`}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-2 text-gray-300 bg-black/20 p-2 rounded"
            >
              <Loader className="w-3 h-3 mt-1 flex-shrink-0 animate-spin text-violet-400" />
              <span className="break-words">{msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {messages.length === 0 && (
          <div className="text-center py-4 text-gray-500">Waiting for updates...</div>
        )}
      </div>
    </div>
  )
}
