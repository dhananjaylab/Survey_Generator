// Debug version of httpService to log token retrieval
import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';

class HttpServiceDebug {
  private client: AxiosInstance;

  constructor(baseURL: string = 'http://localhost:8000') {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor with detailed logging
    this.client.interceptors.request.use(
      (config) => {
        console.log('🔍 [HTTP DEBUG] Request interceptor triggered');
        console.log('🔍 [HTTP DEBUG] Request URL:', config.url);
        console.log('🔍 [HTTP DEBUG] Request method:', config.method);
        
        // Check localStorage
        console.log('🔍 [HTTP DEBUG] Checking localStorage...');
        const authStore = localStorage.getItem('auth-store');
        const authTokens = localStorage.getItem('auth-tokens');
        
        console.log('🔍 [HTTP DEBUG] auth-store exists:', !!authStore);
        console.log('🔍 [HTTP DEBUG] auth-tokens exists:', !!authTokens);
        
        if (authStore) {
          console.log('🔍 [HTTP DEBUG] auth-store content:', authStore.substring(0, 100) + '...');
        }
        if (authTokens) {
          console.log('🔍 [HTTP DEBUG] auth-tokens content:', authTokens.substring(0, 100) + '...');
        }
        
        // Try to get token
        let token = null;
        
        // First check Zustand store
        if (authStore) {
          try {
            const parsed = JSON.parse(authStore);
            console.log('🔍 [HTTP DEBUG] Parsed auth-store:', parsed);
            const tokens = parsed.state?.tokens || parsed.tokens;
            console.log('🔍 [HTTP DEBUG] Tokens from auth-store:', tokens);
            if (tokens?.accessToken) {
              token = tokens.accessToken;
              console.log('✅ [HTTP DEBUG] Token found in auth-store');
            }
          } catch (e) {
            console.error('❌ [HTTP DEBUG] Error parsing auth-store:', e);
          }
        }
        
        // Fallback to AuthService storage
        if (!token && authTokens) {
          try {
            const tokens = JSON.parse(authTokens);
            console.log('🔍 [HTTP DEBUG] Tokens from auth-tokens:', tokens);
            if (tokens?.accessToken) {
              token = tokens.accessToken;
              console.log('✅ [HTTP DEBUG] Token found in auth-tokens');
            }
          } catch (e) {
            console.error('❌ [HTTP DEBUG] Error parsing auth-tokens:', e);
          }
        }
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('✅ [HTTP DEBUG] Authorization header set');
          console.log('🔍 [HTTP DEBUG] Token (first 50 chars):', token.substring(0, 50) + '...');
        } else {
          console.warn('⚠️ [HTTP DEBUG] No token found - request will be unauthorized');
        }
        
        console.log('🔍 [HTTP DEBUG] Final headers:', config.headers);
        
        return config;
      },
      (error) => {
        console.error('❌ [HTTP DEBUG] Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log('✅ [HTTP DEBUG] Response received:', response.status);
        return response;
      },
      (error) => {
        console.error('❌ [HTTP DEBUG] Response error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    console.log('🚀 [HTTP DEBUG] Making POST request to:', url);
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }
}

export const httpServiceDebug = new HttpServiceDebug();
