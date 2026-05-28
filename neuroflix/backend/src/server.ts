/**
 * @file server.ts
 * @description Main server entry point for the Neuroflix backend.
 *
 * Responsibilities:
 *  - Verify external service connectivity (PostgreSQL via Prisma, Cloudflare R2)
 *  - Create and configure the Express application via `createApp()`
 *  - Bind the HTTP server to the configured port
 *  - Register OS signal handlers for graceful shutdown (SIGTERM / SIGINT)
 *
 * Startup sequence:
 *  1. Test database connection  → abort if unavailable
 *  2. Test R2 connection        → warn but continue if unavailable
 *  3. Create Express app
 *  4. Start HTTP listener
 *  5. Register shutdown handlers
 */

import 'dotenv/config'
import { createApp } from './app'
import { env } from './config/app.config'
import { testConnection } from './config/database'
import { testR2Connection } from './config/r2.config'
import { logger } from './utils/logger'

/**
 * Bootstrap and start the Express HTTP server.
 *
 * The function is intentionally `async` so that each pre-flight check can be
 * awaited before the server starts accepting traffic. Any unrecoverable error
 * during startup will cause the process to exit with code 1.
 *
 * @returns {Promise<void>} Resolves after the server is listening (never
 *   rejects — errors are caught internally and trigger `process.exit(1)`).
 */
async function startServer(): Promise<void> {
  try {
    logger.info('🚀 Starting Neuroflix Backend Server...')

    // -----------------------------------------------------------------------
    // 1. Database connectivity check
    // -----------------------------------------------------------------------

    /**
     * A failed database connection is fatal: the API cannot serve any
     * meaningful request without Prisma/PostgreSQL, so we throw immediately
     * to prevent a partially-working server from accepting traffic.
     */
    logger.info('📦 Testing database connection...')
    const dbConnected = await testConnection()
    if (!dbConnected) {
      throw new Error('Database connection failed')
    }
    logger.info('✅ Database connection established')

    // -----------------------------------------------------------------------
    // 2. Cloudflare R2 connectivity check
    // -----------------------------------------------------------------------

    /**
     * An R2 failure is non-fatal: read-only endpoints (video list, progress)
     * will still work. Only upload/streaming routes will be affected, so we
     * log a warning instead of aborting.
     */
    logger.info('☁️  Testing Cloudflare R2 connection...')
    const r2Connected = await testR2Connection()
    if (!r2Connected) {
      logger.warn('⚠️  R2 connection failed - uploads and signed URLs will not work')
    } else {
      logger.info('✅ Cloudflare R2 connection established')
    }

    // -----------------------------------------------------------------------
    // 3. Create Express application
    // -----------------------------------------------------------------------

    const app = createApp()

    // -----------------------------------------------------------------------
    // 4. Start HTTP server
    // -----------------------------------------------------------------------

    const server = app.listen(env.PORT, () => {
      logger.info('✅ Server started successfully!')
      logger.info(`🌍 Environment: ${env.NODE_ENV}`)
      logger.info(`🔗 Server running on:  http://localhost:${env.PORT}`)
      logger.info(`📡 API Base Path:      http://localhost:${env.PORT}/api/v1`)
      logger.info(`💓 Health Check:       http://localhost:${env.PORT}/api/v1/health`)
    })

    // -----------------------------------------------------------------------
    // 5. Graceful shutdown handler
    // -----------------------------------------------------------------------

    /**
     * Attempt to shut down cleanly when the process receives a termination
     * signal. Steps:
     *  a) Stop accepting new HTTP connections (`server.close`)
     *  b) Disconnect the Prisma client (flushes connection pool)
     *  c) Exit with code 0
     *
     * A 10-second safety timeout forces an exit if the server stalls during
     * shutdown (e.g. long-running requests or hung DB queries).
     *
     * @param signal - The OS signal name (e.g. `'SIGTERM'`, `'SIGINT'`).
     */
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`)

      // Force-kill after 10 s to avoid hanging indefinitely
      const forceExitTimer = setTimeout(() => {
        logger.error('❌ Forced shutdown after timeout (10 s)')
        process.exit(1)
      }, 10_000)

      // Allow the timer to be garbage-collected without blocking Node's event loop
      forceExitTimer.unref()

      server.close(async () => {
        logger.info('✅ HTTP server closed — no longer accepting connections')

        try {
          // Dynamic import keeps the top-level import list clean and avoids a
          // circular-dependency risk when `database` imports from `config`.
          const { disconnect } = await import('./config/database')
          await disconnect()
          logger.info('✅ Database connection closed')
        } catch (dbErr) {
          logger.error('Error while disconnecting database', dbErr)
        }

        clearTimeout(forceExitTimer)
        logger.info('👋 Graceful shutdown complete')
        process.exit(0)
      })
    }

    // Register OS signal handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM')) // Sent by container orchestrators (Docker, k8s)
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))   // Ctrl+C in terminal

    // Handle unexpected promise rejections so they are logged before the
    // process crashes (Node ≥ 15 terminates on unhandled rejections by default)
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection', reason)
    })

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception — shutting down', error)
      gracefulShutdown('uncaughtException')
    })

  } catch (error) {
    // Any error thrown before the server starts is unrecoverable
    logger.error('❌ Server startup failed:', error)
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

startServer()
