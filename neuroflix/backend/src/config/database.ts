/**
 * Database Configuration — Prisma Client Singleton
 * -------------------------------------------------
 * WHY A SINGLETON?
 * ----------------
 * Prisma opens a connection pool to PostgreSQL. If every module that imports
 * this file created its own `new PrismaClient()`, you would quickly exhaust
 * the database's connection limit.
 *
 * In production this is not an issue because the module cache ensures the
 * file is only evaluated once per process. However, during development
 * `nodemon` / hot-reload rebuilds modules while the Node.js process stays
 * alive. Without the global cache below, each hot-reload would create a new
 * PrismaClient (and therefore a new connection pool) without closing the
 * previous one, leading to "too many clients" errors.
 *
 * SOLUTION: store the instance on `global` so it survives module re-evaluation
 * in development, but is NOT persisted on global in production (where hot-reload
 * never happens and we want clean process semantics).
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

// ---------------------------------------------------------------------------
// Augment the Node.js global type so TypeScript accepts `global.prisma`
// ---------------------------------------------------------------------------
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// ---------------------------------------------------------------------------
// Create or reuse the Prisma client instance
//
// Logging strategy:
//   development → log queries, warnings, and errors (helpful for debugging)
//   production  → log errors only (avoid leaking query details in logs)
// ---------------------------------------------------------------------------
const prisma =
  global.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error']
  })

// Cache on global in non-production environments to survive hot-reloads
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export default prisma

// ---------------------------------------------------------------------------
// Connection test
// ---------------------------------------------------------------------------

/**
 * Test the database connection.
 *
 * Useful at server startup to surface misconfigured DATABASE_URL early
 * rather than on the first request.
 *
 * @returns `true` if the connection succeeds, `false` otherwise.
 *
 * @example
 * import { testConnection } from './config/database'
 *
 * await testConnection() // logs result and returns boolean
 */
export async function testConnection(): Promise<boolean> {
  try {
    await prisma.$connect()
    logger.info('Database connected successfully')
    return true
  } catch (error) {
    logger.error('Database connection failed', error)
    return false
  }
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

/**
 * Disconnect the Prisma client and release all pooled connections.
 *
 * Call this before the process exits to avoid "connection was forcibly closed"
 * warnings in PostgreSQL logs.
 */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect()
  logger.info('Database disconnected')
}

// ---------------------------------------------------------------------------
// Process signal handlers
//
// These ensure the connection pool is properly closed whenever the Node.js
// process exits — whether via Ctrl-C (SIGINT), a process manager like PM2
// (SIGTERM), or a natural end-of-event-loop (beforeExit).
// ---------------------------------------------------------------------------

/** beforeExit fires when the event loop is drained but the process has not
 *  yet exited — gives us a chance to perform async cleanup. */
process.on('beforeExit', async () => {
  await disconnect()
})

/** SIGINT is sent by Ctrl-C in a terminal (interactive shutdown). */
process.on('SIGINT', async () => {
  await disconnect()
  process.exit(0)
})

/** SIGTERM is the standard signal sent by process managers (Docker, PM2, etc.)
 *  to request graceful shutdown. */
process.on('SIGTERM', async () => {
  await disconnect()
  process.exit(0)
})
