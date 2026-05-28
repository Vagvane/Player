/**
 * JWT Configuration
 *
 * Handles token generation, verification, and decoding for authentication.
 *
 * @security IMPORTANT: JWT_SECRET must be set as an environment variable in production.
 * Using the default secret in production is a critical security vulnerability.
 * Generate a strong secret with: `openssl rand -base64 64`
 */

import jwt from 'jsonwebtoken'

// ---------------------------------------------------------------------------
// Configuration constants
// ---------------------------------------------------------------------------

const JWT_SECRET =
  process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production'

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

/**
 * Guard: throw immediately if the default secret is used in production.
 * This prevents accidentally deploying an insecure configuration.
 */
if (
  JWT_SECRET === 'your-super-secret-key-change-this-in-production' &&
  process.env.NODE_ENV === 'production'
) {
  throw new Error('JWT_SECRET must be set in production!')
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * Payload embedded inside every access token.
 *
 * @property userId       - Database UUID of the authenticated user
 * @property email        - User's email address
 * @property organization - User's organisation
 * @property iat          - Issued-at timestamp (added automatically by jwt.sign)
 * @property exp          - Expiry timestamp (added automatically by jwt.sign)
 */
export interface TokenPayload {
  userId: string
  email: string
  organization: string
  iat?: number
  exp?: number
}

// ---------------------------------------------------------------------------
// Token generation
// ---------------------------------------------------------------------------

/**
 * Generate a short-lived access token.
 *
 * @param payload - User identity data (without `iat`/`exp` – those are added by the library)
 * @returns Signed JWT string
 * @throws Error if token signing fails
 *
 * @example
 * const token = generateAccessToken({ userId: '...', email: '...', organization: '...' })
 */
export function generateAccessToken(
  payload: Omit<TokenPayload, 'iat' | 'exp'>
): string {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      algorithm: 'HS256'
    } as jwt.SignOptions)
  } catch (error) {
    throw new Error(`Token generation failed: ${error}`)
  }
}

/**
 * Generate a long-lived refresh token.
 *
 * Refresh tokens only carry the `userId` and a `type` discriminator so that
 * they cannot be misused as access tokens.
 *
 * @param userId - Database UUID of the user
 * @returns Signed JWT string
 * @throws Error if token signing fails
 *
 * @example
 * const refreshToken = generateRefreshToken(user.id)
 */
export function generateRefreshToken(userId: string): string {
  try {
    return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      algorithm: 'HS256'
    } as jwt.SignOptions)
  } catch (error) {
    throw new Error(`Refresh token generation failed: ${error}`)
  }
}

// ---------------------------------------------------------------------------
// Token verification
// ---------------------------------------------------------------------------

/**
 * Verify a JWT access token and return its decoded payload.
 *
 * @param token - JWT string to verify
 * @returns Decoded {@link TokenPayload}
 * @throws Error with a descriptive message for expired / invalid tokens
 *
 * @example
 * try {
 *   const payload = verifyToken(token)
 *   console.log(payload.userId)
 * } catch (err) {
 *   // 'Token expired' | 'Invalid token' | 'Token verification failed: ...'
 * }
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256']
    }) as TokenPayload

    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token')
    }
    throw new Error(`Token verification failed: ${error}`)
  }
}

// ---------------------------------------------------------------------------
// Token decoding (no verification – debugging only)
// ---------------------------------------------------------------------------

/**
 * Decode a JWT **without** verifying its signature or expiry.
 *
 * @security Do NOT use this for authentication. Use {@link verifyToken} instead.
 * This function is intended for logging / debugging purposes only.
 *
 * @param token - JWT string to decode
 * @returns Decoded {@link TokenPayload} or `null` if decoding fails
 *
 * @example
 * const payload = decodeToken(token)
 * console.log('Token issued at:', payload?.iat)
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.decode(token) as TokenPayload
    return decoded
  } catch (error) {
    return null
  }
}

// ---------------------------------------------------------------------------
// Exported configuration object
// ---------------------------------------------------------------------------

/**
 * JWT configuration values.
 *
 * Prefer using the individual helper functions above rather than accessing
 * `jwtConfig.secret` directly – avoid leaking the secret into logs.
 */
export const jwtConfig = {
  secret: JWT_SECRET,
  expiresIn: JWT_EXPIRES_IN,
  refreshExpiresIn: JWT_REFRESH_EXPIRES_IN
}
