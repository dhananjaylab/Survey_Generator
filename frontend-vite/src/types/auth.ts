/**
 * Authentication types — matches backend TokenResponse exactly (snake_case).
 *
 * Phase 1 fix: access_token is snake_case throughout (was accessToken in useAuth.ts).
 * Phase 2 addition: refresh_token field added.
 */

export interface AuthTokens {
  /** Short-lived JWT — 1 hour. Include as `Authorization: Bearer <token>`. */
  access_token: string;
  /** Long-lived JWT — 72 hours. Exchange for a new pair via /auth/refresh. */
  refresh_token: string;
  token_type: string;
}

export interface User {
  username: string;
  email?: string;
  is_active: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
}

export interface AuthState {
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  setTokens: (tokens: AuthTokens) => void;
  clearError: () => void;
}
