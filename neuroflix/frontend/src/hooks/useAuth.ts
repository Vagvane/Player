import { useAuthStore } from '../store/authStore';
import type { RegisterData, User } from '../types/user';

export interface UseAuthResult {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

/**
 * Hook to access authentication state and actions.
 *
 * Thin wrapper over {@link useAuthStore} that exposes only the fields
 * components should touch — the imperative `setUser` / `setToken`
 * setters live on the store directly for tests and edge flows.
 *
 * Each piece of state is subscribed via an individual selector so
 * components only re-render on the slices they actually read.
 *
 * @example
 * ```ts
 * const { user, isAuthenticated, login, logout } = useAuth();
 *
 * // Login
 * await login('user@example.com', 'password');
 *
 * // Check if authenticated
 * if (isAuthenticated) {
 *   console.log('User:', user);
 * }
 * ```
 */
function useAuth(): UseAuthResult {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);
  const checkAuth = useAuthStore((s) => s.checkAuth);

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    checkAuth,
  };
}

export default useAuth;
