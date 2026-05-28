/**
 * @file auth.middleware.ts
 * @description JWT authentication middleware for protecting Express routes.
 *
 * Provides two middleware functions:
 * - `authenticate`: Strictly requires a valid JWT; returns 401 if missing or invalid.
 * - `optionalAuth`: Attaches the user if a valid JWT is present, but never blocks the request.
 *
 * Security notes:
 * - Tokens must be passed as `Authorization: Bearer <token>`.
 * - The user's existence in the database is verified on every request to handle
 *   deleted/deactivated accounts even before token expiry.
 * - Failed authentication attempts are logged as warnings for security monitoring.
 */

import { Request, Response, NextFunction } from 'express'
import { verifyToken, TokenPayload } from '../config/jwt.config'
import { findUserById } from '../services/user.service'
import { logger } from '../utils/logger'

// ---------------------------------------------------------------------------
// Extend Express Request type to carry authenticated user information
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface Request {
      /**
       * Populated by `authenticate` or `optionalAuth` when a valid JWT is present.
       */
      user?: {
        /** UUID of the authenticated user */
        userId: string
        /** Email address of the authenticated user */
        email: string
        /** Organisation the user belongs to */
        organization: string
      }
    }
  }
}

// ---------------------------------------------------------------------------
// authenticate — strict middleware (blocks if no valid token)
// ---------------------------------------------------------------------------

/**
 * Strict JWT authentication middleware.
 *
 * Validates the `Authorization: Bearer <token>` header, verifies the token
 * signature and expiry, confirms the user still exists in the database, then
 * attaches `req.user` before calling `next()`.
 *
 * Responds with:
 * - `401` — missing header, bad format, invalid/expired token, or unknown user.
 * - `500` — unexpected server-side error.
 *
 * @param req  - Express request object
 * @param res  - Express response object
 * @param next - Express next function
 *
 * @example
 * // Protect a route
 * router.get('/profile', authenticate, profileController)
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // -----------------------------------------------------------------------
    // 1. Read Authorization header
    // -----------------------------------------------------------------------
    const authHeader = req.headers.authorization

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: 'No authorization header provided'
      })
      return
    }

    // -----------------------------------------------------------------------
    // 2. Ensure it uses the Bearer scheme
    // -----------------------------------------------------------------------
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Invalid authorization format. Use: Bearer <token>'
      })
      return
    }

    // -----------------------------------------------------------------------
    // 3. Extract the raw token string
    // -----------------------------------------------------------------------
    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'No token provided'
      })
      return
    }

    // -----------------------------------------------------------------------
    // 4. Cryptographically verify the token (checks signature + expiry)
    // -----------------------------------------------------------------------
    let decoded: TokenPayload
    try {
      decoded = verifyToken(token)
    } catch (error: any) {
      // Log failed attempts for security audit trail
      logger.warn('Invalid token attempt', {
        error: error.message,
        ip: req.ip,
        path: req.path
      })
      res.status(401).json({
        success: false,
        message: error.message || 'Invalid or expired token'
      })
      return
    }

    // -----------------------------------------------------------------------
    // 5. Confirm the user still exists in the database
    //    (handles deleted / deactivated accounts between token issuance and use)
    // -----------------------------------------------------------------------
    const user = await findUserById(decoded.userId)

    if (!user) {
      logger.warn('Token valid but user not found in database', {
        userId: decoded.userId
      })
      res.status(401).json({
        success: false,
        message: 'User not found'
      })
      return
    }

    // -----------------------------------------------------------------------
    // 6. Attach user payload to request for downstream handlers
    // -----------------------------------------------------------------------
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      organization: decoded.organization
    }

    logger.debug(`User authenticated: ${decoded.email}`)
    next()
  } catch (error) {
    logger.error('Authentication error', error)
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    })
  }
}

// ---------------------------------------------------------------------------
// optionalAuth — permissive middleware (never blocks; attaches user if possible)
// ---------------------------------------------------------------------------

/**
 * Optional JWT authentication middleware.
 *
 * Attempts to validate the `Authorization: Bearer <token>` header and populate
 * `req.user`, but **always** calls `next()` regardless of the outcome.  Use
 * this on routes that have different behaviour for authenticated vs anonymous
 * users but must remain publicly accessible.
 *
 * Behaviour:
 * - No header → continues without `req.user`.
 * - Invalid / expired token → silently continues without `req.user` (debug log only).
 * - Valid token but user deleted → continues without `req.user`.
 * - Valid token and user found → populates `req.user` then continues.
 *
 * @param req  - Express request object
 * @param res  - Express response object
 * @param next - Express next function
 *
 * @example
 * // Route response differs based on whether the caller is logged in
 * router.get('/videos', optionalAuth, videoController.list)
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization

    // No token present — continue as anonymous
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next()
    }

    const token = authHeader.substring(7)

    try {
      const decoded = verifyToken(token)
      const user = await findUserById(decoded.userId)

      if (user) {
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          organization: decoded.organization
        }
        logger.debug(`Optional auth: user attached — ${decoded.email}`)
      } else {
        logger.debug('Optional auth: Token valid but user no longer exists')
      }
    } catch (error) {
      // Invalid or expired token — do not block; just skip user attachment
      logger.debug('Optional auth: Invalid token, continuing without user')
    }

    next()
  } catch (error) {
    // Unexpected error — log and continue so the route is never hard-blocked
    logger.error('Optional auth error', error)
    next()
  }
}
