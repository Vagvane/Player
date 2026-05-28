/**
 * Upload Routes
 *
 * Defines all routes related to video file uploads including
 * uploading a video file to Cloudflare R2 and checking the
 * processing status of an uploaded video.
 *
 * Base path: /api/v1/upload
 */

import { Router } from 'express'
import { uploadVideo, getUploadStatus, uploadMiddleware } from '../controllers/upload.controller'
import { authenticate } from '../middleware/auth.middleware'
import { uploadRateLimiter } from '../middleware/rateLimiter.middleware'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

/**
 * @route   POST /api/upload
 * @desc    Upload a video file to Cloudflare R2 and create a database record.
 *          The file is accepted as multipart/form-data under the field name "video".
 *          After upload the video enters a PENDING state; processing is queued
 *          separately by the video processor service (Part 4).
 * @access  Private (requires valid JWT Bearer token)
 * @headers Authorization: Bearer <token>
 * @body    multipart/form-data { video: File, title: string, description?: string }
 * @returns { success: true, message: string, data: { video } }
 */
router.post(
  '/',
  authenticate,
  uploadRateLimiter,
  uploadMiddleware,
  asyncHandler(uploadVideo)
)

/**
 * @route   GET /api/upload/status/:videoId
 * @desc    Poll the upload and processing status of a previously uploaded video.
 *          Returns the current VideoStatus (PENDING | PROCESSING | READY | FAILED)
 *          along with the processed timestamp when available.
 * @access  Private (requires valid JWT Bearer token)
 * @param   videoId {string} - ID of the video to check status for
 * @headers Authorization: Bearer <token>
 * @returns { success: true, data: { videoId, status, title, processedAt } }
 */
router.get(
  '/status/:videoId',
  authenticate,
  asyncHandler(getUploadStatus)
)

export default router
