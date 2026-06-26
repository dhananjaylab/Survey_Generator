/**
 * HTTP service — axios instance with auth header injection and silent
 * token refresh on 401.
 *
 * Phase 2 changes:
 *  - Token read from useAuthStore.getState().tokens (snake_case access_token)
 *  - On 401 (not from /auth/* endpoints), attempts ONE silent refresh via
 *    a shared promise mutex — concurrent 401s all await the same refresh
 *    instead of firing N parallel refresh requests.
 *  - Refresh call uses a bare axios instance (NOT this client) to avoid
 *    re-triggering the interceptor and causing infinite loops.
 *  - On refresh failure: logout + redirect to /login.
 *  - Sensitive data (tokens) redacted from http-debug logs.
 */
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

// ── Refresh mutex ───────────────────────────────────────────────────────────
// Shared across all requests. First 401 starts the refresh; subsequent 401s
// awaiting the same promise get the new token without firing duplicate calls.
let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const { tokens, setTokens, logout } = useAuthStore.getState();

  if (!tokens?.refresh_token) {
    logout();
    return null;
  }

  try {
    // Bare axios — bypasses this file's interceptors entirely.
    const response = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
      refresh_token: tokens.refresh_token,
    });

    const newTokens = response.data;
    setTokens(newTokens);
    logger.debug('[http] token refreshed silently');
    return newTokens.access_token;
  } catch (err) {
    logger.warn('[http] silent refresh failed — logging out');
    logout();
    return null;
  } finally {
    refreshPromise = null; // release mutex regardless of outcome
  }
}

// ── Axios instance ────────────────────────────────────────────────────────────

export const httpClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
});

// ── Request interceptor — attach Authorization header ──────────────────────────

httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { tokens } = useAuthStore.getState();
  if (tokens?.access_token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${tokens.access_token}`;
  }

  if (import.meta.env.VITE_DEBUG_HTTP === 'true') {
    // Redact token value — log presence only
    logger.http(
      `[http] → ${config.method?.toUpperCase()} ${config.url}`,
      tokens?.access_token ? '(authenticated)' : '(anonymous)'
    );
  }

  return config;
});

// ── Response interceptor — silent refresh on 401 ────────────────────────────────

httpClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.VITE_DEBUG_HTTP === 'true') {
      logger.http(`[http] ← ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retried?: boolean };

    const isAuthEndpoint = originalRequest?.url?.includes('/api/v1/auth/');
    const is401 = error.response?.status === 401;

    if (is401 && !isAuthEndpoint && !originalRequest._retried) {
      originalRequest._retried = true;

      // Single shared refresh — concurrent 401s await the same promise
      if (!refreshPromise) {
        refreshPromise = doRefresh();
      }
      const newAccessToken = await refreshPromise;

      if (newAccessToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return httpClient(originalRequest); // retry original request once
      }

      // Refresh failed — doRefresh() already called logout()
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ── Convenience wrapper (keeps existing call sites unchanged) ──────────────────

export const httpService = {
  get:    httpClient.get,
  post:   httpClient.post,
  put:    httpClient.put,
  patch:  httpClient.patch,
  delete: httpClient.delete,
};
