import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, User, AuthTokens, LoginCredentials, RegisterData } from '@/types/auth';
import { AuthService } from '@/services/auth';

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  clearError: () => void;
}

const initialState: AuthState = {
  user: null,
  tokens: AuthService.getTokens(),
  isAuthenticated: AuthService.isAuthenticated(),
  isLoading: false,
  error: null,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const tokens = await AuthService.login(credentials);
          set({
            tokens,
            isAuthenticated: true,
            isLoading: false,
          });
          // Sync tokens to both storage locations for compatibility
          localStorage.setItem('auth-tokens', JSON.stringify(tokens));
        } catch (error: any) {
          set({
            error: error.detail || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const tokens = await AuthService.register(data);
          set({
            tokens,
            isAuthenticated: true,
            isLoading: false,
          });
          // Sync tokens to both storage locations for compatibility
          localStorage.setItem('auth-tokens', JSON.stringify(tokens));
        } catch (error: any) {
          set({
            error: error.detail || 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        AuthService.logout();
        // Clear both storage locations
        localStorage.removeItem('auth-tokens');
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          error: null,
        });
      },

      setUser: (user) => set({ user }),
      setTokens: (tokens) => set({ tokens, isAuthenticated: !!tokens }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ tokens: state.tokens }), // Only persist tokens
    }
  )
);
