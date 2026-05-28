/**
 * @file video.controller.ts
 * @description Video controller for video metadata retrieval, updates, and progress tracking.
 * Handles paginated video listings, single video access with signed streaming URLs,
 * and per-user playback progress persistence.
 */

import { downloadFile, fileExists } from '../services/r2.service'

import { Request, Response } from 'express'
import { VideoStatus } from '@prisma/client'
import { addVideoProcessingJob } from '@/queue/videoQueue'
import {
  getAllVideos,
  getVideoById,
  updateVideo,
  updateVideoStatus,
  getVideoProgress,
  updateVideoProgress
} from '../services/video.service'
import { logger } from '../utils/logger'
import { ApiError } from '../middleware/errorHandler.middleware'

/**
 * Get all videos (paginated)
 * GET /api/videos?page=1&limit=20&status=READY
 *
 * @param req - Express request with optional query params: page, limit, status
 * @param res - Express response
 * @returns 200 with paginated video list and meta information
 * @throws ApiError.badRequest if pagination parameters are invalid
 */
export async function getVideos(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const status = req.query.status as any

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      throw ApiError.badRequest('Invalid pagination parameters')
    }

    const result = await getAllVideos(page, limit, status)

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        page,
        limit,
        totalPages: result.pages,
        totalItems: result.total
      }
    })
  } catch (error) {
    logger.error('Failed to get videos', error)
    throw error
  }
}

/**
 * Get video by ID with signed streaming URLs
 * GET /api/videos/:id
 *
 * @param req - Express request with video ID param
 * @param res - Express response
 * @returns 200 with video data, signed HLS/thumbnail URLs, and user progress (if authenticated)
 * @throws ApiError.notFound if video does not exist
 *
 * @remarks
 * Uses optionalAuth middleware — unauthenticated users receive the video without progress data.
 * Signed URLs are generated server-side and expire after the configured duration.
 */
export async function getVideo(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params

    const video = await getVideoById(id)

    if (!video) {
      throw ApiError.notFound('Video not found')
    }

    // If user is authenticated, include their playback progress
    let progress = null
    if (req.user) {
      progress = await getVideoProgress(req.user.userId, id)
    }

    res.status(200).json({
      success: true,
      data: {
        video,
        progress
      }
    })
  } catch (error) {
    logger.error('Failed to get video', error)
    throw error
  }
}

/**
 * Update video metadata
 * PATCH /api/videos/:id
 *
 * @param req - Express request with video ID param and optional body fields: title, description, duration
 * @param res - Express response
 * @returns 200 with updated video object
 * @throws ApiError.notFound if video does not exist
 *
 * @remarks Requires authentication. Only title, description, and duration can be updated.
 */
export async function updateVideoMetadata(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { title, description, duration } = req.body

    // Verify video exists before attempting update
    const existingVideo = await getVideoById(id)
    if (!existingVideo) {
      throw ApiError.notFound('Video not found')
    }

    const updatedVideo = await updateVideo(id, {
      title,
      description,
      duration
    })

    logger.info(`Video metadata updated: ${id}`)

    res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      data: { video: updatedVideo }
    })
  } catch (error) {
    logger.error('Failed to update video', error)
    throw error
  }
}

/**
 * Save user's video playback progress
 * POST /api/videos/:id/progress
 *
 * @param req - Express request with video ID param and body: { currentTime, completed? }
 * @param res - Express response
 * @returns 200 with updated progress record
 * @throws ApiError.unauthorized if not authenticated
 * @throws ApiError.notFound if video does not exist
 *
 * @remarks
 * Uses upsert internally — creates a new record on first call, updates on subsequent calls.
 * Call this endpoint periodically during playback (e.g., every 10–30 seconds).
 */
export async function saveProgress(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Not authenticated')
    }

    const { id: videoId } = req.params
    const { currentTime, completed } = req.body

    // Verify video exists before saving progress
    const video = await getVideoById(videoId)
    if (!video) {
      throw ApiError.notFound('Video not found')
    }

    // Upsert progress record
    const progress = await updateVideoProgress(
      req.user.userId,
      videoId,
      currentTime,
      completed || false
    )

    logger.debug(
      `Video progress updated: user=${req.user.userId}, video=${videoId}, time=${currentTime}`
    )

    res.status(200).json({
      success: true,
      message: 'Progress saved successfully',
      data: { progress }
    })
  } catch (error) {
    logger.error('Failed to save progress', error)
    throw error
  }
}

/**
 * Get user's playback progress for a video
 * GET /api/videos/:id/progress
 *
 * @param req - Express request with video ID param
 * @param res - Express response
 * @returns 200 with progress record, or null if no progress recorded yet
 * @throws ApiError.unauthorized if not authenticated
 *
 * @remarks
 * Returns null (not 404) when no progress exists yet, allowing the client
 * to distinguish "not started" from "video not found".
 */
export async function getProgress(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Not authenticated')
    }

    const { id: videoId } = req.params

    const progress = await getVideoProgress(req.user.userId, videoId)

    res.status(200).json({
      success: true,
      data: { progress }
    })
  } catch (error) {
    logger.error('Failed to get progress', error)
    throw error
  }
}
/**
 * Update video processing status (internal — called by video-processor service)
 * PATCH /api/videos/:id/status
 *
 * @access Internal (requires X-API-Key header)
 * @body   { status: VideoStatus, hlsPath?, thumbnailVttPath?, spritePath? }
 */
export async function updateVideoStatusHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { status, hlsPath, thumbnailVttPath, spritePath, duration } = req.body


    if (!status) {
      throw ApiError.badRequest('Status is required')
    }
    
    const video = await updateVideoStatus(id, status, {
  hlsPath,
  thumbnailVttPath,
  spritePath,
  duration: duration !== undefined ? Math.round(duration) : undefined
})

    logger.info(`Video status updated via processor: ${id} -> ${status}`)

    res.status(200).json({
      success: true,
      message: 'Video status updated',
      data: { video }
    })
  } catch (error) {
    logger.error('Failed to update video status', error)
    throw error
  }
}

/**
 * Re-queue a video for processing without requiring re-upload.
 * POST /api/videos/:id/reprocess
 *
 * @access Authenticated users
 * @remarks Resets the video status to UPLOADING and submits a new BullMQ job
 *          using the original file already in R2. Useful when thumbnails or
 *          duration are missing because the video was processed with an older
 *          pipeline that did not generate sprites / VTT / duration.
 */
export async function reprocessVideo(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Not authenticated')
    }

    const { id } = req.params

    const video = await getVideoById(id)
    if (!video) {
      throw ApiError.notFound('Video not found')
    }

    // Original uploads always land at uploads/<videoId>/original.mp4
    const originalFilePath = `uploads/${id}/original.mp4`

    const originalExists = await fileExists(originalFilePath)
    if (!originalExists) {
      throw ApiError.badRequest('Original video file not found in storage — please re-upload the video')
    }

    // Reset so the processor can drive the status through PROCESSING → READY
    await updateVideoStatus(id, VideoStatus.UPLOADING)

    await addVideoProcessingJob({
      videoId: id,
      originalFilePath,
      title: video.title,
      userId: req.user.userId
    })

    logger.info(`Video re-queued for processing: ${id}`)

    res.status(200).json({
      success: true,
      message: 'Video queued for reprocessing'
    })
  } catch (error) {
    logger.error('Failed to reprocess video', error)
    throw error
  }
}

/**
 * Proxy an HLS file (playlist or segment) from R2.
 * GET /api/videos/:id/hls/*
 */
export async function streamHLSFile(req: Request, res: Response): Promise<void> {
  try {
    const { id: videoId } = req.params
    const filePath = (req.params as any)[0] as string

    if (!filePath) {
      throw ApiError.badRequest('Invalid HLS file path')
    }

    const safePath = filePath.replace(/\.\.\//g, '').replace(/^\/+/, '')
    const r2Key = `videos/${videoId}/${safePath}`

    const contentType = safePath.endsWith('.m3u8')
      ? 'application/vnd.apple.mpegurl'
      : safePath.endsWith('.ts')
      ? 'video/mp2t'
      : safePath.endsWith('.vtt')
      ? 'text/vtt'
      : safePath.endsWith('.jpg') || safePath.endsWith('.jpeg')
      ? 'image/jpeg'
      : 'application/octet-stream'

    const buffer = await downloadFile(r2Key)

    res.set('Content-Type', contentType)
    res.set('Cache-Control', 'private, max-age=60')
    res.send(buffer)
  } catch (error: any) {
    if (error.message?.includes('R2 download failed')) {
      throw ApiError.notFound('HLS file not found')
    }
    logger.error('Failed to proxy HLS file', error)
    throw error
  }
}