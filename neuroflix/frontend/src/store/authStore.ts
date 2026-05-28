import { create } from 'zustand';
import authService from '../services/authService';
import type { AuthState, RegisterData, User } from '../types/user';

/**
 * Auth store actions layered on top of [AuthState](../types/user.ts).
 *
 * Mutations to `user`/`token` should go through these actions so the
 * derived `isAuthenticated` flag stays consistent.
 */
export interface AuthStore extends AuthState {
  /**
   * Authenticate with email + password.
   *
   * On success, populates `user`/`token` and flips `isAuthenticated`.
   * On failure, leaves state untouched and re-throws so the caller
   * (typically a form) can surface the error.
   */
  login: (email: string, password: string) => Promise<void>;

  /**
   * Register a new account and sign in immediately.
   *
   * Same success/failure semantics as {@link login}.
   */
  register: (data: RegisterData) => Promise<void>;

  /**
   * Clear local session state and delegate to
   * [authService.logout](../services/authService.ts) for token
   * removal + redirect.
   */
  logout: () => void;

  /**
   * Bootstrap auth state from the persisted token: if a token exists,
   * fetch the current user; otherwise reset to logged-out. Always
   * lands with `isLoading: false`.
   */
  checkAuth: () => Promise<void>;

  /** Imperative setter, primarily for tests and edge flows. */
  setUser: (user: User | null) => void;

  /** Imperative setter, primarily for tests and edge flows. */
  setToken: (token: string | null) => void;
}

function readStoredToken(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: readStoredToken(),
  isAuthenticated: false,
  isLoading: true,

  async login(email, password) {
    try {
      const { token, user } = await authService.login({ email, password });
      set({ token, user, isAuthenticated: true });
    } catch (err) {
      set({ user: null, token: null, isAuthenticated: false });
      throw err;
    }
  },

  async register(data) {
    try {
      const { token, user } = await authService.register(data);
      set({ token, user, isAuthenticated: true });
    } catch (err) {
      set({ user: null, token: null, isAuthenticated: false });
      throw err;
    }
  },

  logout() {
    set({ user: null, token: null, isAuthenticated: false });
    authService.logout();
  },

  async checkAuth() {
    set({ isLoading: true });
    const token = get().token ?? readStoredToken();

    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const user = await authService.getCurrentUser();
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch {
      // Token rejected or network failure — drop the session. authService.logout
      // also clears the persisted token and redirects, matching the 401 path
      // in the api response interceptor.
      set({ isLoading: false });
      get().logout();
    }
  },

  setUser(user) {
    set({ user, isAuthenticated: !!user && !!get().token });
  },

  setToken(token) {
    set({ token, isAuthenticated: !!token && !!get().user });
  },
}));

// Kick off session restoration as soon as the module is imported, so consumers
// can read `isLoading` to gate UI on the bootstrap result.
void useAuthStore.getState().checkAuth();
