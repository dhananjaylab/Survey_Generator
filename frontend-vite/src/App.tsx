import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { NotificationContainer } from './components/ui/Notification';
import { LoadingOverlay } from './components/ui/Spinner';
import { useAuth } from './hooks/useAuth';

// Lazy loaded pages to optimize bundle size
import React, { Suspense } from 'react';
const HomePage = React.lazy(() => import('./pages').then(module => ({ default: module.HomePage })));
const LoginPage = React.lazy(() => import('./pages').then(module => ({ default: module.LoginPage })));
const RegisterPage = React.lazy(() => import('./pages').then(module => ({ default: module.RegisterPage })));
const ErrorPage = React.lazy(() => import('./pages').then(module => ({ default: module.ErrorPage })));

const CreateSurveyPage = React.lazy(() => import('./pages').then(module => ({ default: module.CreateSurveyPage })));
const BuilderPage = React.lazy(() => import('./pages').then(module => ({ default: module.BuilderPage })));
const PreviewPage = React.lazy(() => import('./pages').then(module => ({ default: module.PreviewPage })));

const SuspenseFallback = () => <div className="min-h-screen flex items-center justify-center">Loading...</div>;

function App() {
  // Initialize auth listener
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
            
            {/* Protected Routes */}
            <Route
              path="create"
              element={
                <ProtectedRoute>
                  <CreateSurveyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="builder"
              element={
                <ProtectedRoute>
                  <BuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="preview"
              element={
                <ProtectedRoute>
                  <PreviewPage />
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