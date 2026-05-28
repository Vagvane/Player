/**
 * Routes Index
 *
 * Central router that mounts all feature-specific sub-routers and exposes
 * a single health check endpoint. This router is registered on the API
 * base path (e.g. /api/v1) in app.ts.
 *
 * Route map:
 *   GET  /health              → Health check
 *   *    /auth/**             → Authentication routes
 *   *    /videos/**           → Video routes
 *   *    /checkpoints/**      → Checkpoint routes
 *   *    /upload/**           → Upload routes
 */

import { Router } from 'express'
import authRoutes from './auth.routes'
import videoRoutes from './video.routes'
import checkpointRoutes from './checkpoint.routes'
import uploadRoutes from './upload.routes'

const router = Router()

/**
 * @route   GET /api/health
 * @desc    Health check endpoint to verify the API is running.
 *          Useful for load-balancer probes and uptime monitors.
 * @access  Public
 * @returns { success: true, message: string, timestamp: string }
 */
router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Neuroflix API is running',
    timestamp: new Date().toISOString()
  })
})

/**
 * Authentication routes
 * Handles user registration, login, session retrieval and logout.
 * @see auth.routes.ts
 */
router.use('/auth', authRoutes)

/**
 * Video routes
 * Handles video listing, retrieval with signed URLs, metadata updates
 * and playback progress tracking.
 * @see video.routes.ts
 */
router.use('/videos', videoRoutes)

/**
 * Checkpoint routes
 * Handles quiz checkpoint retrieval, answer submission and
 * user answer history.
 * @see checkpoint.routes.ts
 */
router.use('/checkpoints', checkpointRoutes)

/**
 * Upload routes
 * Handles video file uploads to Cloudflare R2 and processing
 * status polling.
 * @see upload.routes.ts
 */
router.use('/upload', uploadRoutes)

export default router
