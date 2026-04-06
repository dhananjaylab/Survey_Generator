'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AuthGuard from './AuthGuard'
import { useNotifications } from './Notification'

interface ClientLayoutProps {
  children: React.ReactNode
}

// Pages that don't require authentication
const PUBLIC_PAGES = ['/login', '/']

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname()
  const { addNotification, NotificationContainer } = useNotifications()
  
  // Listen for global notification events
  useEffect(() => {
    const handleNotification = (event: CustomEvent) => {
      addNotification(event.detail)
    }

    window.addEventListener('show-notification', handleNotification as EventListener)
    
    return () => {
      window.removeEventListener('show-notification', handleNotification as EventListener)
    }
  }, [addNotification])
  
  // Check if current page is public
  const isPublicPage = PUBLIC_PAGES.includes(pathname)
  
  const content = isPublicPage ? children : <AuthGuard>{children}</AuthGuard>
  
  return (
    <>
      {content}
      <NotificationContainer />
    </>
  )
}