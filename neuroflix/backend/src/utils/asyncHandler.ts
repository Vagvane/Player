/**
 * Async error handler wrapper for Express route handlers.
 *
 * Problem it solves:
 * Express does not natively catch errors thrown inside async route handlers.
 * Without a wrapper you must manually wrap every handler in a try/catch and
 * call `next(error)`. This utility eliminates that boilerplate.
 *
 * How it works:
 * The wrapper calls `Promise.resolve(fn(...))` and attaches `.catch(next)`,
 * so any rejected promise (or thrown error) is automatically forwarded to
 * Express's error-handling middleware.
 *
 * @module utils/asyncHandler
 *
 * @example
 * // Without asyncHandler (manual try-catch required):
 * router.get('/users', async (req, res, next) => {
 *   try {
 *     const users = await db.user.findMany()
 *     res.json(users)
 *   } catch (error) {
 *     next(error)
 *   }
 * })
 *
 * // With asyncHandler (errors forwarded automatically):
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await db.user.findMany()
 *   res.json(users)
 * }))
 */

import { Request, Response, NextFunction, RequestHandler } from 'express'

/**
 * Wrap an async Express route handler so that any thrown error or rejected
 * promise is automatically passed to the next error-handling middleware.
 *
 * @param fn - Async route handler `(req, res, next) => Promise<any>`
 * @returns A synchronous `RequestHandler` compatible with Express router methods
 *
 * @example
 * router.get('/videos', asyncHandler(async (req, res) => {
 *   const videos = await videoService.getAll()
 *   res.json({ success: true, data: videos })
 * }))
 *
 * @example
 * // Works with POST, PUT, DELETE, PATCH as well:
 * router.post('/videos', asyncHandler(async (req, res) => {
 *   const video = await videoService.create(req.body)
 *   res.status(201).json({ success: true, data: video })
 * }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Type-safe variant of `asyncHandler` for routes that use a custom,
 * extended `Request` type (e.g. an `AuthenticatedRequest` that adds `req.user`).
 *
 * The inner handler receives the narrowed request type `T`; Express receives
 * the standard `RequestHandler` signature.
 *
 * @typeParam T - Extended Request type (must extend the base Express `Request`)
 * @param fn - Async route handler typed with `T` as the request parameter
 * @returns A synchronous `RequestHandler` compatible with Express router methods
 *
 * @example
 * interface AuthRequest extends Request {
 *   user: { userId: string; email: string }
 * }
 *
 * router.get(
 *   '/me',
 *   authenticate,
 *   asyncHandlerTyped<AuthRequest>(async (req, res) => {
 *     // req.user is typed correctly here
 *     const profile = await userService.findById(req.user.userId)
 *     res.json({ success: true, data: profile })
 *   })
 * )
 */
export function asyncHandlerTyped<T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as T, res, next)).catch(next)
  }
}

export default asyncHandler
