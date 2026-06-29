/**
 * Sentry browser SDK initialisation — Phase 3.
 *
 * Called once from main.tsx before React renders.
 * No-op when VITE_SENTRY_DSN is unset (local dev / CI).
 *
 * Usage in main.tsx:
 *   import { initSentry } from '@/utils/sentry';
 *   initSentry();
 *
 * Usage in ErrorBoundary.tsx (already stubbed):
 *   onError={(err, info) => Sentry.captureException(err, { extra: info })}
 *
 * Usage in logger.ts (already stubbed):
 *   import * as Sentry from '@sentry/react';
 *   Sentry.captureException(args[0] as Error);
 */
import type { BrowserOptions } from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV = (import.meta.env.VITE_NODE_ENV ?? import.meta.env.MODE) as string;
const RELEASE = import.meta.env.VITE_RELEASE as string | undefined;

export function initSentry(): void {
  if (!DSN) {
    // Sentry disabled — no DSN configured.
    return;
  }

  // Lazy-import to keep the initial bundle clean for users without Sentry.
  import('@sentry/react').then(({ init, browserTracingIntegration, replayIntegration }) => {
    const options: BrowserOptions = {
      dsn: DSN,
      environment: ENV,
      release: RELEASE,

      integrations: [
        browserTracingIntegration(),
        // Session Replay — capture 10% of normal sessions, 100% with errors
        replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

      // Performance — 10% in production, 100% in dev
      tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,

      // Replay
      replaysSessionSampleRate:  ENV === 'production' ? 0.1 : 0,
      replaysOnErrorSampleRate:  1.0,

      // Don't send PII
      sendDefaultPii: false,

      beforeSend(event) {
        // Strip auth tokens from request headers before sending
        if (event.request?.headers?.Authorization) {
          event.request.headers.Authorization = '[Filtered]';
        }
        return event;
      },
    };

    init(options);
  }).catch(() => {
    // @sentry/react not installed — silently ignore
  });
}

/**
 * Capture an exception with optional extra context.
 * Safe to call whether or not Sentry is initialised.
 */
export async function captureException(
  error: Error,
  extra?: Record<string, unknown>,
): Promise<void> {
  if (!DSN) return;
  try {
    const Sentry = await import('@sentry/react');
    Sentry.captureException(error, extra ? { extra } : undefined);
  } catch {
    // Sentry not installed
  }
}
