/**
 * Video Service
 *
 * Manages video metadata (CRUD), processing status transitions, and
 * per-user playback progress.  Signed streaming URLs are generated
 * on-the-fly using the R2 service so that object-storage keys are
 * never exposed directly to API consumers.
 */

import prisma from '../config/database'
//import { getSignedUrlForFile } from './r2.service'
import { logger } from '../utils/logger'
import { Video, VideoStatus } from '@prisma/client'
//import { videoConfig } from '../config/app.config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Data required to create a new video record.
 * After creation the record has status UPLOADING; the video processor
 * later transitions it to PROCESSING → READY (or FAILED).
 */
interface CreateVideoData {
  /** Display title shown to users */
  title: string
  /** Optional long-form description */
  description?: string
  /** Original filename as uploaded (e.g. "my-lecture.mp4") */
  originalFilename: string
  /** Duration in seconds – may be unknown at upload time (default: 0) */
  duration?: number
}

/**
 * A Video record augmented with temporary signed streaming URLs.
 * `hlsUrl` and `thumbnailVttUrl` are only present when the video is READY
 * and the corresponding R2 paths are set.
 */
export interface VideoWithUrls extends Video {
  /** Pre-signed HLS master playlist URL (valid for `videoConfig.signedUrlExpiry` seconds) */
  hlsUrl?: string
  /** Pre-signed thumbnail VTT sprite URL */
  thumbnailVttUrl?: string
}

// ---------------------------------------------------------------------------
// Video CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new video record in the database.
 *
 * The record is created with status `UPLOADING`.  The caller is responsible
 * for uploading the raw file to R2 and then updating the status via
 * `updateVideoStatus`.
 *
 * @param data - Video creation payload
 * @returns The newly created Video record
 * @throws Re-throws any unexpected database errors
 *
 * @example
 * const video = await createVideo({
 *   title: 'Intro to HLS',
 *   originalFilename: 'intro.mp4',
 *   duration: 180
 * })
 */
export async function createVideo(data: CreateVideoData): Promise<Video> {
  try {
    const video = await prisma.video.create({
      data: {
        title: data.title,
        description: data.description,
        originalFilename: data.originalFilename,
        duration: data.duration || 0,
        status: VideoStatus.UPLOADING
      }
    })

    logger.info(`Video record created: ${video.id}`)
    return video
  } catch (error) {
    logger.error('Video creation failed', error)
    throw error
  }
}

/**
 * Update a video's processing status and optionally record R2 storage paths.
 *
 * When transitioning to `READY`, `processedAt` is automatically set to the
 * current timestamp.  Pass `paths` to record the HLS master playlist, VTT
 * thumbnail file, and sprite sheet paths returned by the video processor.
 *
 * @param id     - UUID of the video to update
 * @param status - New `VideoStatus` value
 * @param paths  - Optional R2 object keys to persist alongside the status change
 * @returns The updated Video record
 * @throws Prisma P2025 if the video does not exist
 * @throws Re-throws any unexpected database errors
 *
 * @example
 * await updateVideoStatus(videoId, VideoStatus.READY, {
 *   hlsPath: 'videos/abc/master.m3u8',
 *   thumbnailVttPath: 'videos/abc/thumbnails.vtt',
 *   spritePath: 'videos/abc/sprite.jpg'
 * })
 */
export async function updateVideoStatus(
  id: string,
  status: VideoStatus,
  paths?: {
    hlsPath?: string
    thumbnailVttPath?: string
    spritePath?: string
    duration?: number
  }
): Promise<Video> {
  try {
    const updateData: any = { status }

    // Stamp the processing completion time when the video becomes ready
    if (status === VideoStatus.READY) {
      updateData.processedAt = new Date()
    }

    // Merge any provided R2 object-key paths into the update payload
    if (paths) {
      Object.assign(updateData, paths)
    }

    const video = await prisma.video.update({
      where: { id },
      data: updateData
    })

    logger.info(`Video status updated: ${id} -> ${status}`)
    return video
  } catch (error) {
    logger.error('Video status update failed', error)
    throw error
  }
}

/**
 * Retrieve a single video by ID, appending short-lived signed streaming URLs.
 *
 * Signed URLs are generated only when the video is in `READY` status and the
 * relevant R2 paths are populated.  The URLs expire after
 * `videoConfig.signedUrlExpiry` seconds (default: 1 hour).
 *
 * @param id - UUID of the video
 * @returns Video with signed `hlsUrl` / `thumbnailVttUrl`, or `null` if not found
 * @throws Re-throws R2 or database errors
 *
 * @example
 * const video = await getVideoById('550e8400-e29b-41d4-a716-446655440000')
 * if (!video) throw ApiError.notFound('Video not found')
 * // video.hlsUrl → pre-signed HLS URL
 */
export async function getVideoById(id: string): Promise<VideoWithUrls | null> {
  try {
    const video = await prisma.video.findUnique({
      where: { id }
    })

    if (!video) {
      return null
    }

    // Build signed URLs only when paths are available
    let hlsUrl: string | undefined
    let thumbnailVttUrl: string | undefined

    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

if (video.status === VideoStatus.READY && video.hlsPath) {
  hlsUrl = `${BACKEND_URL}/api/v1/videos/${video.id}/hls/master.m3u8`
}

if (video.thumbnailVttPath) {
  thumbnailVttUrl = `${BACKEND_URL}/api/v1/videos/${video.id}/hls/thumbnails.vtt`
}

    return { ...video, hlsUrl, thumbnailVttUrl }
  } catch (error) {
    logger.error('Failed to get video', error)
    throw error
  }
}

/**
 * Retrieve a paginated list of videos, optionally filtered by status.
 *
 * Results are ordered by creation date (newest first).  This function
 * returns raw Video records **without** signed URLs – use `getVideoById`
 * when signed URLs are needed for a specific video.
 *
 * @param page   - 1-based page number (default: `1`)
 * @param limit  - Records per page (default: `20`)
 * @param status - Optional status filter (e.g. `VideoStatus.READY`)
 * @returns Object with `videos` array, overall `total`, and `pages` count
 * @throws Re-throws any unexpected database errors
 *
 * @example
 * const { videos, total, pages } = await getAllVideos(1, 20, VideoStatus.READY)
 */
export async function getAllVideos(
  page: number = 1,
  limit: number = 20,
  status?: VideoStatus
): Promise<{ videos: Video[]; total: number; pages: number }> {
  try {
    const skip = (page - 1) * limit
    const where = status ? { status } : {}

    // Run count and data fetch in parallel for better performance
    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.video.count({ where })
    ])

    const pages = Math.ceil(total / limit)

    return { videos, total, pages }
  } catch (error) {
    logger.error('Failed to get videos', error)
    throw error
  }
}

/**
 * Update editable metadata fields of an existing video.
 *
 * Only `title`, `description`, and `duration` are accepted; status and
 * storage-path fields must be updated via `updateVideoStatus`.
 *
 * @param id   - UUID of the video to update
 * @param data - Partial set of updatable fields
 * @returns The updated Video record
 * @throws Prisma P2025 if the video does not exist
 * @throws Re-throws any unexpected database errors
 *
 * @example
 * const updated = await updateVideo(videoId, { title: 'New Title' })
 */
export async function updateVideo(
  id: string,
  data: Partial<Pick<Video, 'title' | 'description' | 'duration'>>
): Promise<Video> {
  try {
    const video = await prisma.video.update({
      where: { id },
      data
    })

    logger.info(`Video metadata updated: ${id}`)
    return video
  } catch (error) {
    logger.error('Video update failed', error)
    throw error
  }
}

/**
 * Soft-delete a video by transitioning its status to `FAILED`.
 *
 * The record is retained in the database for auditing purposes.  A separate
 * cleanup job should be responsible for removing the associated R2 objects.
 *
 * @param id - UUID of the video to soft-delete
 * @throws Prisma P2025 if the video does not exist
 * @throws Re-throws any unexpected database errors
 *
 * @example
 * await deleteVideo(videoId)
 */
export async function deleteVideo(id: string): Promise<void> {
  try {
    await prisma.video.update({
      where: { id },
      data: { status: VideoStatus.FAILED }
    })

    logger.info(`Video marked for deletion: ${id}`)
  } catch (error) {
    logger.error('Video deletion failed', error)
    throw error
  }
}

// ---------------------------------------------------------------------------
// Video Progress
// ---------------------------------------------------------------------------

/**
 * Retrieve a user's current playback progress for a specific video.
 *
 * Returns `null` when the user has never started the video.  The returned
 * record includes `currentTime` (seconds), `completed`, and `lastWatched`.
 *
 * @param userId  - UUID of the authenticated user
 * @param videoId - UUID of the video
 * @returns VideoProgress record or `null`
 * @throws Re-throws any unexpected database errors
 *
 * @example
 * const progress = await getVideoProgress(userId, videoId)
 * const resumeAt = progress?.currentTime ?? 0
 */
export async function getVideoProgress(userId: string, videoId: string) {
  try {
    return await prisma.videoProgress.findUnique({
      where: {
        userId_videoId: { userId, videoId }
      }
    })
  } catch (error) {
    logger.error('Failed to get video progress', error)
    throw error
  }
}

/**
 * Create or update a user's playback progress for a video (upsert).
 *
 * If no progress record exists the function creates one; otherwise it
 * updates `currentTime`, `completed`, and `lastWatched`.  The frontend
 * should call this endpoint periodically (e.g. every 5–10 seconds) and
 * on pause/seek events.
 *
 * @param userId      - UUID of the authenticated user
 * @param videoId     - UUID of the video
 * @param currentTime - Current playback position in seconds
 * @param completed   - Whether the video has been fully watched (default: `false`)
 * @returns The created or updated VideoProgress record
 * @throws Re-throws any unexpected database errors
 *
 * @example
 * await updateVideoProgress(userId, videoId, 145, false)
 * // Later, when the video ends:
 * await updateVideoProgress(userId, videoId, 180, true)
 */
export async function updateVideoProgress(
  userId: string,
  videoId: string,
  currentTime: number,
  completed: boolean = false
) {
  try {
    return await prisma.videoProgress.upsert({
      where: {
        userId_videoId: { userId, videoId }
      },
      create: {
        userId,
        videoId,
        currentTime,
        completed
      },
      update: {
        currentTime,
        completed,
        lastWatched: new Date()
      }
    })
  } catch (error) {
    logger.error('Failed to update video progress', error)
    throw error
  }
}
