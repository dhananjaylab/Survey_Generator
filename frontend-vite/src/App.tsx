/**
 * App.tsx — root component with routing.
 *
 * Phase 2 addition: each protected route is wrapped in <ErrorBoundary>.
 * handleBoundaryError is the single hook point for Sentry (Phase 3):
 *   Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
 *
 * Lazy-loaded pages keep the initial bundle small; Suspense fallback
 * shows a centered "Loading..." message during chunk fetch.
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { NotificationContainer } from './components/ui/Notification';
import { LoadingOverlay } from './components/ui/Spinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
import { logger } from './utils/logger';
import React, { Suspense } from 'react';

const HomePage          = React.lazy(() => import('./pages').then((m) => ({ default: m.HomePage })));
const LoginPage          = React.lazy(() => import('./pages').then((m) => ({ default: m.LoginPage })));
const RegisterPage       = React.lazy(() => import('./pages').then((m) => ({ default: m.RegisterPage })));
const ErrorPage          = React.lazy(() => import('./pages').then((m) => ({ default: m.ErrorPage })));
const CreateSurveyPage   = React.lazy(() => import('./pages').then((m) => ({ default: m.CreateSurveyPage })));
const BuilderPage        = React.lazy(() => import('./pages').then((m) => ({ default: m.BuilderPage })));
const PreviewPage        = React.lazy(() => import('./pages').then((m) => ({ default: m.PreviewPage })));
const DashboardPage      = React.lazy(() => import('./pages').then((m) => ({ default: m.DashboardPage })));

const SuspenseFallback = () => (
  <div className="min-h-screen flex items-center justify-center">Loading...</div>
);

/** Phase 3: wire this to Sentry.captureException. */
function handleBoundaryError(error: Error, info: React.ErrorInfo): void {
  logger.error('[App] route-level error boundary triggered', {
    message: error.message,
    componentStack: info.componentStack,
  });
}

function App() {
  // Initializes auth state from persisted storage (no network call — see useAuth.ts)
  useAuth();

  return (
    <BrowserRouter>
      <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Public Routes */}
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />

            {/* Protected Routes — each wrapped in its own ErrorBoundary so a
                crash in one page doesn't take down the nav/layout shell. */}
            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <ErrorBoundary onError={handleBoundaryError}>
                    <DashboardPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="create"
              element={
                <ProtectedRoute>
                  <ErrorBoundary onError={handleBoundaryError}>
                    <CreateSurveyPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="builder"
              element={
                <ProtectedRoute>
                  <ErrorBoundary onError={handleBoundaryError}>
                    <BuilderPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="preview"
              element={
                <ProtectedRoute>
                  <ErrorBoundary onError={handleBoundaryError}>
                    <PreviewPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* Error handling */}
            <Route path="*" element={<ErrorPage />} />
          </Route>
        </Routes>
      </Suspense>

      {/* Global Modals & Notifications */}
      <NotificationContainer />
      <LoadingOverlay />
    </BrowserRouter>
  );
}

export default App;
