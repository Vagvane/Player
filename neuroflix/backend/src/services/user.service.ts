/**
 * User Service
 *
 * Provides user management operations including creation, lookup,
 * credential verification, updates, and paginated listing.
 * Passwords are never returned to callers – every public function
 * returns a `UserWithoutPassword` type (or the full `User` only when
 * the raw hashed password is explicitly needed internally, e.g. in
 * `findUserByEmail` which is used by `verifyCredentials`).
 */

import prisma from '../config/database'
import { hashPassword, comparePassword } from '../utils/hash'
import { logger } from '../utils/logger'
import { User } from '@prisma/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Data required to create a new user account.
 */
interface CreateUserData {
  /** User's email address – must be unique */
  email: string
  /** Plain-text password (will be hashed before storage) */
  password: string
  /** Name of the organisation the user belongs to */
  organization: string
  /** Optional given name */
  firstName?: string
  /** Optional family name */
  lastName?: string
}

/**
 * User record with the sensitive `password` field removed.
 * This is the safe shape to return to API consumers.
 */
export type UserWithoutPassword = Omit<User, 'password'>

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Create a new user account.
 *
 * Checks for an existing account with the same email, hashes the password
 * with bcrypt, persists the record, and returns the new user **without**
 * the password field.
 *
 * @param data - User creation payload
 * @returns The newly created user (password omitted)
 * @throws Error if a user with the same email already exists
 * @throws Re-throws any unexpected database errors
 *
 * @example
 * const user = await createUser({
 *   email: 'alice@example.com',
 *   password: 'secret123',
 *   organization: 'Acme Corp'
 * })
 */
export async function createUser(data: CreateUserData): Promise<UserWithoutPassword> {
  try {
    // Prevent duplicate accounts
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Never store plain-text passwords
    const hashedPassword = await hashPassword(data.password)

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        organization: data.organization,
        firstName: data.firstName,
        lastName: data.lastName
      }
    })

    logger.info(`User created: ${user.email}`)

    // Strip password before returning
    const { password, ...userWithoutPassword } = user
    return userWithoutPassword
  } catch (error) {
    logger.error('User creation failed', error)
    throw error
  }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Find a user by their email address.
 *
 * Returns the **full** User record (including the hashed password) so that
 * `verifyCredentials` can perform the bcrypt comparison.  Do **not** expose
 * the return value of this function directly in API responses.
 *
 * @param email - Email address to look up
 * @returns Full User record, or `null` if not found
 * @throws Re-throws any unexpected database errors
 *
 * @example
 * const user = await findUserByEmail('alice@example.com')
 * if (!user) throw new Error('Not found')
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    return await prisma.user.findUnique({
      where: { email }
    })
  } catch (error) {
    logger.error('Failed to find user by email', error)
    throw error
  }
}

/**
 * Find a user by their unique ID.
 *
 * Returns the user **without** the password field, making it safe to pass
 * directly to API response bodies or attach to `req.user`.
 *
 * @param id - UUID of the user
 * @returns User without password, or `null` if not found
 * @throws Re-throws any unexpected database errors
 *
 * @example
 * const user = await findUserById('550e8400-e29b-41d4-a716-446655440000')
 * if (!user) throw ApiError.notFound('User not found')
 */
export async function findUserById(id: string): Promise<UserWithoutPassword | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) return null

    const { password, ...userWithoutPassword } = user
    return userWithoutPassword
  } catch (error) {
    logger.error('Failed to find user by ID', error)
    throw error
  }
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

/**
 * Verify a user's login credentials.
 *
 * Looks up the account by email, then uses bcrypt to compare the supplied
 * plain-text password against the stored hash.  Returns the safe user shape
 * on success, or `null` when either the account does not exist or the
 * password is wrong (both cases return `null` to avoid user-enumeration).
 *
 * @param email    - Email address supplied at login
 * @param password - Plain-text password supplied at login
 * @returns User without password if credentials are valid, `null` otherwise
 * @throws Re-throws unexpected errors (not auth failures)
 *
 * @example
 * const user = await verifyCredentials(email, password)
 * if (!user) throw ApiError.unauthorized('Invalid email or password')
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<UserWithoutPassword | null> {
  try {
    // findUserByEmail returns the full record (with hash) for comparison
    const user = await findUserByEmail(email)

    if (!user) {
      // Return null rather than throwing to prevent user enumeration
      return null
    }

    const isValid = await comparePassword(password, user.password)

    if (!isValid) {
      return null
    }

    // Strip password before returning
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  } catch (error) {
    logger.error('Credential verification failed', error)
    throw error
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/**
 * Update a user's profile information.
 *
 * Only mutable, non-sensitive fields are accepted (`email`, `organization`,
 * `firstName`, `lastName`).  The `id`, `password`, and timestamp fields are
 * intentionally excluded from the allowed update shape.
 *
 * @param id   - UUID of the user to update
 * @param data - Partial set of fields to update
 * @returns Updated user without password
 * @throws Prisma P2025 if the user does not exist
 * @throws Re-throws any unexpected database errors
 *
 * @example
 * const updated = await updateUser(userId, { firstName: 'Alice' })
 */
export async function updateUser(
  id: string,
  data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'password'>>
): Promise<UserWithoutPassword> {
  try {
    const user = await prisma.user.update({
      where: { id },
      data
    })

    logger.info(`User updated: ${user.email}`)

    const { password, ...userWithoutPassword } = user
    return userWithoutPassword
  } catch (error) {
    logger.error('User update failed', error)
    throw error
  }
}

// ---------------------------------------------------------------------------
// List (admin)
// ---------------------------------------------------------------------------

/**
 * Retrieve a paginated list of all users.
 *
 * Intended for administrative use only – ensure the calling route is
 * protected by an admin/role middleware before exposing this function.
 * Results are ordered by creation date (newest first) and passwords are
 * stripped from every record.
 *
 * @param page  - 1-based page number (default: `1`)
 * @param limit - Number of records per page (default: `20`, max recommended: `100`)
 * @returns Object containing the `users` array (without passwords) and the
 *          overall `total` count for pagination metadata
 * @throws Re-throws any unexpected database errors
 *
 * @example
 * const { users, total } = await getAllUsers(2, 10)
 * // Returns users 11-20, total = overall count
 */
export async function getAllUsers(
  page: number = 1,
  limit: number = 20
): Promise<{ users: UserWithoutPassword[]; total: number }> {
  try {
    const skip = (page - 1) * limit

    // Run count and fetch in parallel for better performance
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count()
    ])

    // Remove password from every record before returning
    const usersWithoutPasswords = users.map(({ password, ...user }) => user)

    return { users: usersWithoutPasswords, total }
  } catch (error) {
    logger.error('Failed to get users', error)
    throw error
  }
}
