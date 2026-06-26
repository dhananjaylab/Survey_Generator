/**
 * Auth store — single source of truth for authentication state.
 *
 * Phase 2 consolidation:
 *  - AuthService deleted; this store calls ApiEndpoints directly
 *  - Tokens persisted under a single localStorage key: 'auth'
 *  - setTokens() exposed for the HTTP interceptor's silent refresh
 *  - No dual-write, no fallback reads from 'auth-tokens'
 *
 * Migration shim (remove after 7 days of dual-deploy):
 *  On first load, moves tokens from old 'auth-store' key to new 'auth' key.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, AuthTokens, LoginCredentials, RegisterData } from '@/types/auth';
import { ApiEndpoints } from '@/services/api/endpoints';
import { logger } from '@/utils/logger';

// ── One-time migration: old key → new key ─────────────────────────────────────
// Remove this block after all users' old tokens have expired (7 days post-deploy).
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
  // Non-fatal — user will just need to log in again
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ── Actions ─────────────────────────────────────────────────────────────

      login: async (credentials: LoginCredentials): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          const tokens = await ApiEndpoints.login(credentials);
          set({ tokens, isAuthenticated: true, isLoading: false, error: null });
          logger.debug('[auth] login successful');
        } catch (err: any) {
          const message = err?.detail ?? err?.message ?? 'Login failed';
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
          const message = err?.detail ?? err?.message ?? 'Registration failed';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      logout: (): void => {
        set({ tokens: null, isAuthenticated: false, error: null });
        // persist middleware will clear 'auth' from localStorage automatically
        logger.debug('[auth] logged out');
      },

      /** Called by the HTTP interceptor after a successful silent refresh. */
      setTokens: (tokens: AuthTokens): void => {
        set({ tokens, isAuthenticated: true });
      },

      clearError: (): void => {
        set({ error: null });
      },
    }),
    {
      name: 'auth',                              // single localStorage key
      partialize: (state) => ({ tokens: state.tokens }),
      onRehydrateStorage: () => (state) => {
        if (state?.tokens) {
          state.isAuthenticated = true;
        }
      },
    }
  )
);
