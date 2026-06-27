/**
 * ErrorBoundary — catches render errors in its subtree and shows a
 * recoverable fallback UI instead of a blank white screen.
 *
 * Phase 2 addition: wrapped around each protected route in App.tsx.
 * Without this, any unhandled error in a page component (e.g. a
 * malformed survey JSON crashing the builder) would unmount the
 * entire React tree, including the navigation — leaving the user
 * stuck with no way back except a manual URL change.
 *
 * onError prop is the hook point for Sentry (Phase 3):
 *   <ErrorBoundary onError={(err, info) => Sentry.captureException(err, { extra: info })}>
 */
import * as React from 'react';
import { logger } from '@/utils/logger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Called with the error and React's componentStack info. */
  onError?: (error: Error, info: React.ErrorInfo) => void;
  /** Optional custom fallback — receives the error and a reset function. */
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
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

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
