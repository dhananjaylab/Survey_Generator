import { ApiEndpoints } from '../api/endpoints';
import { StorageService } from '../storage/storageService';
import type { LoginCredentials, RegisterData, AuthTokens } from '@/types/auth';

const TOKEN_STORAGE_KEY = 'auth-tokens';

export class AuthService {
  /**
   * Login user and store tokens
   */
  static async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const tokens = await ApiEndpoints.login(credentials);
    StorageService.setItem(TOKEN_STORAGE_KEY, tokens);
    return tokens;
  }

  /**
   * Register new user and store tokens
   */
  static async register(data: RegisterData): Promise<AuthTokens> {
    const tokens = await ApiEndpoints.register(data);
    StorageService.setItem(TOKEN_STORAGE_KEY, tokens);
    return tokens;
  }

  /**
   * Logout user and clear tokens
   */
  static logout(): void {
    StorageService.removeItem(TOKEN_STORAGE_KEY);
  }

  /**
   * Get stored authentication tokens
   */
  static getTokens(): AuthTokens | null {
    return StorageService.getItem<AuthTokens>(TOKEN_STORAGE_KEY);
  }

  /**
   * Check if user is authenticated (has tokens)
   */
  static isAuthenticated(): boolean {
    return this.getTokens() !== null;
  }
}
