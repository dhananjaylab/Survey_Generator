import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Knit AI Survey Generator',
  description: 'Create bespoke, AI-powered survey designs in minutes with drag-and-drop editing.',
  keywords: ['survey generator', 'AI survey', 'questionnaire builder', 'SurveyJS'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* Floating background orbs */}
        <div className="floating-orb" style={{ width: 600, height: 600, top: '-10%', left: '-5%', background: '#6366f1' }} />
        <div className="floating-orb" style={{ width: 500, height: 500, bottom: '-10%', right: '-5%', background: '#8b5cf6', animationDelay: '-7s' }} />
        <div className="floating-orb" style={{ width: 300, height: 300, top: '40%', right: '20%', background: '#38bdf8', animationDelay: '-13s' }} />
        {children}
      </body>
    </html>
  )
}
