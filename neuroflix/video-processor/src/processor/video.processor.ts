/**
 * Video Processor Orchestrator
 *
 * Main pipeline for video processing:
 * Download → Transcode HLS → Generate thumbnails → Generate VTT → Upload R2
 *
 * @module processor/video.processor
 */

import fs from 'fs/promises'
import { VideoJobData } from '../queue/queue.config'
import { transcodeToHLS } from '../transcoder'
import { generateThumbnailSprite } from '../thumbnails/sprite.generator'
import { generateVTTFile } from '../thumbnails/vtt.generator'
import { uploadHLSPackage } from '../uploader/r2.uploader'
import { downloadFromR2 } from '../downloader/r2.downloader'
import { updateVideoStatus } from '../services/video.service'
import { getProcessingPaths } from '../config/ffmpeg.config'
import { cleanupTempFiles } from '../utils/ffmpeg.utils'
import { logger } from '../utils/logger'

// ─────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────

/**
 * Result returned after successful video processing
 */
interface ProcessingResult {
  /** Unique identifier for the processed video */
  videoId: string
  /** Whether the processing succeeded */
  success: boolean
  /** R2 key for the HLS master playlist */
  hlsPath: string
  /** R2 key for the WebVTT thumbnail file */
  thumbnailVttPath: string
  /** R2 key for the thumbnail sprite image */
  spritePath: string
  /** Duration of the source video in seconds */
  duration: number
}

// ─────────────────────────────────────────────
// Main Processor
// ─────────────────────────────────────────────

/**
 * Process video: download, transcode, generate thumbnails, upload.
 *
 * Pipeline steps:
 * 1. Download original video from R2 to temp directory
 * 2. Transcode to multi-quality HLS (1080p / 720p / 480p / 360p)
 * 3. Generate thumbnail sprite sheet (10×10 grid, 160×90 px)
 * 4. Generate WebVTT file with sprite coordinates
 * 5. Upload all artefacts to R2 and update database status
 *
 * On any failure the video status is set to FAILED, temp/output
 * directories are cleaned up, and the original error is re-thrown
 * so BullMQ can apply its retry/back-off policy.
 *
 * @param jobData - Video job data from BullMQ queue
 * @returns Processing result with R2 paths and video duration
 * @throws Re-throws any error after performing cleanup & status update
 */
export async function processVideo(jobData: VideoJobData): Promise<ProcessingResult> {
  const { videoId, originalFilePath, title } = jobData

  logger.info(`🎬 Starting video processing: ${videoId} (${title})`)
  const startTime = Date.now()

  try {
    // ── Mark as PROCESSING ───────────────────────────────────────────
    await updateVideoStatus(videoId, 'PROCESSING')

    // ── Step 1: Download original video from R2 ──────────────────────
    logger.info(`📥 Step 1/5: Downloading original video from R2`)
    const paths = getProcessingPaths(videoId)
    await downloadFromR2(originalFilePath, paths.inputFile)

    // ── Step 2: Transcode to HLS ─────────────────────────────────────
    logger.info(`🎬 Step 2/5: Transcoding to HLS`)
    const transcodeResult = await transcodeToHLS(videoId, paths.inputFile)

    // ── Step 3: Generate thumbnail sprite ────────────────────────────
    logger.info(`🖼️  Step 3/5: Generating thumbnail sprite`)
    await generateThumbnailSprite(videoId, paths.inputFile)

    // ── Step 4: Generate VTT file ─────────────────────────────────────
    logger.info(`📝 Step 4/5: Generating VTT file`)
    await generateVTTFile(videoId, paths.inputFile)

    // ── Step 5: Upload artefacts to R2 ────────────────────────────────
    logger.info(`📤 Step 5/5: Uploading to R2`)
    const uploadPaths = await uploadHLSPackage(videoId, paths.outputDir)

    // ── Update database: READY ────────────────────────────────────────
    await updateVideoStatus(videoId, 'READY', {
      hlsPath: uploadPaths.hlsPath,
      thumbnailVttPath: uploadPaths.thumbnailVttPath,
      spritePath: uploadPaths.spritePath,
       duration: transcodeResult.duration
    })

    // ── Cleanup ───────────────────────────────────────────────────────
    await cleanupTempFiles(videoId)
    await cleanupOutputFiles(videoId)

    const totalDuration = Math.round((Date.now() - startTime) / 1000)
    logger.info(`✅ Video processing complete: ${videoId} (${totalDuration}s)`)

    return {
      videoId,
      success: true,
      hlsPath: uploadPaths.hlsPath,
      thumbnailVttPath: uploadPaths.thumbnailVttPath,
      spritePath: uploadPaths.spritePath,
      duration: transcodeResult.duration
    }
  } catch (error) {
    logger.error(`❌ Video processing failed: ${videoId}`, error)

    // ── Error recovery: set status to FAILED ─────────────────────────
    try {
      await updateVideoStatus(videoId, 'FAILED')
    } catch (updateError) {
      // Log but do not mask the original error
      logger.error('Failed to update video status to FAILED:', updateError)
    }

    // ── Error recovery: cleanup artefacts ────────────────────────────
    try {
      await cleanupTempFiles(videoId)
      await cleanupOutputFiles(videoId)
    } catch (cleanupError) {
      logger.warn('Cleanup failed:', cleanupError)
    }

    // Re-throw so BullMQ can apply retry / back-off
    throw error
  }
}

// ─────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────

/**
 * Clean up output directory after artefacts have been uploaded to R2.
 *
 * Uses `fs.rm` with `{ recursive: true, force: true }` so the entire
 * quality-specific subdirectory (HLS segments, playlists, sprites) is
 * removed in a single call.  Errors are caught and logged as warnings
 * to avoid masking the original processing error.
 *
 * @param videoId - Video ID whose output directory should be removed
 */
async function cleanupOutputFiles(videoId: string): Promise<void> {
  try {
    const paths = getProcessingPaths(videoId)
    await fs.rm(paths.outputDir, { recursive: true, force: true })
    logger.info(`🗑️  Cleaned up output directory: ${paths.outputDir}`)
  } catch (error) {
    logger.warn('Failed to cleanup output files:', error)
  }
}
