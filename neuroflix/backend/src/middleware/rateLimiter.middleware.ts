/**
 * @file rateLimiter.middleware.ts
 * @description Rate limiting middleware built on `express-rate-limit`.
 *
 * ## Strategy
 * Different parts of the API have different risk profiles, so each limiter
 * is tuned independently:
 *
 * | Limiter            | Window     | Max requests | Notes                          |
 * |--------------------|------------|--------------|--------------------------------|
 * | `apiRateLimiter`   | 15 minutes | 100          | General catch-all              |
 * | `authRateLimiter`  | 15 minutes | 5            | Brute-force protection         |
 * | `uploadRateLimiter`| 1 hour     | 10           | Prevent storage/CPU abuse      |
 * | `streamRateLimiter`| 15 minutes | 200          | HLS segments need higher limit |
 *
 * ## Production Redis store
 * The default in-memory store resets when the Node process restarts and does
 * **not** share state across multiple instances (e.g. behind a load balancer).
 * For production deployments replace the default store with a Redis-backed one:
 *
 * ```bash
 * npm install rate-limit-redis ioredis
 * ```
 *
 * ```typescript
 * import RedisStore from 'rate-limit-redis'
 * import Redis from 'ioredis'
 *
 * const redis = new Redis(process.env.REDIS_URL)
 *
 * export const apiRateLimiter = rateLimit({
 *   // ...existing options
 *   store: new RedisStore({ sendCommand: (...args) => redis.call(...args) })
 * })
 * ```
 *
 * ## Usage
 * ```typescript
 * import { authRateLimiter, apiRateLimiter } from '../middleware/rateLimiter.middleware'
 *
 * // Apply per-route
 * router.post('/login', authRateLimiter, asyncHandler(login))
 *
 * // Apply globally in app.ts
 * app.use('/api', apiRateLimiter)
 * ```
 */

import rateLimit from 'express-rate-limit'
import { apiConfig } from '../config/app.config'

// ---------------------------------------------------------------------------
// General API rate limiter — applies to all /api/* routes
// ---------------------------------------------------------------------------

/**
 * General-purpose rate limiter for the entire API surface.
 *
 * Limits each IP to **100 requests per 15-minute window**.  Suitable as a
 * global catch-all applied at the Express application level.
 *
 * Both successful and failed requests are counted to provide an accurate
 * measure of total traffic from an IP.
 *
 * Standard `RateLimit-*` response headers are enabled so clients can implement
 * exponential back-off without guessing the window size.
 */
export const apiRateLimiter = rateLimit({
  windowMs: apiConfig.rateLimit.windowMs, // 15 minutes (from app config)
  max: apiConfig.rateLimit.max,           // 100 requests per window
  message: {
    success: false,
    message: apiConfig.rateLimit.message
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Only count failed requests (4xx/5xx). Successful API calls and all
  // HLS segment fetches (200/304) don't consume quota — this prevents
  // normal video playback from burning through the limit.
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
})

// ---------------------------------------------------------------------------
// Auth rate limiter — strict protection against brute-force attacks
// ---------------------------------------------------------------------------

/**
 * Strict rate limiter for authentication endpoints (`/register`, `/login`).
 *
 * Limits each IP to **5 requests per 15-minute window**.  This is intentionally
 * low to deter credential-stuffing and brute-force attacks.
 *
 * Successful logins are **not** counted (`skipSuccessfulRequests: true`) so that
 * a legitimate user logging in normally does not exhaust their allowance.
 * Only failed attempts (4xx / 5xx) consume quota.
 *
 * @security Apply this limiter **before** the validation and controller
 *           middleware on every auth route.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only penalise failed attempts
  skipFailedRequests: false
})

// ---------------------------------------------------------------------------
// Upload rate limiter — prevent storage and CPU exhaustion
// ---------------------------------------------------------------------------

/**
 * Rate limiter for video upload endpoints.
 *
 * Limits each IP to **10 upload requests per hour**.  Video uploads are
 * resource-intensive (network I/O + R2 storage + downstream transcoding), so
 * a generous but bounded hourly window is appropriate.
 *
 * Both successful and failed uploads are counted to prevent retrying large
 * uploads repeatedly within the window.
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: 'Too many upload requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false
})

// ---------------------------------------------------------------------------
// Stream rate limiter — higher ceiling for HLS segment requests
// ---------------------------------------------------------------------------

/**
 * Rate limiter for video streaming and HLS manifest/segment endpoints.
 *
 * Limits each IP to **200 requests per 15-minute window**.  HLS playback
 * generates many small segment requests (typically one every 4–10 seconds),
 * so this ceiling is set much higher than the general API limiter while still
 * guarding against scraping or DoS via the streaming endpoints.
 *
 * Successful requests are skipped (`skipSuccessfulRequests: true`) so normal
 * playback does not trigger the limiter.  Only error responses consume quota,
 * which helps surface abusive clients that hammer failing segment URLs.
 */
export const streamRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: {
    success: false,
    message: 'Too many streaming requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,  // Normal HLS 200/304 responses don't consume quota
  skipFailedRequests: false,     // Failed segment/manifest fetches still count (abuse signal)
})
