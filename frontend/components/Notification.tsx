'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface NotificationProps {
  type: NotificationType
  title: string
  message?: string
  duration?: number
  onClose?: () => void
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = {
  success: 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-300',
  error: 'from-red-500/20 to-rose-500/20 border-red-500/30 text-red-300',
  warning: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-300',
  info: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300',
}

export default function Notification({ 
  type, 
  title, 
  message, 
  duration = 5000, 
  onClose 
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const Icon = icons[type]

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onClose?.(), 300)
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => onClose?.(), 300)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`fixed top-4 right-4 z-50 max-w-sm w-full bg-gradient-to-r ${colors[type]} backdrop-blur-sm border rounded-lg p-4 shadow-lg`}
        >
          <div className="flex items-start gap-3">
            <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm">{title}</h4>
              {message && (
                <p className="text-xs opacity-90 mt-1">{message}</p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Notification manager hook
export function useNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: string
    type: NotificationType
    title: string
    message?: string
    duration?: number
  }>>([])

  const addNotification = (notification: Omit<NotificationProps, 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setNotifications(prev => [...prev, { ...notification, id }])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const NotificationContainer = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          {...notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  )

  return {
    addNotification,
    NotificationContainer,
    success: (title: string, message?: string) => 
      addNotification({ type: 'success', title, message }),
    error: (title: string, message?: string) => 
      addNotification({ type: 'error', title, message, duration: 8000 }),
    warning: (title: string, message?: string) => 
      addNotification({ type: 'warning', title, message }),
    info: (title: string, message?: string) => 
      addNotification({ type: 'info', title, message }),
  }
}