/**
 * @file app.ts
 * @description Express application factory - configures all middleware, routes, and error handlers.
 *
 * Middleware order matters:
 *  1. Security (helmet, CORS)
 *  2. Body parsing
 *  3. Logging
 *  4. Rate limiting
 *  5. Routes
 *  6. 404 handler
 *  7. Global error handler  ← must be last
 */

import express, { Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { corsOptions, logCorsConfig } from './config/cors.config'
import { apiConfig } from './config/app.config'
import { requestLogger } from './utils/logger'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware'
import { apiRateLimiter } from './middleware/rateLimiter.middleware'
import routes from './routes'

/**
 * Create and configure a fully-initialised Express application.
 *
 * Extracts all app setup into a factory function so the server entry-point
 * (`server.ts`) stays clean and the app can be imported in integration tests
 * without actually binding to a port.
 *
 * @returns Configured {@link Express} instance ready to listen.
 *
 * @example
 * ```ts
 * import { createApp } from './app'
 *
 * const app = createApp()
 * app.listen(3001, () => console.log('Running on :3001'))
 * ```
 */
export function createApp(): Express {
  const app = express()

  // -------------------------------------------------------------------------
  // 1. Security middleware
  // -------------------------------------------------------------------------

  /**
   * helmet sets a collection of protective HTTP headers.
   * contentSecurityPolicy and crossOriginEmbedderPolicy are disabled here
   * because the HLS player loads resources from external origins (R2 CDN).
   * Re-enable and tune these rules before going to production.
   */
  app.use(
    helmet({
      contentSecurityPolicy: false, // TODO: enable with HLS-compatible policy in production
      crossOriginEmbedderPolicy: false, // Required for video streaming cross-origin resources
      crossOriginResourcePolicy: { policy: 'cross-origin' } // Allow frontend (port 5173) to load media from backend (port 3001)
    })
  )

  // -------------------------------------------------------------------------
  // 2. CORS
  // -------------------------------------------------------------------------

  /**
   * Apply CORS options defined in cors.config.ts.
   * Allowed origins come from the FRONTEND_URL environment variable plus a
   * hard-coded list of known development origins.
   */
  app.use(cors(corsOptions))
  logCorsConfig() // Logs active origins to console on startup

  // -------------------------------------------------------------------------
  // 3. Body parsing
  // -------------------------------------------------------------------------

  /**
   * Parse JSON bodies up to 10 MB.
   * Larger payloads (video files) are handled by multer in the upload route.
   */
  app.use(express.json({ limit: '10mb' }))

  /**
   * Parse URL-encoded bodies (HTML form submissions).
   */
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // -------------------------------------------------------------------------
  // 4. Logging
  // -------------------------------------------------------------------------

  /**
   * morgan provides concise HTTP request logs in development.
   * The custom requestLogger middleware runs in all environments and emits
   * structured log lines compatible with the project's logger utility.
   */
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
  }
  app.use(requestLogger)

  // -------------------------------------------------------------------------
  // 5. Rate limiting
  // -------------------------------------------------------------------------

  /**
   * General rate limiter applied to every API route (100 req / 15 min / IP).
   * Individual route groups (auth, upload, streaming) apply stricter limits
   * on top of this baseline via their own middleware chains.
   */
  app.use(apiRateLimiter)

  // -------------------------------------------------------------------------
  // 6. API routes
  // -------------------------------------------------------------------------

  /**
   * All versioned API routes are mounted under `apiConfig.basePath`
   * (defaults to `/api/v1`).
   */
  app.use(apiConfig.basePath, routes)

  // -------------------------------------------------------------------------
  // 7. Root endpoint
  // -------------------------------------------------------------------------

  /**
   * Simple discovery endpoint at `/` that advertises the available API paths.
   * Useful for confirming the server is reachable and for quick navigation.
   */
  app.get('/', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'Welcome to Neuroflix API',
      version: '1.0.0',
      endpoints: {
        health: `${apiConfig.basePath}/health`,
        auth: `${apiConfig.basePath}/auth`,
        videos: `${apiConfig.basePath}/videos`,
        checkpoints: `${apiConfig.basePath}/checkpoints`,
        upload: `${apiConfig.basePath}/upload`
      }
    })
  })

  // -------------------------------------------------------------------------
  // 8. 404 handler  (must come after all routes)
  // -------------------------------------------------------------------------

  /**
   * Catches any request that did not match a registered route and returns a
   * consistent 404 JSON response instead of the default Express HTML page.
   */
  app.use(notFoundHandler)

  // -------------------------------------------------------------------------
  // 9. Global error handler  (must be last)
  // -------------------------------------------------------------------------

  /**
   * Centralised error handler.  Express recognises it as an error-handling
   * middleware because it declares four parameters (err, req, res, next).
   * All errors thrown or passed via `next(err)` anywhere in the stack end up
   * here and are formatted into a consistent `ApiErrorResponse` shape.
   */
  app.use(errorHandler)

  return app
}
