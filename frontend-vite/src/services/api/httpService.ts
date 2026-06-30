/**
 * HTTP service — Phase 2 version.
 *
 * Phase 2 changes (all retained here):
 *   - Token read from useAuthStore.getState().tokens.access_token (snake_case).
 *     The original read tokens?.accessToken (camelCase) which was always undefined.
 *   - On 401 (not from /auth/* endpoints), a shared mutex promise performs ONE
 *     silent refresh — concurrent 401s all await the same promise instead of
 *     firing N parallel /auth/refresh calls.
 *   - The refresh call uses a bare axios instance (NOT httpClient) to avoid
 *     triggering this same interceptor recursively.
 *   - On refresh failure: calls logout() then redirects to /login.
 *   - Sensitive data (JWT value) is redacted from http-debug logs.
 *
 * Phase 3 note:
 *   authStore.logout() now also fires /auth/logout to the server (blocklists jti).
 *   This interceptor does not need to change — it still calls logout() on failure.
 */
import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

// ── Refresh mutex ─────────────────────────────────────────────────────────────
// Shared across all concurrent requests.  The first 401 initiates the refresh;
// subsequent 401s awaiting the same promise receive the updated token without
// firing duplicate /auth/refresh calls.
let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const { tokens, setTokens, logout } = useAuthStore.getState();

  if (!tokens?.refresh_token) {
    logout();
    return null;
  }

  try {
    // Bare axios — bypasses httpClient's interceptors entirely.
    const response = await axios.post(
      `${BASE_URL}/api/v1/auth/refresh`,
      { refresh_token: tokens.refresh_token }
    );
    const newTokens = response.data;
    setTokens(newTokens);
    logger.debug('[http] access token refreshed silently');
    return newTokens.access_token as string;
  } catch (err) {
    logger.warn('[http] silent refresh failed — logging out');
    logout();
    return null;
  } finally {
    refreshPromise = null;   // release mutex regardless of outcome
  }
}

// ── Axios instance ────────────────────────────────────────────────────────────

export const httpClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach Authorization header ─────────────────────────

httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { tokens } = useAuthStore.getState();

  if (tokens?.access_token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${tokens.access_token}`;
  }

  if (import.meta.env.VITE_DEBUG_HTTP === 'true') {
    // Log presence of token only — never log the value.
    logger.http(
      `[http] → ${config.method?.toUpperCase()} ${config.url}`,
      tokens?.access_token ? '(authenticated)' : '(anonymous)'
    );
  }

  return config;
});

// ── Response interceptor — silent 401 recovery ────────────────────────────────

httpClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.VITE_DEBUG_HTTP === 'true') {
      logger.http(`[http] ← ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };

    const is401          = error.response?.status === 401;
    const isAuthEndpoint = originalRequest?.url?.includes('/api/v1/auth/');
    const alreadyRetried = originalRequest?._retried === true;

    if (is401 && !isAuthEndpoint && !alreadyRetried) {
      originalRequest._retried = true;

      // Single shared refresh — concurrent 401s await the same promise.
      if (!refreshPromise) {
        refreshPromise = doRefresh();
      }
      const newAccessToken = await refreshPromise;

      if (newAccessToken) {
        // Retry original request with the fresh token.
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return httpClient(originalRequest);
      }

      // Refresh failed — doRefresh() already called logout().
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ── Convenience wrapper ───────────────────────────────────────────────────────
// Keeps existing call sites unchanged (httpService.get, .post, etc.)

export const httpService = {
  get:    httpClient.get.bind(httpClient),
  post:   httpClient.post.bind(httpClient),
  put:    httpClient.put.bind(httpClient),
  patch:  httpClient.patch.bind(httpClient),
  delete: httpClient.delete.bind(httpClient),
};
