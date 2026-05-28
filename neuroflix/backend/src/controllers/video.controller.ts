/**
 * @file video.controller.ts
 * @description Video controller for video metadata retrieval, updates, and progress tracking.
 * Handles paginated video listings, single video access with signed streaming URLs,
 * and per-user playback progress persistence.
 */

import { streamFile, streamPipeline, fileExists } from '../services/r2.service'

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
 * Returns `true` for errors that mean the client closed the connection before
 * the stream finished.  hls.js routinely cancels fetches it no longer needs
 * (quality switch, seek, player teardown) — these should never surface as 500s.
 *
 * Covers both the "client closed before headers flushed" case (res.headersSent
 * is still false) and the "mid-body disconnect" case.
 */
function isClientAbort(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg   = error.message.toLowerCase()
  const code  = (error as NodeJS.ErrnoException).code
  return (
    msg === 'premature close'              ||  // pipeline: writable closed early
    msg.includes('premature close')        ||
    code === 'ERR_STREAM_PREMATURE_CLOSE'  ||
    code === 'ECONNRESET'                  ||  // TCP reset by peer
    code === 'ECONNABORTED'                ||  // connection aborted
    code === 'EPIPE'                           // broken pipe (write to closed socket)
  )
}

/**
 * Stream an HLS file (playlist or segment) from R2 to the client.
 * GET /api/videos/:id/hls/*
 *
 * @remarks
 * This route is only called when the backend is running in proxy mode
 * (R2_PUBLIC_URL is NOT set).  When R2_PUBLIC_URL is set, `getVideoById`
 * returns direct Cloudflare CDN URLs and hls.js never calls this endpoint.
 *
 * Implementation uses a Node.js stream pipe — the file is never loaded
 * into RAM as a Buffer.  Bytes flow:
 *   R2 → (Node.js Readable pipe) → Express Response → browser
 *
 * Cache-Control is set to `public, max-age=86400, immutable` for `.ts`
 * segments (content-addressed, never change) and `public, max-age=5` for
 * `.m3u8` playlists (may be regenerated on reprocess).  If a CDN such as
 * Cloudflare is in front of this Express server, segments are cached at the
 * edge after the first request — so subsequent viewers never reach Express.
 */
export async function streamHLSFile(req: Request, res: Response): Promise<void> {
  const { id: videoId } = req.params
  const filePath = (req.params as any)[0] as string

  if (!filePath) {
    throw ApiError.badRequest('Invalid HLS file path')
  }

  // Sanitise: strip any path traversal attempts and leading slashes
  const safePath = filePath.replace(/\.\.\//g, '').replace(/^\/+/, '')
  const r2Key = `videos/${videoId}/${safePath}`

  const isSegment  = safePath.endsWith('.ts')
  const isPlaylist = safePath.endsWith('.m3u8')
  const isVtt      = safePath.endsWith('.vtt')
  const isImage    = safePath.endsWith('.jpg') || safePath.endsWith('.jpeg')

  const contentType = isPlaylist ? 'application/vnd.apple.mpegurl'
    : isSegment      ? 'video/mp2t'
    : isVtt          ? 'text/vtt'
    : isImage        ? 'image/jpeg'
    : 'application/octet-stream'

  // Cache-Control strategy for VOD assets:
  //  .ts segments    — content-addressed, never mutate → 24 h immutable
  //  sprite.jpg      — generated once per video, never changes → 24 h immutable
  //  thumbnails.vtt  — same as sprite → 24 h immutable
  //  level playlists — VOD playlists are also static once processing is done → 1 h immutable
  //  master.m3u8     — can be regenerated on reprocess → 30 s (short but avoids constant fetches)
  const isMasterPlaylist = safePath === 'master.m3u8'
  const cacheControl = isSegment || isImage || isVtt
    ? 'public, max-age=86400, immutable'
    : isPlaylist && !isMasterPlaylist
    ? 'public, max-age=3600, immutable'
    : isMasterPlaylist
    ? 'public, max-age=30'
    : 'public, max-age=86400, immutable'

  try {
    const { body, contentLength } = await streamFile(r2Key)

    res.set('Content-Type', contentType)
    res.set('Cache-Control', cacheControl)
    // Forward Content-Length so the browser can show a download-progress bar
    // and hls.js can pre-allocate its internal buffer correctly.
    if (contentLength !== undefined) {
      res.set('Content-Length', String(contentLength))
    }

    // Pipe the R2 stream directly into the HTTP response.
    // `streamPipeline` (promisified stream.pipeline) propagates errors and
    // calls res.destroy() on failure — safe to await inside asyncHandler.
    await streamPipeline(body, res)
  } catch (error: any) {
    // ── Client disconnected ───────────────────────────────────────────────
    // hls.js regularly cancels requests it no longer needs: quality switch,
    // seek that jumps past a segment, player teardown, etc.  Node's pipeline
    // surfaces those as "Premature close" / ECONNRESET / EPIPE.
    //
    // This can happen BEFORE headers are flushed (res.set() only queues
    // headers; the first write flushes them) OR mid-transfer.  Either way
    // it is not a server error — swallow it and release the request quietly.
    if (isClientAbort(error)) {
      logger.debug(`HLS stream cancelled by client: ${r2Key}`)
      return
    }

    // If headers are already sent we cannot write an error response —
    // log the interruption and let the connection close naturally.
    if (res.headersSent) {
      logger.error(`HLS stream interrupted mid-transfer: ${r2Key}`, error)
      return
    }

    if (error.message?.includes('R2 stream failed')) {
      throw ApiError.notFound('HLS file not found')
    }
    logger.error('Failed to stream HLS file', error)
    throw error
  }
}