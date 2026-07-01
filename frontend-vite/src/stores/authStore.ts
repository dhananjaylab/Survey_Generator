/**
 * Auth store — Phase 3 version.
 *
 * Phase 3 change:
 *   logout() fires POST /api/v1/auth/logout with the current refresh_token
 *   so the server can blocklist its jti.  Uses a bare axios call (not
 *   httpService) to bypass the 401 interceptor — interceptor would try to
 *   silently refresh a token we are intentionally discarding.
 *   Fail-open: local state is always cleared regardless of network outcome.
 *
 * Phase 2 retained:
 *   - Single 'auth' localStorage key (Zustand persist)
 *   - One-time migration shim from old 'auth-store' / 'auth-tokens' keys
 *   - setTokens() exposed for the HTTP interceptor's silent refresh
 *   - No AuthService layer — calls ApiEndpoints directly
 *
 * Phase 1 fix retained:
 *   - Removed broken /api/v1/users/me call on every page load
 *   - access_token (snake_case) throughout
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import type { AuthState, AuthTokens, LoginCredentials, RegisterData } from '@/types/auth';
import { ApiEndpoints } from '@/services/api/endpoints';
import { ApiErrorHandler } from '@/services/api/errorHandler';
import { logger } from '@/utils/logger';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

// ── One-time migration: old keys → new single 'auth' key ─────────────────────
// Remove this block after 7 days post-deploy (all old tokens will have expired).
try {
  const oldRaw = localStorage.getItem('auth-store');
  if (oldRaw && !localStorage.getItem('auth')) {
    const parsed = JSON.parse(oldRaw);
    const tokens = parsed?.state?.tokens;
    if (tokens) {
      localStorage.setItem('auth', JSON.stringify({ state: { tokens }, version: 0 }));
      logger.debug('[auth] migrated tokens from auth-store → auth');
    }
    localStorage.removeItem('auth-store');
    localStorage.removeItem('auth-tokens');
  }
} catch {
  // Non-fatal — user will be asked to log in again
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      tokens:          null,
      isAuthenticated: false,
      isLoading:       false,
      error:           null,

      // ── Actions ─────────────────────────────────────────────────────────────

      login: async (credentials: LoginCredentials): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          const tokens = await ApiEndpoints.login(credentials);
          set({ tokens, isAuthenticated: true, isLoading: false, error: null });
          logger.debug('[auth] login successful');
        } catch (err: any) {
          const message = ApiErrorHandler.handle(err).detail;
          set({ error: message, isLoading: false, isAuthenticated: false });
          throw err;
        }
      },

      register: async (data: RegisterData): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          const tokens = await ApiEndpoints.register(data);
          set({ tokens, isAuthenticated: true, isLoading: false, error: null });
          logger.debug('[auth] registration successful');
        } catch (err: any) {
          const message = ApiErrorHandler.handle(err).detail;
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      logout: (): void => {
        const { tokens } = get();

        // Phase 3: tell the server to blocklist the refresh token's jti.
        // Fire-and-forget — we clear local state regardless of outcome.
        // Bare axios is used intentionally to avoid the httpService interceptor
        // triggering a /auth/refresh call for a token we are discarding.
        if (tokens?.refresh_token) {
          axios
            .post(
              `${BASE_URL}/api/v1/auth/logout`,
              { refresh_token: tokens.refresh_token },
              {
                headers: {
                  Authorization: `Bearer ${tokens.access_token}`,
                  'Content-Type': 'application/json',
                },
              }
            )
            .catch((err) => {
              logger.warn(
                '[auth] server-side logout call failed — token may still be valid briefly',
                err?.response?.status
              );
            });
        }

        // Always clear client state immediately, regardless of server response.
        set({ tokens: null, isAuthenticated: false, error: null });
        logger.debug('[auth] logged out');
        // Zustand's persist middleware will clear the 'auth' localStorage key automatically.
      },

      /**
       * Called by the HTTP interceptor after a successful silent refresh.
       * Stores new tokens without touching isLoading or isAuthenticated.
       */
      setTokens: (tokens: AuthTokens): void => {
        set({ tokens, isAuthenticated: true });
      },

      clearError: (): void => {
        set({ error: null });
      },
    }),
    {
      name: 'auth',                               // single localStorage key
      partialize: (state) => ({ tokens: state.tokens }),
      onRehydrateStorage: () => (state) => {
        if (state?.tokens) {
          state.isAuthenticated = true;
        }
      },
    }
  )
);
