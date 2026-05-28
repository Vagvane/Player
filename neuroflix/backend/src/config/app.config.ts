/**
 * Application Configuration Constants
 *
 * Single source of truth for all application-wide settings.
 * Values are derived from environment variables where appropriate,
 * with safe defaults for local development.
 *
 * Import individual named exports for tree-shaking, or import
 * `appConfig` for a single object containing all sections.
 */

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

/**
 * Runtime environment flags.
 *
 * @property NODE_ENV       - Raw NODE_ENV string (default: 'development')
 * @property PORT           - HTTP port the server listens on (default: 3001)
 * @property isDevelopment  - `true` when NODE_ENV === 'development'
 * @property isProduction   - `true` when NODE_ENV === 'production'
 * @property isTest         - `true` when NODE_ENV === 'test'
 */
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test'
}

// ---------------------------------------------------------------------------
// API configuration
// ---------------------------------------------------------------------------

/**
 * API routing and rate-limiting settings.
 *
 * @property prefix    - URL prefix for all API routes (`/api`)
 * @property version   - Current API version string (`v1`)
 * @property basePath  - Combined base path used in route registration
 * @property rateLimit - Default rate-limit window and request cap applied to
 *                       all API routes via the `apiRateLimiter` middleware
 */
export const apiConfig = {
  prefix: '/api',
  version: 'v1',
  basePath: '/api/v1',
  rateLimit: {
    /** Rolling window duration in milliseconds (15 minutes) */
    windowMs: 15 * 60 * 1000,
    /** Maximum number of requests allowed per IP per window */
    max: 100,
    /** Message returned to the client when the limit is exceeded */
    message: 'Too many requests, please try again later.'
  }
}

// ---------------------------------------------------------------------------
// Security configuration
// ---------------------------------------------------------------------------

/**
 * Authentication and password security settings.
 *
 * @property bcryptRounds     - Cost factor passed to `bcrypt.genSalt`.
 *                              Higher values are more secure but slower.
 *                              10 rounds ≈ 100 ms on a modern CPU.
 * @property passwordMinLength - Minimum accepted password length
 * @property passwordMaxLength - Maximum accepted password length
 *                              (prevents DoS via extremely long inputs)
 * @property sessionDuration  - JWT / session lifetime in milliseconds (24 h)
 */
export const securityConfig = {
  bcryptRounds: 10,
  passwordMinLength: 6,
  passwordMaxLength: 128,
  sessionDuration: 24 * 60 * 60 * 1000 // 24 hours in ms
}

// ---------------------------------------------------------------------------
// Video configuration
// ---------------------------------------------------------------------------

/**
 * Video upload, processing, and streaming settings.
 *
 * @property maxUploadSize      - Maximum accepted file size in bytes (5 GB)
 * @property allowedFormats     - Accepted file extension list (without dot)
 * @property allowedMimeTypes   - MIME types corresponding to `allowedFormats`
 * @property signedUrlExpiry    - Lifetime of R2 pre-signed URLs in seconds (1 h)
 * @property hlsSegmentDuration - HLS segment length in seconds used by FFmpeg
 * @property qualities          - Ordered list of output renditions for ABR.
 *                                The video processor creates one HLS stream per entry.
 */
export const videoConfig = {
  /** 5 GB – multer / busboy file size limit */
  maxUploadSize: 1024 * 1024 * 1024 * 5,

  allowedFormats: ['mp4', 'mov', 'avi', 'mkv'],

  allowedMimeTypes: [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska'
  ],

  /** Pre-signed URL expiry – balance between security and HLS playlist lifetime */
  signedUrlExpiry: 3600,

  /** FFmpeg `-hls_time` value – shorter segments reduce seek latency */
  hlsSegmentDuration: 4,

  qualities: [
    { name: '1080p', height: 1080, bitrate: '5000k' },
    { name: '720p', height: 720, bitrate: '2500k' },
    { name: '480p', height: 480, bitrate: '1000k' },
    { name: '360p', height: 360, bitrate: '500k' }
  ]
}

// ---------------------------------------------------------------------------
// Validation rules
// ---------------------------------------------------------------------------

/**
 * Field-level validation constraints shared between the validator middleware
 * and any client-side display logic.
 *
 * Centralising these here ensures the same limits are enforced everywhere
 * without duplication.
 */
export const validationRules = {
  email: {
    /** RFC 5321 maximum email length */
    maxLength: 255,
    /** Simple format check – `express-validator` `isEmail()` is the primary guard */
    regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  organization: {
    minLength: 2,
    maxLength: 100
  },
  videoTitle: {
    minLength: 3,
    maxLength: 200
  },
  videoDescription: {
    maxLength: 1000
  }
}

// ---------------------------------------------------------------------------
// Logging configuration
// ---------------------------------------------------------------------------

/**
 * Logger behaviour settings consumed by `src/utils/logger.ts`.
 *
 * @property level       - Minimum log level: `'debug'` locally, `'info'` in prod
 * @property format      - Output format: `'pretty'` (coloured) locally,
 *                         `'json'` in production for log aggregation tools
 * @property logRequests - Whether to emit an info/warn/error line per HTTP request
 * @property logErrors   - Whether to emit full error details (stack traces) via logger
 */
export const loggingConfig = {
  level: env.isDevelopment ? 'debug' : 'info',
  format: env.isDevelopment ? 'pretty' : 'json',
  logRequests: true,
  logErrors: true
}

// ---------------------------------------------------------------------------
// Aggregate export
// ---------------------------------------------------------------------------

/**
 * All application configuration sections combined into a single object.
 *
 * Prefer importing the individual named exports (`env`, `videoConfig`, etc.)
 * when only one section is needed to keep bundle sizes small.
 *
 * @example
 * import { appConfig } from './config/app.config'
 * console.log(appConfig.env.PORT)
 */
export const appConfig = {
  env,
  api: apiConfig,
  security: securityConfig,
  video: videoConfig,
  validation: validationRules,
  logging: loggingConfig
}
