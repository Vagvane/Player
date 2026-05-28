/**
 * Authentication Routes
 *
 * Defines all routes related to user authentication including
 * registration, login, fetching the current user, and logout.
 *
 * Base path: /api/v1/auth
 */

import { Router } from 'express'
import { register, login, getCurrentUser, logout } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'
import { registerValidation, loginValidation } from '../middleware/validator.middleware'
import { authRateLimiter } from '../middleware/rateLimiter.middleware'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @body    { email: string, password: string, organization: string, firstName?: string, lastName?: string }
 * @returns { success: true, message: string, data: { user, token } }
 */
router.post(
  '/register',
  authRateLimiter,
  registerValidation,
  asyncHandler(register)
)

/**
 * @route   POST /api/auth/login
 * @desc    Login user and receive a JWT token
 * @access  Public
 * @body    { email: string, password: string }
 * @returns { success: true, message: string, data: { user, token } }
 */
router.post(
  '/login',
  authRateLimiter,
  loginValidation,
  asyncHandler(login)
)

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user's profile
 * @access  Private (requires valid JWT Bearer token)
 * @headers Authorization: Bearer <token>
 * @returns { success: true, data: { user } }
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(getCurrentUser)
)

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (logs the event server-side; client should discard the token)
 * @access  Private (requires valid JWT Bearer token)
 * @headers Authorization: Bearer <token>
 * @returns { success: true, message: string }
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(logout)
)

export default router
