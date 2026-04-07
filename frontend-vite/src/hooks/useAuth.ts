import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { httpService } from '@/services/api/httpService';

export const useAuth = () => {
  const authState = useAuthStore();
  
  useEffect(() => {
    // Session validation on app initialization
    // Ideally we should verify token validity with the backend
    const validateSession = async () => {
      if (authState.tokens?.accessToken) {
        try {
          // If the backend has a /me endpoint, we can fetch user profile
          const user = await httpService.get('/api/v1/users/me');
          authState.setUser(user as any);
        } catch (error) {
          // If token verification fails (e.g., 401), logout
          authState.logout();
        }
      }
    };

    validateSession();
  }, [authState.tokens?.accessToken]);

  return authState;
};
