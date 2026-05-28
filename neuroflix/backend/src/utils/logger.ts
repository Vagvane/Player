/**
 * Logger utility for consistent application logging.
 *
 * Supports two output formats:
 * - `pretty` (development): colorized, human-readable console output
 * - `json` (production): structured JSON lines for log aggregation tools
 *
 * Log level hierarchy: debug < info < warn < error
 * Only messages at or above the configured level are emitted.
 *
 * @module utils/logger
 */

import { Request, Response, NextFunction } from 'express'
import { loggingConfig } from '../config/app.config'

/**
 * Supported log severity levels.
 */
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/** ANSI color codes for pretty-print format */
const LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[36m', // Cyan
  [LogLevel.INFO]: '\x1b[32m',  // Green
  [LogLevel.WARN]: '\x1b[33m',  // Yellow
  [LogLevel.ERROR]: '\x1b[31m'  // Red
}

const RESET = '\x1b[0m'

/**
 * Internal logger class.
 * Instantiated once and exported as `logger` / default export.
 */
class Logger {
  /**
   * Format a log message according to the configured output format.
   *
   * @param level - Severity level
   * @param message - Human-readable message
   * @param meta - Optional additional metadata to attach
   * @returns Formatted string ready for console output
   */
  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString()

    if (loggingConfig.format === 'json') {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...(meta !== undefined && { meta })
      })
    }

    // Pretty format for development
    const color = LEVEL_COLORS[level]
    let formatted = `${color}[${level.toUpperCase()}]${RESET} ${timestamp} - ${message}`

    if (meta !== undefined) {
      formatted += `\n  ${JSON.stringify(meta, null, 2)}`
    }

    return formatted
  }

  /**
   * Emit a DEBUG-level message.
   * Only printed when `loggingConfig.level` is `'debug'`.
   *
   * @param message - Log message
   * @param meta - Optional metadata
   *
   * @example
   * logger.debug('Cache miss', { key: 'user:42' })
   */
  debug(message: string, meta?: any): void {
    if (loggingConfig.level === 'debug') {
      console.log(this.formatMessage(LogLevel.DEBUG, message, meta))
    }
  }

  /**
   * Emit an INFO-level message.
   *
   * @param message - Log message
   * @param meta - Optional metadata
   *
   * @example
   * logger.info('Server started', { port: 3001 })
   */
  info(message: string, meta?: any): void {
    console.log(this.formatMessage(LogLevel.INFO, message, meta))
  }

  /**
   * Emit a WARN-level message.
   *
   * @param message - Log message
   * @param meta - Optional metadata
   *
   * @example
   * logger.warn('Deprecated endpoint called', { path: '/api/v0/users' })
   */
  warn(message: string, meta?: any): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, meta))
  }

  /**
   * Emit an ERROR-level message.
   * When passed an `Error` instance, its `message` and `stack` are extracted
   * automatically into the metadata object.
   *
   * @param message - Log message describing the error context
   * @param error - Optional `Error` object or arbitrary metadata
   *
   * @example
   * logger.error('Database query failed', err)
   */
  error(message: string, error?: Error | any): void {
    const meta =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error

    console.error(this.formatMessage(LogLevel.ERROR, message, meta))
  }

  /**
   * Log an HTTP request with method, URL, status code, and duration.
   * The log level is chosen automatically based on the status code:
   * - `>= 500` → error
   * - `>= 400` → warn
   * - otherwise → info
   *
   * @param method - HTTP method (GET, POST, …)
   * @param url - Request URL / path
   * @param statusCode - HTTP response status code
   * @param duration - Response time in milliseconds
   *
   * @example
   * logger.logRequest('GET', '/api/videos', 200, 42)
   */
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number
  ): void {
    const message = `${method} ${url} ${statusCode} - ${duration}ms`

    if (statusCode >= 500) {
      this.error(message)
    } else if (statusCode >= 400) {
      this.warn(message)
    } else {
      this.info(message)
    }
  }
}

/** Singleton logger instance */
export const logger = new Logger()
export default logger

/**
 * Express middleware that logs every inbound HTTP request once the response
 * has been fully sent.
 *
 * Respects `loggingConfig.logRequests` — if `false`, this middleware is a
 * transparent no-op.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Next middleware function
 *
 * @example
 * // In server setup:
 * app.use(requestLogger)
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!loggingConfig.logRequests) {
    return next()
  }

  const start = Date.now()

  // Log after the response has been fully flushed to the client
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.logRequest(req.method, req.path, res.statusCode, duration)
  })

  next()
}
