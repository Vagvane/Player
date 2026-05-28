/**
 * Express Type Extensions for Neuroflix Backend
 *
 * This file augments the global Express namespace to add custom properties
 * to the Express Request interface. TypeScript merges this declaration with
 * the existing Express types, making `req.user` available throughout the app
 * without needing to cast or re-declare it in every file.
 *
 * How it works:
 * - TypeScript supports "declaration merging" for interfaces and namespaces.
 * - By declaring `namespace Express` inside `declare global`, we extend the
 *   globally available Express types that come from `@types/express`.
 * - Any middleware that sets `req.user` (e.g., auth.middleware.ts) will satisfy
 *   this type contract, and all downstream route handlers will have type-safe
 *   access to `req.user`.
 *
 * Usage:
 * ```typescript
 * // In any route handler or middleware:
 * app.get('/profile', authenticate, (req, res) => {
 *   // TypeScript knows req.user has userId, email, organization
 *   const { userId, email, organization } = req.user!
 *   res.json({ userId, email, organization })
 * })
 * ```
 *
 * @see backend/src/middleware/auth.middleware.ts — sets req.user after JWT verification
 */

declare global {
  namespace Express {
    /**
     * Extend the Express Request interface to include an optional `user` property.
     *
     * This property is populated by the `authenticate` middleware in
     * `auth.middleware.ts` after successfully verifying a JWT token.
     *
     * It is marked optional (`?`) because:
     * - Not all routes require authentication.
     * - The `optionalAuth` middleware may or may not attach a user depending
     *   on whether a valid token is present in the request headers.
     *
     * Fields mirror the JWT token payload defined in `jwt.config.ts`.
     */
    interface Request {
      user?: {
        /**
         * The unique identifier (UUID) of the authenticated user.
         * Corresponds to the `id` field in the Prisma `User` model.
         */
        userId: string

        /**
         * The email address of the authenticated user.
         * Used for logging and as a human-readable identifier.
         */
        email: string

        /**
         * The organization the user belongs to.
         * Included in the JWT payload for multi-tenant scoping.
         */
        organization: string
      }
    }
  }
}

/**
 * This empty export is required to make TypeScript treat this file as a
 * module rather than a script. Without it, the `declare global` block would
 * not correctly augment the global namespace in all TypeScript module contexts.
 */
export {}
