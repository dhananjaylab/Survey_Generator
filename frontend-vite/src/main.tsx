/**
 * Application entry point.
 *
 * Phase 3: Sentry is initialised before React renders so that any error
 * thrown during the first render is captured.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initSentry } from '@/utils/sentry'

// Phase 3: boot Sentry (no-op if VITE_SENTRY_DSN is unset)
initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
