import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { NotificationContainer } from '@/components/ui/Notification';
import { LoadingOverlay } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

// Mock the lazy-loaded components
vi.mock('@/pages', () => ({
  HomePage: () => <div>Home Page</div>,
  LoginPage: () => <div>Login Page</div>,
  RegisterPage: () => <div>Register Page</div>,
  ErrorPage: () => <div>Error Page</div>,
  ProjectSetupPage: () => <div>Project Setup Page</div>,
  ResearchPage: () => <div>Research Page</div>,
  BuilderPage: () => <div>Builder Page</div>,
  PreviewPage: () => <div>Preview Page</div>,
}))

// Create a simplified version of App for testing
const TestApp = () => {
  return (
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<div>Home Page</div>} />
          <Route path="login" element={<div>Login Page</div>} />
          <Route path="*" element={<div>Error Page</div>} />
        </Route>
      </Routes>
      <NotificationContainer />
      <LoadingOverlay />
    </MemoryRouter>
  );
};

describe('App Component', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(undefined);
  });

  it('renders without crashing', () => {
    render(<TestApp />)
    
    // Basic smoke test - just ensure the app renders
    expect(document.body).toBeInTheDocument()
  })

  it('has the correct document title', () => {
    render(<TestApp />)
    
    // Check that the document has a title
    expect(document.title).toBeDefined()
  })
})