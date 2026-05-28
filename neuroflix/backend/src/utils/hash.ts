/**
 * Password hashing utilities using bcrypt
 *
 * Security notes:
 * - bcrypt rounds (cost factor) is set in securityConfig.bcryptRounds (default: 10)
 * - Higher rounds = more secure but slower hashing
 * - 10 rounds ≈ 100ms per hash on modern hardware (acceptable for login)
 * - Never store plain text passwords; always hash before saving to DB
 * - Use comparePassword instead of hashing and comparing strings directly
 *
 * @module utils/hash
 */

import bcrypt from 'bcrypt'
import { securityConfig } from '../config/app.config'

/**
 * Hash a password using bcrypt
 *
 * @param password - Plain text password to hash
 * @returns Promise resolving to bcrypt hashed password string
 *
 * @example
 * const hashed = await hashPassword('mySecret123')
 * // => '$2b$10$...'
 *
 * @throws {Error} If hashing fails due to bcrypt internal error
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(securityConfig.bcryptRounds)
    const hashed = await bcrypt.hash(password, salt)
    return hashed
  } catch (error) {
    throw new Error(`Password hashing failed: ${error}`)
  }
}

/**
 * Compare plain text password with a bcrypt hashed password
 *
 * @param password - Plain text password provided by the user
 * @param hashedPassword - Bcrypt hashed password retrieved from the database
 * @returns Promise resolving to true if passwords match, false otherwise
 *
 * @example
 * const isMatch = await comparePassword('mySecret123', hashedFromDB)
 * if (!isMatch) throw new Error('Invalid credentials')
 *
 * @throws {Error} If comparison fails due to bcrypt internal error
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword)
  } catch (error) {
    throw new Error(`Password comparison failed: ${error}`)
  }
}

/**
 * Validate that a password meets minimum security requirements
 *
 * Checks against securityConfig.passwordMinLength and passwordMaxLength.
 * Optionally extend with additional rules (uppercase, digit, special char).
 *
 * @param password - Password string to validate
 * @returns Object containing `isValid` boolean and an `errors` string array
 *
 * @example
 * const { isValid, errors } = validatePassword('abc')
 * if (!isValid) console.log(errors) // ['Password must be at least 6 characters']
 */
export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < securityConfig.passwordMinLength) {
    errors.push(
      `Password must be at least ${securityConfig.passwordMinLength} characters`
    )
  }

  if (password.length > securityConfig.passwordMaxLength) {
    errors.push(
      `Password must be less than ${securityConfig.passwordMaxLength} characters`
    )
  }

  // Optional: Add more rules
  // - Must contain uppercase
  // if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter')
  // - Must contain number
  // if (!/[0-9]/.test(password)) errors.push('Password must contain a number')
  // - Must contain special character
  // if (!/[!@#$%^&*()]/.test(password)) errors.push('Password must contain a special character')

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Generate a random password string (for testing / development only)
 *
 * ⚠️  WARNING: Do NOT use this for production password resets.
 *    Use a cryptographically secure random generator (e.g. crypto.randomBytes) instead.
 *
 * @param length - Desired password length (default: 12)
 * @returns Randomly generated password string
 *
 * @example
 * const tempPassword = generateRandomPassword(16)
 * // => 'aB3#kzW9!mLx'
 */
export function generateRandomPassword(length: number = 12): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()'
  let password = ''

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length)
    password += charset[randomIndex]
  }

  return password
}
