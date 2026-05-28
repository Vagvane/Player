/**
 * Video Service
 *
 * Communicates with the Neuroflix backend API to update video processing
 * status and persist R2 artefact paths in the database.
 *
 * All mutating calls include exponential-backoff retry logic so transient
 * network failures (connection resets, 5xx responses) do not permanently
 * break the processing pipeline.
 *
 * @module services/video.service
 */

import axios, { AxiosError } from 'axios'
import { logger } from '../utils/logger'

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────

/**
 * Base URL of the Neuroflix backend REST API.
 * Defaults to the local development server when not set.
 */
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3001/api/v1'

/**
 * Shared secret used to authenticate internal calls from the video
 * processor to the backend.  Must match `VIDEO_PROCESSOR_API_KEY` in
 * the backend `.env`.
 */
const API_KEY = process.env.VIDEO_PROCESSOR_API_KEY

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/** All possible video lifecycle statuses tracked in the database. */
type VideoStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED'

/**
 * Optional R2 storage paths that are persisted alongside a status
 * transition to `READY`.
 */
interface VideoPaths {
  /** R2 key for the HLS master playlist, e.g. `"videos/abc/master.m3u8"` */
  hlsPath?: string
  /** R2 key for the WebVTT thumbnail file, e.g. `"videos/abc/thumbnails.vtt"` */
  thumbnailVttPath?: string
  /** R2 key for the thumbnail sprite image, e.g. `"videos/abc/sprite.jpg"` */
  spritePath?: string
  /** Duration of the video in seconds */
  duration?: number        // ← add this line

}

// ─────────────────────────────────────────────
// Retry Helper
// ─────────────────────────────────────────────

/**
 * Retry configuration for network calls.
 */
const RETRY_CONFIG = {
  /** Maximum number of attempts (1 initial + N retries). */
  maxAttempts: 4,
  /** Base delay in milliseconds; doubles on each subsequent attempt. */
  baseDelayMs: 1000
}

/**
 * Determine whether an Axios error is worth retrying.
 *
 * Retries on:
 * - Network errors (no response received)
 * - HTTP 5xx server errors
 * - HTTP 429 Too Many Requests
 *
 * Does **not** retry on HTTP 4xx client errors (except 429) because
 * those indicate a programming problem, not a transient failure.
 *
 * @param error - The caught error
 * @returns `true` if the request should be retried
 */
function isRetryable(error: unknown): boolean {
  if (!(error instanceof AxiosError)) return false

  // No response → network-level failure
  if (!error.response) return true

  const status = error.response.status
  return status === 429 || status >= 500
}

/**
 * Delay execution for a given number of milliseconds.
 *
 * @param ms - Milliseconds to wait
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute an async operation with exponential-backoff retries.
 *
 * @param operation   - Async function to execute
 * @param description - Human-readable label used in log messages
 * @returns The resolved value of the operation
 * @throws The last error if all attempts are exhausted
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  description: string
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      const isLast = attempt === RETRY_CONFIG.maxAttempts
      if (isLast || !isRetryable(error)) {
        break
      }

      const delayMs = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt - 1)
      logger.warn(
        `⚠️  ${description} failed (attempt ${attempt}/${RETRY_CONFIG.maxAttempts}). ` +
        `Retrying in ${delayMs}ms...`
      )
      await sleep(delayMs)
    }
  }

  throw lastError
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Update a video's processing status in the database via the backend API.
 *
 * Sends a `PATCH /videos/:videoId/status` request with the new status
 * and, optionally, the R2 storage paths for the processed artefacts.
 * The request is authenticated using the `X-API-Key` header.
 *
 * The call is automatically retried up to {@link RETRY_CONFIG.maxAttempts}
 * times with exponential back-off on transient network or server errors.
 *
 * @param videoId - Unique identifier of the video record to update
 * @param status  - New lifecycle status to persist
 * @param paths   - R2 artefact paths to store alongside a `READY` transition
 *
 * @throws {Error} When the backend returns a non-retryable error or all
 *                 retry attempts are exhausted.
 *
 * @example
 * ```typescript
 * // Mark as processing
 * await updateVideoStatus('abc-123', 'PROCESSING')
 *
 * // Mark as ready with R2 paths
 * await updateVideoStatus('abc-123', 'READY', {
 *   hlsPath: 'videos/abc-123/master.m3u8',
 *   thumbnailVttPath: 'videos/abc-123/thumbnails.vtt',
 *   spritePath: 'videos/abc-123/sprite.jpg'
 * })
 * ```
 */
export async function updateVideoStatus(
  videoId: string,
  status: VideoStatus,
  paths?: VideoPaths
): Promise<void> {
  logger.info(`📝 Updating video status: ${videoId} -> ${status}`)

  await withRetry(async () => {
    await axios.patch(
      `${BACKEND_API_URL}/videos/${videoId}/status`,
      { status, ...paths },
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        },
        // Fail fast so retries aren't delayed by a hanging connection
        timeout: 10_000
      }
    )
  }, `updateVideoStatus(${videoId}, ${status})`)

  logger.info(`✅ Video status updated: ${videoId} -> ${status}`)
}
