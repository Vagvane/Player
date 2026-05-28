/**
 * @file auth.controller.ts
 * @description Authentication controller for user registration, login, and session management.
 * Handles JWT-based authentication with secure error handling.
 */

import { Request, Response } from 'express'
import { createUser, verifyCredentials } from '../services/user.service'
import { generateAccessToken } from '../config/jwt.config'
import { logger } from '../utils/logger'
import { ApiError } from '../middleware/errorHandler.middleware'

/**
 * Register a new user
 * POST /api/auth/register
 *
 * @param req - Express request containing { email, password, organization, firstName?, lastName? }
 * @param res - Express response
 * @returns 201 with user object and JWT token on success
 * @throws ApiError.conflict if email already exists
 * @throws ApiError.internal on unexpected errors
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, organization, firstName, lastName } = req.body

    // Create user in database (password is hashed inside createUser)
    const user = await createUser({
      email,
      password,
      organization,
      firstName,
      lastName
    })

    // Generate JWT token for immediate authentication after registration
    const token = generateAccessToken({
      userId: user.id,
      email: user.email,
      organization: user.organization
    })

    logger.info(`User registered successfully: ${email}`)

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token
      }
    })
  } catch (error: any) {
    logger.error('Registration failed', error)

    if (error.message.includes('already exists')) {
      throw ApiError.conflict(error.message)
    }

    throw ApiError.internal('Registration failed')
  }
}

/**
 * Login user
 * POST /api/auth/login
 *
 * @param req - Express request containing { email, password }
 * @param res - Express response
 * @returns 200 with user object and JWT token on success
 * @throws ApiError.unauthorized if credentials are invalid
 * @throws ApiError.internal on unexpected errors
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body

    // Verify credentials - returns user without password, or null if invalid
    const user = await verifyCredentials(email, password)

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password')
    }

    // Generate JWT token upon successful authentication
    const token = generateAccessToken({
      userId: user.id,
      email: user.email,
      organization: user.organization
    })

    logger.info(`User logged in: ${email}`)

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token
      }
    })
  } catch (error: any) {
    logger.error('Login failed', error)

    // Re-throw 401 errors (unauthorized) as-is
    if (error.statusCode === 401) {
      throw error
    }

    throw ApiError.internal('Login failed')
  }
}

/**
 * Get current authenticated user
 * GET /api/auth/me
 *
 * @param req - Express request with user attached by auth middleware
 * @param res - Express response
 * @returns 200 with current user data
 * @throws ApiError.unauthorized if not authenticated
 * @throws ApiError.notFound if user no longer exists
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    // User is already attached to request by auth middleware
    if (!req.user) {
      throw ApiError.unauthorized('Not authenticated')
    }

    // Dynamic import to avoid circular dependency issues
    const { findUserById } = await import('../services/user.service')
    const user = await findUserById(req.user.userId)

    if (!user) {
      throw ApiError.notFound('User not found')
    }

    res.status(200).json({
      success: true,
      data: { user }
    })
  } catch (error) {
    logger.error('Failed to get current user', error)
    throw error
  }
}

/**
 * Logout user (client-side JWT removal, optional endpoint)
 * POST /api/auth/logout
 *
 * @param req - Express request with optional user attached by auth middleware
 * @param res - Express response
 * @returns 200 with logout confirmation message
 *
 * @remarks
 * With stateless JWT authentication, logout is typically handled client-side
 * by removing the token from storage. This endpoint serves as a server-side
 * logout hook for audit logging and future token blacklisting support.
 */
export async function logout(req: Request, res: Response): Promise<void> {
  // With JWT, logout is typically handled client-side by removing the token
  // This endpoint can be used for logging purposes or future token blacklisting

  if (req.user) {
    logger.info(`User logged out: ${req.user.email}`)
  }

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  })
}
