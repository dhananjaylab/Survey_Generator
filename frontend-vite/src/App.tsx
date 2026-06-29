/**
 * App.tsx — Phase 3 update.
 *
 * Phase 3 change: handleBoundaryError() now calls captureException()
 * directly instead of just logging, so route-level boundary fires
 * are reported to Sentry even when ErrorBoundary's own componentDidCatch
 * already captured the same error (Sentry deduplicates by fingerprint).
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { NotificationContainer } from './components/ui/Notification';
import { LoadingOverlay } from './components/ui/Spinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
import { logger } from './utils/logger';
import { captureException } from './utils/sentry';
import React, { Suspense } from 'react';

const HomePage        = React.lazy(() => import('./pages').then((m) => ({ default: m.HomePage })));
const LoginPage       = React.lazy(() => import('./pages').then((m) => ({ default: m.LoginPage })));
const RegisterPage    = React.lazy(() => import('./pages').then((m) => ({ default: m.RegisterPage })));
const ErrorPage       = React.lazy(() => import('./pages').then((m) => ({ default: m.ErrorPage })));
const CreateSurveyPage = React.lazy(() => import('./pages').then((m) => ({ default: m.CreateSurveyPage })));
const BuilderPage     = React.lazy(() => import('./pages').then((m) => ({ default: m.BuilderPage })));
const PreviewPage     = React.lazy(() => import('./pages').then((m) => ({ default: m.PreviewPage })));
const DashboardPage   = React.lazy(() => import('./pages').then((m) => ({ default: m.DashboardPage })));

const SuspenseFallback = () => (
  <div className="min-h-screen flex items-center justify-center">Loading...</div>
);

function handleBoundaryError(error: Error, info: React.ErrorInfo): void {
  logger.error('[App] route-level error boundary triggered', {
    message: error.message,
    componentStack: info.componentStack,
  });
  // Phase 3: also forward to Sentry (ErrorBoundary.componentDidCatch does
  // the same, but this call adds route-level context via the extra payload)
  captureException(error, {
    context: 'route-boundary',
    componentStack: info.componentStack ?? '',
  }).catch(() => undefined);
}

function App() {
  useAuth();

  return (
    <BrowserRouter>
      <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />

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
            <Route path="*" element={<ErrorPage />} />
          </Route>
        </Routes>
      </Suspense>

      <NotificationContainer />
      <LoadingOverlay />
    </BrowserRouter>
  );
}

export default App;
