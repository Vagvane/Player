/**
 * @file errorHandler.middleware.ts
 * @description Global error handling middleware for Express.
 *
 * Exports:
 * - `ApiError`          — Custom error class with HTTP status codes and factory methods.
 * - `handlePrismaError` — Converts Prisma client errors into `ApiError` instances.
 * - `errorHandler`      — Express error-handling middleware (must be registered last).
 * - `notFoundHandler`   — Catch-all 404 handler for unmatched routes.
 *
 * Usage:
 * ```typescript
 * // In any route / controller throw an ApiError directly:
 * throw ApiError.notFound('Video not found')
 *
 * // Wrap Prisma calls to get meaningful HTTP errors:
 * try { ... } catch (e) { throw handlePrismaError(e) }
 *
 * // Register in app.ts AFTER all routes:
 * app.use(notFoundHandler)
 * app.use(errorHandler)
 * ```
 */

import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'
import { env } from '../config/app.config'

// ---------------------------------------------------------------------------
// Internal interface — extends the built-in Error with HTTP metadata
// ---------------------------------------------------------------------------

/**
 * Extended Error interface that carries HTTP-specific fields consumed by
 * `errorHandler`.
 */
interface AppError extends Error {
  /** HTTP status code to send in the response (defaults to 500). */
  statusCode?: number
  /**
   * Distinguishes operational errors (expected, e.g. 404 / 401) from
   * programming errors (unexpected, e.g. null dereference).
   * Operational errors are safe to expose to clients.
   */
  isOperational?: boolean
}

// ---------------------------------------------------------------------------
// ApiError — custom error class with HTTP status helpers
// ---------------------------------------------------------------------------

/**
 * Application-level HTTP error.
 *
 * Extends the native `Error` class with an HTTP `statusCode` and an
 * `isOperational` flag that differentiates expected business-logic errors
 * (safe to surface to clients) from unexpected programmer errors.
 *
 * Factory methods cover the most common HTTP error codes so controllers can
 * throw expressive, one-liner errors without importing status constants.
 *
 * @example
 * throw ApiError.notFound('Video not found')
 * throw ApiError.unauthorized()
 * throw new ApiError('Custom message', 422)
 */
export class ApiError extends Error implements AppError {
  public statusCode: number
  public isOperational: boolean

  /**
   * @param message       - Human-readable error description sent to the client.
   * @param statusCode    - HTTP status code (default: 500).
   * @param isOperational - Whether this is an expected operational error
   *                        (default: true). Set to false for programmer errors.
   */
  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.isOperational = isOperational
    // Maintains proper prototype chain in transpiled ES5 output
    Object.setPrototypeOf(this, new.target.prototype)
    // Capture a clean stack trace that starts at the call site
    Error.captureStackTrace(this, this.constructor)
  }

  // -------------------------------------------------------------------------
  // Factory methods
  // -------------------------------------------------------------------------

  /**
   * 400 Bad Request — malformed input or invalid parameters.
   * @param message - Override the default message.
   */
  static badRequest(message: string = 'Bad request'): ApiError {
    return new ApiError(message, 400)
  }

  /**
   * 401 Unauthorized — missing or invalid authentication credentials.
   * @param message - Override the default message.
   */
  static unauthorized(message: string = 'Unauthorized'): ApiError {
    return new ApiError(message, 401)
  }

  /**
   * 403 Forbidden — authenticated but lacking permissions.
   * @param message - Override the default message.
   */
  static forbidden(message: string = 'Forbidden'): ApiError {
    return new ApiError(message, 403)
  }

  /**
   * 404 Not Found — the requested resource does not exist.
   * @param message - Override the default message.
   */
  static notFound(message: string = 'Resource not found'): ApiError {
    return new ApiError(message, 404)
  }

  /**
   * 409 Conflict — request cannot be completed due to a state conflict
   * (e.g. duplicate entry).
   * @param message - Override the default message.
   */
  static conflict(message: string = 'Conflict'): ApiError {
    return new ApiError(message, 409)
  }

  /**
   * 422 Unprocessable Entity — semantically invalid request body.
   * @param message - Override the default message.
   */
  static unprocessable(message: string = 'Unprocessable entity'): ApiError {
    return new ApiError(message, 422)
  }

  /**
   * 429 Too Many Requests — rate limit exceeded.
   * @param message - Override the default message.
   */
  static tooManyRequests(message: string = 'Too many requests'): ApiError {
    return new ApiError(message, 429)
  }

  /**
   * 500 Internal Server Error — unexpected server-side failure.
   * Marked as **non-operational** so the error handler knows not to expose
   * internal details to the client.
   * @param message - Override the default message.
   */
  static internal(message: string = 'Internal server error'): ApiError {
    return new ApiError(message, 500, false)
  }
}

// ---------------------------------------------------------------------------
// handlePrismaError — maps Prisma client errors to ApiError instances
// ---------------------------------------------------------------------------

/**
 * Converts a Prisma client error into a typed `ApiError` with an appropriate
 * HTTP status code and a client-safe message.
 *
 * Prisma error codes reference:
 * @see https://www.prisma.io/docs/reference/api-reference/error-reference
 *
 * @param error - The raw error thrown by a Prisma operation.
 * @returns An `ApiError` instance ready to be thrown or passed to `next()`.
 *
 * @example
 * try {
 *   await prisma.user.create({ data })
 * } catch (e) {
 *   throw handlePrismaError(e)
 * }
 */
export function handlePrismaError(error: any): ApiError {
  // P2002 — Unique constraint violation
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field'
    return ApiError.conflict(`${field} already exists`)
  }

  // P2025 — Record not found (e.g. update / delete on non-existent row)
  if (error.code === 'P2025') {
    return ApiError.notFound('Record not found')
  }

  // P2003 — Foreign key constraint violation
  if (error.code === 'P2003') {
    return ApiError.badRequest('Invalid reference')
  }

  // P2014 — Relation violation
  if (error.code === 'P2014') {
    return ApiError.badRequest('Relation constraint violation')
  }

  // P2000 — Value too long for the column type
  if (error.code === 'P2000') {
    return ApiError.badRequest('Provided value is too long')
  }

  // Default fallback for any other Prisma error
  logger.error('Unhandled Prisma error', { code: error.code, meta: error.meta })
  return ApiError.internal('Database error')
}

// ---------------------------------------------------------------------------
// errorHandler — Express error-handling middleware (4-argument form)
// ---------------------------------------------------------------------------

/**
 * Global Express error-handling middleware.
 *
 * Must be registered **after** all routes and other middleware:
 * ```typescript
 * app.use(notFoundHandler)
 * app.use(errorHandler)
 * ```
 *
 * Behaviour:
 * - Extracts `statusCode` from `ApiError` (or defaults to 500).
 * - Logs the error with full context (path, method, stack).
 * - In **development** includes the stack trace and raw error in the response.
 * - In **production** only returns `message` and `statusCode`.
 *
 * @param err  - The error passed to `next(err)` or thrown in an async handler.
 * @param req  - Express request.
 * @param res  - Express response.
 * @param next - Express next function (required for Express to recognise this
 *               as an error handler even if unused).
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Resolve status code — fall back to 500 for plain Error objects
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'

  // Always log the full error for server-side visibility
  logger.error('Error caught by error handler', {
    statusCode,
    message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    isOperational: (err as ApiError).isOperational ?? true
  })

  // Build the response payload — keep it minimal in production
  const errorResponse: Record<string, unknown> = {
    success: false,
    message,
    statusCode
  }

  // Expose stack trace and raw error object only in development
  if (env.isDevelopment) {
    errorResponse.stack = err.stack
    errorResponse.error = err
  }

  res.status(statusCode).json(errorResponse)
}

// ---------------------------------------------------------------------------
// notFoundHandler — catch-all for unmatched routes
// ---------------------------------------------------------------------------

/**
 * Catch-all 404 handler.
 *
 * Register this **before** `errorHandler` and **after** all real routes so
 * that any request reaching it receives a structured 404 response:
 * ```typescript
 * app.use(notFoundHandler)
 * app.use(errorHandler)
 * ```
 *
 * @param req - Express request.
 * @param res - Express response.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    statusCode: 404
  })
}
