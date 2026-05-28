/**
 * Logger Utility for Video Processor
 *
 * A lightweight, coloured console logger tailored for the Neuroflix video
 * processing pipeline. Includes standard log levels (info, warn, error, debug)
 * as well as processing-specific convenience methods for transcoding and
 * thumbnail events.
 *
 * Colour output uses ANSI escape codes and works in Windows Terminal,
 * PowerShell 7+, and most CI environments. Colours are embedded directly in
 * the formatted string so no external dependency is required.
 *
 * @module logger
 */

/**
 * Singleton logger for the video processor.
 *
 * Usage:
 * ```typescript
 * import { logger } from './logger'
 *
 * logger.info('Starting job', { videoId: 'abc123' })
 * logger.error('Job failed', new Error('timeout'))
 * logger.logTranscodeStart('abc123', '1080p')
 * ```
 */
class Logger {
  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Format a log entry with ANSI colour, ISO timestamp, level tag, message,
   * and optional JSON-serialised metadata.
   *
   * @param level   - Log level label (INFO | WARN | ERROR | DEBUG).
   * @param message - Human-readable message string.
   * @param meta    - Optional structured data to append as indented JSON.
   * @returns The fully formatted log line ready for console output.
   */
  private formatMessage(level: string, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString()

    /** ANSI colour codes keyed by log level */
    const colors: Record<string, string> = {
      INFO:  '\x1b[32m', // Green
      WARN:  '\x1b[33m', // Yellow
      ERROR: '\x1b[31m', // Red
      DEBUG: '\x1b[36m'  // Cyan
    }

    const reset = '\x1b[0m'
    const color = colors[level] ?? ''

    let formatted = `${color}[${level}]${reset} ${timestamp} - ${message}`

    if (meta !== undefined && meta !== null) {
      try {
        formatted += `\n  ${JSON.stringify(meta, null, 2)}`
      } catch {
        formatted += `\n  [unserializable meta]`
      }
    }

    return formatted
  }

  // ---------------------------------------------------------------------------
  // Standard log levels
  // ---------------------------------------------------------------------------

  /**
   * Log an informational message (green).
   *
   * Use for normal operational events such as job start/complete, file
   * creation, and status transitions.
   *
   * @param message - Descriptive message.
   * @param meta    - Optional structured data to include.
   *
   * @example
   * logger.info('HLS transcoding started', { videoId, quality })
   */
  info(message: string, meta?: unknown): void {
    console.log(this.formatMessage('INFO', message, meta))
  }

  /**
   * Log a warning message (yellow).
   *
   * Use for recoverable issues or skipped operations that do not stop
   * processing but warrant attention (e.g. skipping an upscale quality tier).
   *
   * @param message - Descriptive warning message.
   * @param meta    - Optional structured data.
   *
   * @example
   * logger.warn('Skipping 1080p – source resolution too low')
   */
  warn(message: string, meta?: unknown): void {
    console.warn(this.formatMessage('WARN', message, meta))
  }

  /**
   * Log an error message (red).
   *
   * Accepts either an `Error` instance (stack trace is extracted) or any
   * arbitrary value (serialised as-is).
   *
   * @param message - Description of what failed.
   * @param error   - The caught error or any supplementary data.
   *
   * @example
   * logger.error('FFmpeg transcoding failed', err)
   */
  error(message: string, error?: Error | unknown): void {
    const meta =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error

    console.error(this.formatMessage('ERROR', message, meta))
  }

  /**
   * Log a debug message (cyan).
   *
   * Output is suppressed unless `NODE_ENV` is `"development"`. Use for
   * verbose, high-frequency diagnostics such as per-frame progress events.
   *
   * @param message - Diagnostic message.
   * @param meta    - Optional structured data.
   *
   * @example
   * logger.debug('FFmpeg progress', { elapsed: '00:01:23' })
   */
  debug(message: string, meta?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('DEBUG', message, meta))
    }
  }

  // ---------------------------------------------------------------------------
  // Video processing convenience methods
  // ---------------------------------------------------------------------------

  /**
   * Log the start of a transcoding operation for a specific quality tier.
   *
   * @param videoId - Unique video identifier.
   * @param quality - Quality label, e.g. `"1080p"`.
   *
   * @example
   * logger.logTranscodeStart('abc123', '720p')
   * // [INFO] 2026-05-25T… - 🎬 Starting transcoding: abc123 (720p)
   */
  logTranscodeStart(videoId: string, quality: string): void {
    this.info(`🎬 Starting transcoding: ${videoId} (${quality})`)
  }

  /**
   * Log successful completion of a transcoding operation.
   *
   * @param videoId  - Unique video identifier.
   * @param quality  - Quality label that was transcoded.
   * @param duration - Elapsed wall-clock time in seconds.
   *
   * @example
   * logger.logTranscodeComplete('abc123', '720p', 142)
   * // [INFO] 2026-05-25T… - ✅ Transcoding complete: abc123 (720p) in 142s
   */
  logTranscodeComplete(videoId: string, quality: string, duration: number): void {
    this.info(`✅ Transcoding complete: ${videoId} (${quality}) in ${duration}s`)
  }

  /**
   * Log the start of thumbnail / sprite sheet generation.
   *
   * @param videoId - Unique video identifier.
   *
   * @example
   * logger.logThumbnailGeneration('abc123')
   * // [INFO] 2026-05-25T… - 🖼️  Generating thumbnails: abc123
   */
  logThumbnailGeneration(videoId: string): void {
    this.info(`🖼️  Generating thumbnails: ${videoId}`)
  }

  /**
   * Log an R2 upload progress event (debug-only).
   *
   * This method emits at DEBUG level and is a no-op outside development mode.
   *
   * @param videoId  - Unique video identifier.
   * @param progress - Upload completion percentage (0–100).
   *
   * @example
   * logger.logUploadProgress('abc123', 45)
   * // [DEBUG] 2026-05-25T… - 📤 Upload progress: abc123 (45%)
   */
  logUploadProgress(videoId: string, progress: number): void {
    this.debug(`📤 Upload progress: ${videoId} (${progress}%)`)
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/** Shared logger instance – import and use directly across all modules. */
export const logger = new Logger()

export default logger
