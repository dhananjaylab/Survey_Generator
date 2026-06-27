/**
 * Lightweight logger — replaces scattered console.log calls.
 *
 * Levels:
 *   debug — dev-only, stripped in production builds via import.meta.env.DEV
 *   http  — verbose request/response tracing, gated behind VITE_DEBUG_HTTP=true
 *           (so it can be enabled in prod for troubleshooting without a redeploy)
 *   warn  — always logged
 *   error — always logged, and is the hook point for Sentry (Phase 3)
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

  // Phase 3: forward to Sentry when configured
  // if (window.Sentry && args[0] instanceof Error) {
  //   window.Sentry.captureException(args[0]);
  // }
}

export const logger = { debug, http, warn, error };
