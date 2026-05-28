/**
 * Standardized API Response Types for Neuroflix Backend
 *
 * This file defines the shared TypeScript interfaces used for all API responses
 * throughout the application. Using a consistent response envelope ensures:
 * - Predictable structure for frontend consumers
 * - Type-safe response handling in controllers
 * - Uniform error reporting across all endpoints
 *
 * Response envelope pattern:
 * - All responses include a `success` boolean discriminant
 * - Success responses carry `data` and optional `meta` (pagination, etc.)
 * - Error responses carry `message`, `statusCode`, and optional field-level `errors`
 *
 * @module api.types
 */

// ---------------------------------------------------------------------------
// SUCCESS RESPONSE
// ---------------------------------------------------------------------------

/**
 * Standard success response envelope used by all API endpoints.
 *
 * The generic parameter `T` represents the shape of the `data` payload.
 * Defaulting to `any` preserves backwards compatibility while still allowing
 * callers to narrow the type when needed.
 *
 * @template T - The type of the `data` payload (default: `any`)
 *
 * @example
 * // Typed usage in a controller
 * const response: ApiSuccessResponse<{ user: User }> = {
 *   success: true,
 *   message: 'User fetched successfully',
 *   data: { user }
 * }
 * res.status(200).json(response)
 */
export interface ApiSuccessResponse<T = any> {
  /**
   * Discriminant field — always `true` for success responses.
   * Allows TypeScript to narrow the union type `ApiResponse<T>`.
   */
  success: true

  /**
   * Optional human-readable message describing the outcome.
   * Useful for confirmation messages (e.g. "User registered successfully").
   */
  message?: string

  /**
   * The response payload. Its shape varies per endpoint and is typed
   * by the generic parameter `T`.
   */
  data: T

  /**
   * Optional metadata for paginated or enriched responses.
   * Typically present on list endpoints that support pagination.
   *
   * The index signature `[key: string]: any` allows endpoints to attach
   * additional metadata fields without breaking the shared interface.
   */
  meta?: {
    /** Current page number (1-based). */
    page?: number
    /** Maximum number of items returned per page. */
    limit?: number
    /** Total number of pages available. */
    totalPages?: number
    /** Total number of items across all pages. */
    totalItems?: number
    /** Allow additional metadata fields per endpoint. */
    [key: string]: any
  }
}

// ---------------------------------------------------------------------------
// ERROR RESPONSE
// ---------------------------------------------------------------------------

/**
 * Standard error response envelope returned when a request fails.
 *
 * Produced by the global error handler middleware (`errorHandler.middleware.ts`)
 * and by controllers that throw `ApiError` instances.
 *
 * @example
 * // 400 Validation error with field-level details
 * {
 *   success: false,
 *   message: 'Validation failed',
 *   statusCode: 400,
 *   errors: [
 *     { field: 'email', message: 'Invalid email format' },
 *     { field: 'password', message: 'Password must be at least 8 characters' }
 *   ]
 * }
 *
 * @example
 * // 401 Unauthorized
 * {
 *   success: false,
 *   message: 'Invalid or expired token',
 *   statusCode: 401
 * }
 */
export interface ApiErrorResponse {
  /**
   * Discriminant field — always `false` for error responses.
   * Allows TypeScript to narrow the union type `ApiResponse<T>`.
   */
  success: false

  /**
   * Human-readable error message suitable for display or logging.
   */
  message: string

  /**
   * HTTP status code mirrored in the response body for easy client-side
   * consumption without needing to inspect the HTTP status line.
   */
  statusCode: number

  /**
   * Optional array of field-level validation errors.
   * Present when the request fails `express-validator` checks.
   * Each entry identifies the problematic field and describes the issue.
   */
  errors?: Array<{
    /** The request body/param/query field that failed validation. */
    field: string
    /** A human-readable description of the validation failure. */
    message: string
  }>

  /**
   * Stack trace string — only included in development (`NODE_ENV=development`).
   * Never exposed in production to avoid leaking implementation details.
   */
  stack?: string
}

// ---------------------------------------------------------------------------
// DISCRIMINATED UNION HELPER
// ---------------------------------------------------------------------------

/**
 * Discriminated union of success and error response shapes.
 * Useful when a function may return either variant and callers need to
 * narrow the type with a `success` check.
 *
 * @template T - The type of the success `data` payload
 *
 * @example
 * function handleResponse<T>(response: ApiResponse<T>) {
 *   if (response.success) {
 *     console.log(response.data) // TypeScript knows T here
 *   } else {
 *     console.error(response.message) // TypeScript knows ApiErrorResponse here
 *   }
 * }
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

// ---------------------------------------------------------------------------
// PAGINATION
// ---------------------------------------------------------------------------

/**
 * Query parameters for paginated list endpoints.
 *
 * Consumed by controllers that call paginated service functions such as
 * `getAllVideos(page, limit)` or `getAllUsers(page, limit)`.
 *
 * @example
 * // Parsed from req.query in a controller
 * const params: PaginationParams = {
 *   page: parseInt(req.query.page as string) || 1,
 *   limit: parseInt(req.query.limit as string) || 20
 * }
 */
export interface PaginationParams {
  /**
   * The 1-based page number to retrieve.
   * Defaults to `1` if not provided.
   */
  page: number

  /**
   * The maximum number of items to return per page.
   * Typical default is `20`; maximum is enforced at `100` by controllers.
   */
  limit: number
}

/**
 * Generic paginated response data wrapper.
 *
 * Returned by service-layer functions and forwarded by controllers inside
 * an `ApiSuccessResponse`. The generic parameter `T` is the item type.
 *
 * @template T - The type of each item in the `items` array
 *
 * @example
 * // Paginated video list
 * const paginatedVideos: PaginatedData<Video> = {
 *   items: videos,
 *   total: 150,
 *   pages: 8,
 *   currentPage: 1,
 *   hasMore: true
 * }
 */
export interface PaginatedData<T> {
  /**
   * The items for the current page.
   */
  items: T[]

  /**
   * Total number of items across all pages.
   * Used by the frontend to calculate pagination UI.
   */
  total: number

  /**
   * Total number of pages, computed as `Math.ceil(total / limit)`.
   */
  pages: number

  /**
   * The current page number (mirrors the request's `page` parameter).
   */
  currentPage: number

  /**
   * Convenience flag — `true` when `currentPage < pages`.
   * Avoids the frontend having to recompute this comparison.
   */
  hasMore: boolean
}

// ---------------------------------------------------------------------------
// FILE UPLOAD
// ---------------------------------------------------------------------------

/**
 * Metadata describing a file that has been uploaded.
 *
 * Populated from the `multer` `req.file` object in `upload.controller.ts`
 * and stored alongside the video record for audit and display purposes.
 *
 * @example
 * const meta: FileUploadMeta = {
 *   originalName: 'intro-lecture.mp4',
 *   mimeType: 'video/mp4',
 *   size: 104857600, // 100 MB in bytes
 *   uploadedAt: new Date()
 * }
 */
export interface FileUploadMeta {
  /**
   * The original filename as reported by the client (not sanitized).
   * Stored for display purposes only — never used as a storage key.
   */
  originalName: string

  /**
   * MIME type of the uploaded file (e.g. `'video/mp4'`, `'video/webm'`).
   * Validated against `videoConfig.allowedMimeTypes` before acceptance.
   */
  mimeType: string

  /**
   * File size in bytes.
   * Validated against `videoConfig.maxUploadSize` (default: 5 GB).
   */
  size: number

  /**
   * UTC timestamp of when the file was received by the server.
   */
  uploadedAt: Date
}

// ---------------------------------------------------------------------------
// AUTH RESPONSE HELPERS
// ---------------------------------------------------------------------------

/**
 * Shape of the user object returned in auth responses (register / login / me).
 * Password is always omitted from API responses.
 *
 * @example
 * res.json({
 *   success: true,
 *   data: { user: AuthUserResponse, token: '...' }
 * })
 */
export interface AuthUserResponse {
  /** UUID of the user. */
  id: string
  /** User's email address. */
  email: string
  /** Organization the user belongs to. */
  organization: string
  /** Optional first name. */
  firstName?: string | null
  /** Optional last name. */
  lastName?: string | null
  /** Timestamp of account creation. */
  createdAt: Date
  /** Timestamp of last account update. */
  updatedAt: Date
}

/**
 * Data payload returned by `/auth/register` and `/auth/login`.
 */
export interface AuthResponseData {
  /** Authenticated user details (no password). */
  user: AuthUserResponse
  /**
   * Signed JWT access token.
   * The client must include this in the `Authorization: Bearer <token>` header
   * for all protected endpoints.
   */
  token: string
}
