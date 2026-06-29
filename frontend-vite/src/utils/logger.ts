/**
 * Logger — Phase 3 update.
 *
 * Phase 3 change: error() now forwards to Sentry when the DSN is
 * configured. Uses the lazy captureException helper from utils/sentry.ts
 * so that @sentry/react is never imported unless DSN is set, keeping the
 * dev bundle clean.
 */

const isDev = import.meta.env.DEV;
const httpDebugEnabled = import.meta.env.VITE_DEBUG_HTTP === 'true';

function debug(...args: unknown[]): void {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.debug(...args);
  }
}

function http(...args: unknown[]): void {
  if (httpDebugEnabled) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

function warn(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.warn(...args);
}

function error(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.error(...args);

  // Phase 3: forward Error instances to Sentry
  const firstArg = args[0];
  if (firstArg instanceof Error && import.meta.env.VITE_SENTRY_DSN) {
    import('@/utils/sentry').then(({ captureException }) => {
      captureException(firstArg, { extra: args.slice(1) });
    }).catch(() => undefined);
  }
}

export const logger = { debug, http, warn, error };
