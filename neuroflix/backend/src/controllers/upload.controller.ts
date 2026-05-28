/**
 * @file upload.controller.ts
 * @description Upload controller for video file ingestion and processing status tracking.
 * Files are stored in memory by multer and streamed directly to Cloudflare R2.
 * After upload, a processing job should be queued (Part 4 - Video Processor).
 *
 * @remarks
 * File size and MIME type validation is enforced at the multer level before the
 * controller is reached, providing a consistent rejection path with helpful error messages.
 */

import { Request, Response } from 'express'
import { createVideo } from '../services/video.service'
import { uploadFile } from '../services/r2.service'
import { addVideoProcessingJob } from '@/queue/videoQueue'
import { getVideoPaths } from '../config/r2.config'
import { logger } from '../utils/logger'
import { ApiError } from '../middleware/errorHandler.middleware'
import multer from 'multer'
import { videoConfig } from '../config/app.config'

// ---------------------------------------------------------------------------
// Multer configuration
// ---------------------------------------------------------------------------

/**
 * Multer configuration for video upload.
 * Files are stored in memory (Buffer) and never written to disk on this server.
 * They are forwarded directly to Cloudflare R2 storage.
 *
 * Validation enforced here:
 * - Maximum file size: `videoConfig.maxUploadSize` (default 5 GB)
 * - Allowed MIME types: `videoConfig.allowedMimeTypes`
 *
 * @remarks
 * Memory storage is appropriate for this workload because the file is streamed
 * to R2 immediately after receipt. For very large files in production, consider
 * switching to disk storage or a streaming pipeline to avoid OOM pressure.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: videoConfig.maxUploadSize
  },
  fileFilter: (_req, file, cb) => {
    // Reject unsupported MIME types before the buffer is even built
    if (!videoConfig.allowedMimeTypes.includes(file.mimetype)) {
      cb(
        new Error(
          `Invalid file type. Allowed types: ${videoConfig.allowedFormats.join(', ')}`
        )
      )
      return
    }
    cb(null, true)
  }
})

/**
 * Multer middleware pre-configured for a single field named `video`.
 * Apply this before `uploadVideo` in the route definition.
 *
 * @example
 * router.post('/', authenticate, uploadRateLimiter, uploadMiddleware, asyncHandler(uploadVideo))
 */
export const uploadMiddleware = upload.single('video')

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

/**
 * Upload a video file
 * POST /api/upload
 *
 * @param req - Express request with `req.file` populated by multer and body: { title, description? }
 * @param res - Express response
 * @returns 201 with the created video database record
 * @throws ApiError.unauthorized if not authenticated
 * @throws ApiError.badRequest if no file or no title is provided
 *
 * @remarks
 * Flow:
 * 1. Validate authentication and file presence
 * 2. Create a `PENDING` video record in the database
 * 3. Upload the raw file buffer to Cloudflare R2
 * 4. Queue a transcoding job via the Video Processor
 *
 * The video status remains `PENDING` until the Video Processor marks it `READY`.
 */
export async function uploadVideo(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Not authenticated')
    }

    if (!req.file) {
      throw ApiError.badRequest('No video file provided')
    }

    const { title, description } = req.body

    if (!title) {
      throw ApiError.badRequest('Title is required')
    }

    logger.info(`Starting video upload: ${title} (${req.file.originalname})`)

    // Create a database record in PENDING state before uploading to R2
    const video = await createVideo({
      title,
      description,
      originalFilename: req.file.originalname
    })

    // Resolve the R2 storage path for the raw upload
    const paths = getVideoPaths(video.id)

    // Stream the in-memory buffer to Cloudflare R2
    await uploadFile({
      key: paths.upload,
      body: req.file.buffer,
      contentType: req.file.mimetype,
      metadata: {
        userId: req.user.userId,
        videoId: video.id,
        originalName: req.file.originalname
      }
    })

    logger.info(`Video uploaded to R2: ${video.id}`)

    // Queue the video for processing — fire-and-forget so a Redis blip
    // never blocks the upload response. R2 upload already succeeded.
    addVideoProcessingJob({
      videoId: video.id,
      originalFilePath: paths.upload,
      title: video.title,
      userId: req.user.userId
    }).then(() => {
      logger.info(`✅ Processing job queued for video: ${video.id}`)
    }).catch((err) => {
      logger.warn(`⚠️ Failed to queue job for video ${video.id} — may need manual requeue`, err)
    })
    // await queueTranscodeJob(video.id)

    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully. Processing will begin shortly.',
      data: { video }
    })
  } catch (error) {
    logger.error('Video upload failed', error)
    throw error
  }
}

/**
 * Get the upload / processing status of a video
 * GET /api/upload/status/:videoId
 *
 * @param req - Express request with videoId route param
 * @param res - Express response
 * @returns 200 with videoId, status, title, and processedAt timestamp
 * @throws ApiError.notFound if video does not exist
 *
 * @remarks
 * Possible status values (from VideoStatus enum):
 * - `PENDING`    — uploaded, awaiting transcoding
 * - `PROCESSING` — FFmpeg transcoding in progress
 * - `READY`      — HLS streams generated and available
 * - `FAILED`     — processing encountered an unrecoverable error
 */
export async function getUploadStatus(req: Request, res: Response): Promise<void> {
  try {
    const { videoId } = req.params

    // Dynamic import avoids a circular dependency between upload and video services
    const { getVideoById } = await import('../services/video.service')
    const video = await getVideoById(videoId)

    if (!video) {
      throw ApiError.notFound('Video not found')
    }

    res.status(200).json({
      success: true,
      data: {
        videoId: video.id,
        status: video.status,
        title: video.title,
        processedAt: video.processedAt
      }
    })
  } catch (error) {
    logger.error('Failed to get upload status', error)
    throw error
  }
}
