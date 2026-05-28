import apiClient from './api';
import { API_ENDPOINTS } from '../utils/constants';
import type { AuthResponse, LoginCredentials, RegisterData, User } from '../types/user';

/**
 * localStorage key under which the bearer token is persisted.
 *
 * Must match the key the API client's request interceptor reads from —
 * see [./api.ts](./api.ts).
 */
const TOKEN_STORAGE_KEY = 'token';

/** Safely write the token, ignoring storage exceptions (private mode, quota). */
function persistToken(token: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  } catch {
    // localStorage unavailable — caller will still receive the token in-memory.
  }
}

/** Safely clear the token. */
function clearToken(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Auth service: thin wrapper over the API client for credential
 * endpoints, plus the small amount of client-side state (persisted
 * bearer token) that auth requires.
 *
 * All HTTP methods return the unwrapped response body — the response
 * interceptor in [./api.ts](./api.ts) already strips the AxiosResponse
 * envelope, so e.g. `login()` resolves to `AuthResponse` directly.
 *
 * On failure, errors propagate from the interceptor as either the
 * server's structured payload or a `{ message }` shim for network
 * errors. Callers can `try/catch` and read `err.message`.
 */
const authService = {
  /**
   * Authenticate an existing user.
   *
   * On success the returned token is persisted to `localStorage` so
   * subsequent requests in this session (and after a reload) are
   * authenticated automatically.
   *
   * @throws The server's error payload, or `{ message: '...' }` on
   *   network failure.
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
  const result = (await apiClient.post(
    API_ENDPOINTS.auth.login,
    credentials,
  )) as unknown as { data: AuthResponse };
  persistToken(result.data.token);
  return result.data;
},

  /**
   * Register a new account and sign in immediately.
   *
   * On success the returned token is persisted just like {@link login}.
   *
   * @throws The server's error payload (e.g. validation errors,
   *   duplicate email), or `{ message: '...' }` on network failure.
   */
  async register(data: RegisterData): Promise<AuthResponse> {
  const result = (await apiClient.post(
    API_ENDPOINTS.auth.register,
    data,
  )) as unknown as { data: AuthResponse };
  persistToken(result.data.token);
  return result.data;
},

  /**
   * Sign the user out client-side and send them back to the login page.
   *
   * Synchronous and side-effect only: no network call. If the backend
   * ever needs a server-side logout (token revocation), wire it in
   * before the redirect.
   */
  logout(): void {
    clearToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  /**
   * Fetch the currently authenticated user's profile.
   *
   * Relies on the request interceptor to attach the bearer token. A
   * 401 from the server will trigger the response interceptor's
   * logout-and-redirect flow.
   *
   * @throws The server's error payload, including 401 when no valid
   *   session exists.
   */
  async getCurrentUser(): Promise<User> {
  const result = (await apiClient.get('/auth/me')) as unknown as { data: User };
  return result.data;
},
  /**
   * Cheap client-side check for the presence of a token.
   *
   * Note: this does not validate the token. A returned `true` only
   * means *something* is stored; the server may still reject it as
   * expired or revoked.
   */
  isAuthenticated(): boolean {
    try {
      return typeof localStorage !== 'undefined' && !!localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return false;
    }
  },
};

export default authService;
