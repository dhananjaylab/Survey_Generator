/**
 * Auth store — Phase 3 update.
 *
 * Phase 3 change: logout() now hits /api/v1/auth/logout to blocklist the
 * refresh token server-side, preventing replay even if the token is still
 * within its 72-hour TTL.  Local state is cleared regardless of whether
 * the network call succeeds (fail-open for UX).
 *
 * Phase 2 retained:
 *  - Single 'auth' localStorage key
 *  - Migration shim from old 'auth-store' key
 *  - setTokens() for silent refresh interceptor
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import type { AuthState, AuthTokens, LoginCredentials, RegisterData } from '@/types/auth';
import { ApiEndpoints } from '@/services/api/endpoints';
import { ApiErrorHandler } from '@/services/api/errorHandler';
import { logger } from '@/utils/logger';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

// ── One-time migration ────────────────────────────────────────────────────────
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
  // Non-fatal
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

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

        // Phase 3: notify server to blocklist the refresh token.
        // Use a bare axios call (not httpService) to avoid the 401 interceptor
        // triggering a refresh attempt on the way out.
        if (tokens?.refresh_token) {
          axios
            .post(
              `${BASE_URL}/api/v1/auth/logout`,
              { refresh_token: tokens.refresh_token },
              { headers: { Authorization: `Bearer ${tokens.access_token}` } }
            )
            .catch((err) => {
              logger.warn('[auth] server-side logout failed (token may still be valid briefly)', err);
            });
        }

        // Always clear client state regardless of network outcome
        set({ tokens: null, isAuthenticated: false, error: null });
        logger.debug('[auth] logged out');
      },

      setTokens: (tokens: AuthTokens): void => {
        set({ tokens, isAuthenticated: true });
      },

      clearError: (): void => {
        set({ error: null });
      },
    }),
    {
      name: 'auth',
      partialize: (state) => ({ tokens: state.tokens }),
      onRehydrateStorage: () => (state) => {
        if (state?.tokens) {
          state.isAuthenticated = true;
        }
      },
    }
  )
);
