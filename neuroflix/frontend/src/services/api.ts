import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

/**
 * Storage key used to persist the bearer token. Kept in one place so a
 * single edit migrates everything that reads/writes the token.
 */
const TOKEN_STORAGE_KEY = 'token';

/**
 * Resolve the API base URL.
 *
 * Vite exposes env vars on `import.meta.env`, not `process.env`. Anything
 * prefixed `VITE_` is inlined at build time; the localhost fallback keeps
 * the dev experience zero-config.
 */
const API_BASE_URL =
  (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ??
  'http://localhost:3001';

/**
 * Custom DOM event dispatched by the response interceptor when a user-
 * visible API failure occurs. A global toast/snackbar listener can
 * subscribe via `window.addEventListener('api:error', ...)` without
 * coupling the client to any specific UI library.
 */
export const API_ERROR_EVENT = 'api:error';

/** Shape of the `detail` payload attached to {@link API_ERROR_EVENT}. */
export interface ApiErrorEventDetail {
  /** HTTP status, or `0` for network/timeout failures. */
  status: number;
  /** Human-readable message suitable for surfacing in UI. */
  message: string;
}

function emitApiError(detail: ApiErrorEventDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ApiErrorEventDetail>(API_ERROR_EVENT, { detail }));
}

/**
 * Pre-configured Axios instance for all backend calls.
 *
 * - Bearer token is auto-attached from `localStorage` via a request
 *   interceptor — callers do not have to think about auth headers.
 * - The response interceptor unwraps `response.data` on success so
 *   call sites get the payload directly (`const user = await api.get<User>(...)`).
 * - 401 responses clear the stored token and force a redirect to
 *   `/login`, putting the app in a known logged-out state.
 * - Network failures and other errors are surfaced both via the
 *   {@link API_ERROR_EVENT} window event (for UI toasts) and by
 *   rejecting the promise with a normalized error payload.
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Request interceptor: attach `Authorization: Bearer <token>` when a
 * token is present. Reads `localStorage` defensively — a thrown
 * SecurityError (e.g. disabled storage in private mode) must not abort
 * the request, so we swallow it and let the call proceed unauthenticated.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      const token =
        typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    } catch {
      // localStorage unavailable — proceed without auth header.
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Response interceptor:
 *   - Success path: return `response.data` so callers receive the
 *     payload directly instead of an AxiosResponse wrapper.
 *   - 401: clear stored token, dispatch an api:error event, and force
 *     a redirect to `/login`.
 *   - Network / timeout (no `error.response`): emit a "Network error"
 *     event so the UI can show a toast.
 *   - Other errors: emit the server-provided message (if any) and
 *     reject with the structured error body.
 */
apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status ?? 0;

    if (status === 401) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      } catch {
        // ignore storage errors
      }

      emitApiError({ status: 401, message: 'Session expired. Please sign in again.' });

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }

      return Promise.reject(error.response?.data ?? { message: 'Unauthorized' });
    }

    if (!error.response) {
      const message = error.code === 'ECONNABORTED' ? 'Request timed out' : 'Network error';
      emitApiError({ status: 0, message });
      return Promise.reject({ message });
    }

    const serverMessage =
      error.response.data?.message ?? error.message ?? 'Request failed';
    emitApiError({ status, message: serverMessage });
    // Spread the server body but always include `status` so downstream
    // handlers (videoService.isTransient, useVideoData.isRetryable) can
    // read the HTTP status code without re-parsing the response.
    return Promise.reject({
      ...(error.response.data ?? {}),
      message: serverMessage,
      status,
    });
  },
);

export default apiClient;
