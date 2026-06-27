/**
 * useAuth hook.
 *
 * Phase 1 fix: removed the broken useEffect that called the non-existent
 * /api/v1/users/me endpoint on every page load, which was causing:
 *   1. A 404 on every app load
 *   2. Logout for authenticated users due to the 401 handler firing
 *   3. Reference to tokens?.accessToken (camelCase) which was always undefined
 *
 * The hook is now a thin alias for useAuthStore — session persistence is
 * handled by Zustand's persist middleware. The JWT the backend issues IS
 * the session validation; a round-trip to /me on every load is unnecessary.
 *
 * If a server-side session check is needed in the future, implement it as
 * a separate hook called only from the profile page, not from App.tsx.
 */
import { useAuthStore } from '@/stores/authStore';

export const useAuth = () => {
  return useAuthStore();
};
