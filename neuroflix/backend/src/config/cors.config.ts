/**
 * CORS Configuration
 *
 * Cross-Origin Resource Sharing (CORS) controls which browser origins are
 * permitted to make requests to this API. Misconfigured CORS can expose the
 * API to cross-site request forgery (CSRF) and data-theft attacks, so the
 * allowed-origins list must be kept tight in production.
 *
 * ## How it works
 * Browsers send a preflight OPTIONS request before any "non-simple" request
 * (e.g. with an Authorization header). The server must respond with the
 * appropriate `Access-Control-*` headers for the browser to proceed.
 * Express's `cors` middleware handles all of that automatically given the
 * options below.
 *
 * ## Production setup
 * Set the `FRONTEND_URL` environment variable to your deployed frontend origin,
 * e.g. `https://neuroflix.vercel.app`. Only that origin (plus localhost during
 * development) will be allowed. Never use a wildcard (`*`) alongside
 * `credentials: true` – browsers will reject such responses.
 *
 * ## Development mode
 * When `NODE_ENV=development` the origin check is bypassed entirely so that
 * tools like Postman, curl, and any local dev server can reach the API without
 * needing to be on the allow-list.
 */

import { CorsOptions } from 'cors'
import { logger } from '../utils/logger'

// ---------------------------------------------------------------------------
// Allowed origins
// ---------------------------------------------------------------------------

/**
 * Explicit list of browser origins that may call this API.
 *
 * - `http://localhost:5173` – default Vite dev server port
 * - `http://localhost:3000` – common alternative / CRA dev server port
 * - `process.env.FRONTEND_URL` – production frontend (set in deployment env)
 *
 * `filter(Boolean)` removes the `undefined` entry when `FRONTEND_URL` is not
 * set, preventing false-positive matches against empty strings.
 */
const allowedOrigins = [
  'http://localhost:5173', // Vite dev server
  'http://localhost:3000', // Alternative dev port
  process.env.FRONTEND_URL // Production frontend URL (e.g. Vercel)
].filter(Boolean) as string[]

// ---------------------------------------------------------------------------
// CORS options
// ---------------------------------------------------------------------------

/**
 * CORS options passed to the `cors()` Express middleware.
 *
 * @security `credentials: true` enables cookies and the `Authorization`
 * header to be sent cross-origin. This REQUIRES a specific origin (not `*`)
 * to be returned in the `Access-Control-Allow-Origin` response header.
 */
export const corsOptions: CorsOptions = {
  /**
   * Dynamic origin checker.
   *
   * - Requests with no `Origin` header (server-to-server, Postman, curl) are
   *   always allowed.
   * - Browser requests are allowed only if their origin appears in
   *   `allowedOrigins`.
   */
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) {
      return callback(null, true)
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },

  /** Allow cookies and the Authorization header to be sent cross-origin. */
  credentials: true,

  /** HTTP methods the browser may use in cross-origin requests. */
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  /**
   * Request headers the browser is allowed to send.
   * `Authorization` is required for JWT bearer token authentication.
   */
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],

  /**
   * Response headers that JavaScript running in the browser is permitted to
   * read (beyond the default "safe" headers).
   */
  exposedHeaders: ['Content-Length', 'Content-Type'],

  /**
   * How long (seconds) the browser may cache the preflight response.
   * 86 400 s = 24 hours – reduces the number of preflight round-trips.
   */
  maxAge: 86400,

  /**
   * Return HTTP 200 (not 204) for OPTIONS preflight requests.
   * Some older browsers (IE 11) treat 204 as an error.
   */
  optionsSuccessStatus: 200
}

// ---------------------------------------------------------------------------
// Development override – allow all origins
// ---------------------------------------------------------------------------

/**
 * In development mode the strict origin whitelist is replaced with `true`,
 * which tells the `cors` middleware to echo back whatever `Origin` the client
 * sends. This makes local development frictionless without weakening
 * production security.
 *
 * @security NEVER set `origin: true` in production.
 */
if (process.env.NODE_ENV === 'development') {
  corsOptions.origin = true
  logger.warn('CORS: Allowing all origins (development mode)')
}

// ---------------------------------------------------------------------------
// Helper: log active CORS configuration
// ---------------------------------------------------------------------------

/**
 * Print the active CORS configuration to stdout.
 *
 * Call this during server startup to make the security posture visible in
 * logs, especially useful when debugging CORS issues in staging environments.
 *
 * @example
 * import { logCorsConfig } from './config/cors.config'
 * logCorsConfig()
 */
export function logCorsConfig(): void {
  logger.info(`CORS origins: ${allowedOrigins.join(', ')} | credentials: ${String(corsOptions.credentials)} | methods: ${(corsOptions.methods as string[]).join(', ')}`)
}
