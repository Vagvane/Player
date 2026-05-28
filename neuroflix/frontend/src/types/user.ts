/**
 * Authenticated viewer / account profile.
 *
 * Mirrors the server-side `users` record, minus credential material.
 */
export interface User {
  /** Stable UUID identifier. */
  id: string;
  /** Login email; also used as the primary contact address. */
  email: string;
  /** Tenant / organization the user belongs to. */
  organization: string;
  /** Given name, when supplied. */
  firstName?: string;
  /** Family name, when supplied. */
  lastName?: string;
  /** Account creation timestamp. */
  createdAt: Date;
}

/**
 * Client-side authentication state held in the auth store.
 *
 * `isAuthenticated` is derived from `token`/`user` presence but kept as a
 * discrete flag so consumers can subscribe to it without reading credentials.
 */
export interface AuthState {
  /** Currently signed-in user, or `null` when logged out. */
  user: User | null;
  /** JWT (or equivalent) bearer token, or `null` when logged out. */
  token: string | null;
  /** Convenience flag: `true` iff a valid session exists. */
  isAuthenticated: boolean;
  /** `true` while an auth request (login, refresh, bootstrap) is in flight. */
  isLoading: boolean;
}

/**
 * Payload submitted to the login endpoint.
 */
export interface LoginCredentials {
  /** Account email. */
  email: string;
  /** Plaintext password; transmitted over TLS only. */
  password: string;
}

/**
 * Payload submitted to the registration endpoint.
 */
export interface RegisterData {
  /** Account email; must be unique. */
  email: string;
  /** Plaintext password meeting server-side complexity rules. */
  password: string;
  /** Tenant / organization the new user belongs to. */
  organization: string;
  /** Given name, when supplied. */
  firstName?: string;
  /** Family name, when supplied. */
  lastName?: string;
}

/**
 * Response body returned by successful login and registration calls.
 */
export interface AuthResponse {
  /** Bearer token to attach to subsequent authenticated requests. */
  token: string;
  /** Profile of the now-authenticated user. */
  user: User;
}
