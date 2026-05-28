/**
 * Thumbnail Sprite Generator
 *
 * Generates a sprite sheet (single image) containing thumbnail frames
 * extracted from a video at regular intervals using FFmpeg.
 *
 * The sprite is a 10x10 grid of 320x180px thumbnails, extracted at 0.5fps
 * (one frame every 2 seconds), resulting in up to 100 thumbnails per video.
 */

import fs from 'fs/promises'
import { thumbnailConfig, getProcessingPaths } from '../config/ffmpeg.config'
import {
  executeFFmpegCommand,
  getVideoMetadata,
  escapeFFmpegPath,
  buildFFmpegCommand
} from '../utils/ffmpeg.utils'
import { logger } from '../utils/logger'
/**
 * Generate thumbnail sprite sheet from video.
 *
 * Extracts frames from the video at the configured fps rate, scales each
 * frame to the configured thumbnail size, and tiles them into a single
 * sprite image using FFmpeg's `tile` filter.
 *
 * @param videoId   - Unique identifier for the video (used to derive output paths)
 * @param inputPath - Absolute path to the source video file
 * @returns Absolute path to the generated sprite JPEG file
 * @throws If FFmpeg command fails or metadata cannot be read
 *
 * @example
 * const spritePath = await generateThumbnailSprite('abc123', '/tmp/abc123_original.mp4')
 * // => '/output/abc123/sprite.jpg'
 */
export async function generateThumbnailSprite(
  videoId: string,
  inputPath: string
): Promise<string> {
  logger.logThumbnailGeneration(videoId)
  const startTime = Date.now()

  try {
    // Get video metadata (duration, resolution, codec)
    const metadata = await getVideoMetadata(inputPath)
    logger.info(`📹 Video metadata for thumbnail generation:`, {
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height
    })

    // Derive output paths for this video
    const paths = getProcessingPaths(videoId)
    const spritePath = paths.sprite

    // Build the FFmpeg video filter chain:
    //   fps    - extract frames at the configured rate (0.5 = 1 frame every 2s)
    //   scale  - resize each frame to thumbnail dimensions (e.g. 160x90)
    //   tile   - combine all frames into a single sprite grid (e.g. 10x10)
    const vfFilter = [
      `fps=${thumbnailConfig.fps}`,
      `scale=${thumbnailConfig.width}:${thumbnailConfig.height}`,
      `tile=${thumbnailConfig.gridColumns}x${thumbnailConfig.gridRows}`
    ].join(',')

    // Skip the first 0.5s to avoid the black fade-in that appears at t=0
  // in most screen recordings and lecture videos.
  // Only seek if the video is long enough to have frames past 0.5s.
  const seekOffset = metadata.duration > 1 ? '0.5' : '0'

  const args = [
  '-y',
  ...(seekOffset !== '0' ? ['-ss', seekOffset] : []),
  '-i', escapeFFmpegPath(inputPath),
  '-vf', `"${vfFilter}"`,
  '-frames:v', '1',
  '-q:v', '2',
  escapeFFmpegPath(spritePath)
  ]

    const command = buildFFmpegCommand(args)
    await executeFFmpegCommand(command)

    // FFmpeg can exit 0 without producing the output file — verify it actually exists
    const spriteExists = await fs.access(spritePath).then(() => true).catch(() => false)
    if (!spriteExists) {
      throw new Error(`FFmpeg exited 0 but sprite.jpg was not created at: ${spritePath}`)
    }

    const duration = Math.round((Date.now() - startTime) / 1000)
    logger.info(`✅ Thumbnail sprite generated in ${duration}s: ${spritePath}`)

    return spritePath
  } catch (error) {
    logger.error('❌ Thumbnail sprite generation failed:', error)
    throw error
  }
}

/**
 * Calculate the number of thumbnails that will be generated for a video.
 *
 * Based on the configured extraction frame rate and grid dimensions.
 * The result is capped at the maximum grid capacity (gridColumns × gridRows).
 *
 * @param videoDuration - Total video duration in seconds
 * @returns Number of thumbnails that will appear in the sprite sheet
 *
 * @example
 * // For a 5-minute video at 0.5fps with a 10x10 grid (max 100):
 * calculateThumbnailCount(300) // => 100 (capped at grid size)
 *
 * // For a 60-second video at 0.5fps:
 * calculateThumbnailCount(60)  // => 30
 */
export function calculateThumbnailCount(videoDuration: number): number {
  // thumbnailConfig.fps = 0.5 → 1 thumbnail every 2 seconds
  const thumbnailsPerSecond = thumbnailConfig.fps
  const totalThumbnails = Math.floor(videoDuration * thumbnailsPerSecond)

  // Cap at the maximum grid capacity
  const maxThumbnails = thumbnailConfig.gridColumns * thumbnailConfig.gridRows

  const count = Math.min(totalThumbnails, maxThumbnails)

  logger.debug(`🖼️  Thumbnail count for ${videoDuration}s video: ${count} (max: ${maxThumbnails})`)

  return count
}
