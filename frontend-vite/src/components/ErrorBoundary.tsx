/**
 * ErrorBoundary — Phase 3 update.
 *
 * Phase 3 change: componentDidCatch() now calls captureException()
 * directly, so route-level errors are captured even when the onError
 * prop is not passed.  The onError prop is still supported for callers
 * that need additional side-effects (e.g. App.tsx logging).
 */
import * as React from 'react';
import { logger } from '@/utils/logger';
import { captureException } from '@/utils/sentry';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logger.error('[ErrorBoundary] caught render error', error, info.componentStack);

    // Phase 3: forward to Sentry (no-op when DSN is unset)
    captureException(error, { componentStack: info.componentStack ?? '' }).catch(() => undefined);

    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
        <p className="max-w-md text-sm text-gray-500">
          {error.message || 'An unexpected error occurred while rendering this page.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={this.reset}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Go to dashboard
          </a>
        </div>
      </div>
    );
  }
}
