import { Router } from 'express'
import {
  getVideos,
  getVideo,
  updateVideoMetadata,
  updateVideoStatusHandler,
  reprocessVideo,
  saveProgress,
  getProgress,
  streamHLSFile
} from '../controllers/video.controller'
import { authenticate, optionalAuth } from '../middleware/auth.middleware'
import { validateApiKey } from '../middleware/apiKey.middleware'
import {
  videoIdValidation,
  updateProgressValidation,
  createVideoValidation
} from '../middleware/validator.middleware'
import { streamRateLimiter } from '../middleware/rateLimiter.middleware'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

// GET /api/videos — list all videos (paginated)
router.get('/', asyncHandler(getVideos))

// GET /api/videos/:id/hls/* — proxy HLS files from R2
router.get(
  '/:id/hls/*',
  streamRateLimiter,
  videoIdValidation,
  asyncHandler(streamHLSFile)
)

// GET /api/videos/:id — get single video with signed URLs
router.get(
  '/:id',
  videoIdValidation,
  streamRateLimiter,
  optionalAuth,
  asyncHandler(getVideo)
)

// PATCH /api/videos/:id/status — internal: video-processor updates processing status
// ⚠️ Must be defined BEFORE /:id to avoid routing conflicts
router.patch(
  '/:id/status',
  validateApiKey,
  videoIdValidation,
  asyncHandler(updateVideoStatusHandler)
)

// POST /api/videos/:id/reprocess — re-queue an existing video without re-uploading
router.post(
  '/:id/reprocess',
  authenticate,
  videoIdValidation,
  asyncHandler(reprocessVideo)
)

// PATCH /api/videos/:id — update metadata (title, description, duration)
router.patch(
  '/:id',
  authenticate,
  videoIdValidation,
  createVideoValidation,
  asyncHandler(updateVideoMetadata)
)

// POST /api/videos/:id/progress — save playback progress
router.post(
  '/:id/progress',
  authenticate,
  videoIdValidation,
  updateProgressValidation,
  asyncHandler(saveProgress)
)

// GET /api/videos/:id/progress — get playback progress
router.get(
  '/:id/progress',
  authenticate,
  videoIdValidation,
  asyncHandler(getProgress)
)

export default router