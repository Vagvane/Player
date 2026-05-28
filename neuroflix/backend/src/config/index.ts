/**
 * Configuration barrel export
 *
 * Re-exports every public symbol from all configuration modules so that
 * consumers can import from a single path:
 *
 * @example
 * import { env, videoConfig, prisma, testConnection } from '../config'
 */

export * from './app.config'
export * from './jwt.config'
export * from './r2.config'
export * from './cors.config'
export { default as prisma } from './database'
export { testConnection, disconnect } from './database'
