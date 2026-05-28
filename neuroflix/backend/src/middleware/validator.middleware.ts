/**
 * @file validator.middleware.ts
 * @description Request validation middleware built on top of `express-validator`.
 *
 * Each exported constant is an array of `express-validator` chain objects
 * followed by `handleValidationErrors` as the final element.  Attach the
 * whole array to a route to validate the incoming request before it reaches
 * the controller.
 *
 * Usage:
 * ```typescript
 * import { registerValidation, loginValidation } from '../middleware/validator.middleware'
 *
 * router.post('/register', registerValidation, asyncHandler(register))
 * router.post('/login',    loginValidation,    asyncHandler(login))
 * ```
 *
 * When validation fails the middleware short-circuits with a structured
 * 400 response — the controller is never invoked.
 */

import { body, param, validationResult } from 'express-validator'
import { Request, Response, NextFunction } from 'express'
import { validationRules, securityConfig } from '../config/app.config'

// ---------------------------------------------------------------------------
// Validation result handler — shared terminal step for every rule chain
// ---------------------------------------------------------------------------

/**
 * Collects `express-validator` errors accumulated by the preceding chain
 * rules and, if any exist, responds with a structured 400 payload.
 * Otherwise calls `next()` to pass control to the route handler.
 *
 * This function is appended as the **last element** of every validation
 * array so that it runs after all field checks have been executed.
 *
 * Response shape on failure:
 * ```json
 * {
 *   "success": false,
 *   "message": "Validation failed",
 *   "errors": [
 *     { "field": "email", "message": "Invalid email format" }
 *   ]
 * }
 * ```
 *
 * @param req  - Express request (carries accumulated validation errors).
 * @param res  - Express response.
 * @param next - Express next function.
 */
export function handleValidationErrors(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.type === 'field' ? (err as any).path : 'unknown',
      message: err.msg
    }))

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    })
    return
  }

  next()
}

// ---------------------------------------------------------------------------
// Auth validation
// ---------------------------------------------------------------------------

/**
 * Validation chain for `POST /api/auth/register`.
 *
 * Checks:
 * - `email`        — valid format, normalised, ≤ 255 chars.
 * - `password`     — between `passwordMinLength` and `passwordMaxLength` chars.
 * - `organization` — trimmed, between 2 and 100 chars.
 * - `firstName`    — optional, trimmed, ≤ 50 chars.
 * - `lastName`     — optional, trimmed, ≤ 50 chars.
 */
export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: validationRules.email.maxLength })
    .withMessage(
      `Email must be less than ${validationRules.email.maxLength} characters`
    ),

  body('password')
    .isLength({ min: securityConfig.passwordMinLength })
    .withMessage(
      `Password must be at least ${securityConfig.passwordMinLength} characters`
    )
    .isLength({ max: securityConfig.passwordMaxLength })
    .withMessage(
      `Password must be less than ${securityConfig.passwordMaxLength} characters`
    ),

  body('organization')
    .trim()
    .isLength({ min: validationRules.organization.minLength })
    .withMessage(
      `Organization must be at least ${validationRules.organization.minLength} characters`
    )
    .isLength({ max: validationRules.organization.maxLength })
    .withMessage(
      `Organization must be less than ${validationRules.organization.maxLength} characters`
    ),

  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters'),

  handleValidationErrors
]

/**
 * Validation chain for `POST /api/auth/login`.
 *
 * Checks:
 * - `email`    — valid format, normalised.
 * - `password` — must not be empty.
 */
export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
]

// ---------------------------------------------------------------------------
// Video validation
// ---------------------------------------------------------------------------

/**
 * Validation chain for video creation (`POST /api/videos` or upload endpoint).
 *
 * Checks:
 * - `title`       — trimmed, between 3 and 200 chars.
 * - `description` — optional, trimmed, ≤ 1000 chars.
 */
export const createVideoValidation = [
  body('title')
    .trim()
    .isLength({ min: validationRules.videoTitle.minLength })
    .withMessage(
      `Title must be at least ${validationRules.videoTitle.minLength} characters`
    )
    .isLength({ max: validationRules.videoTitle.maxLength })
    .withMessage(
      `Title must be less than ${validationRules.videoTitle.maxLength} characters`
    ),

  body('description')
    .optional()
    .trim()
    .isLength({ max: validationRules.videoDescription.maxLength })
    .withMessage(
      `Description must be less than ${validationRules.videoDescription.maxLength} characters`
    ),

  handleValidationErrors
]

/**
 * Validation chain for routes that accept a video UUID in the `:id` path
 * parameter (e.g. `GET /api/videos/:id`, `PATCH /api/videos/:id`).
 *
 * Checks:
 * - `:id` — must be a valid UUID v4.
 */
export const videoIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid video ID format'),

  handleValidationErrors
]

/**
 * Validation chain for `PATCH /api/videos/:id` metadata updates.
 *
 * Checks (all optional — only validated when present):
 * - `title`       — trimmed, between 3 and 200 chars.
 * - `description` — trimmed, ≤ 1000 chars.
 * - `duration`    — positive integer (seconds).
 */
export const updateVideoValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: validationRules.videoTitle.minLength })
    .withMessage(
      `Title must be at least ${validationRules.videoTitle.minLength} characters`
    )
    .isLength({ max: validationRules.videoTitle.maxLength })
    .withMessage(
      `Title must be less than ${validationRules.videoTitle.maxLength} characters`
    ),

  body('description')
    .optional()
    .trim()
    .isLength({ max: validationRules.videoDescription.maxLength })
    .withMessage(
      `Description must be less than ${validationRules.videoDescription.maxLength} characters`
    ),

  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer (seconds)'),

  handleValidationErrors
]

// ---------------------------------------------------------------------------
// Checkpoint validation
// ---------------------------------------------------------------------------

/**
 * Validation chain for `POST /api/checkpoints/answer`.
 *
 * Checks:
 * - `videoId`      — valid UUID v4.
 * - `checkpointId` — non-empty string.
 * - `answer`       — integer in the range 0–3 (four answer options).
 * - `timeSpent`    — optional, non-negative integer (seconds taken to answer).
 */
export const submitAnswerValidation = [
  body('videoId')
    .isUUID()
    .withMessage('Invalid video ID format'),

  body('checkpointId')
    .isString()
    .notEmpty()
    .withMessage('Checkpoint ID is required'),

  body('answer')
    .isInt({ min: 0, max: 3 })
    .withMessage('Answer must be an integer between 0 and 3'),

  body('timeSpent')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Time spent must be a positive integer'),

  handleValidationErrors
]

// ---------------------------------------------------------------------------
// Progress validation
// ---------------------------------------------------------------------------

/**
 * Validation chain for `POST /api/videos/:id/progress`.
 *
 * Checks:
 * - `currentTime` — non-negative integer (seconds from the start of the video).
 * - `completed`   — optional boolean indicating the video was finished.
 */
export const updateProgressValidation = [
  body('currentTime')
    .isInt({ min: 0 })
    .withMessage('Current time must be a non-negative integer'),

  body('completed')
    .optional()
    .isBoolean()
    .withMessage('Completed must be a boolean'),

  handleValidationErrors
]
