/**
 * Quality Validator
 * Determines which HLS quality levels are feasible for a given source video,
 * avoiding upscaling and providing processing time estimates.
 */

import { qualityPresets, QualityPreset } from '../config/ffmpeg.config'
import { getVideoMetadata } from '../utils/ffmpeg.utils'
import { logger } from '../utils/logger'

/**
 * Determine which quality levels are feasible for a source video.
 *
 * Reads the source video resolution via FFprobe and filters the global
 * `qualityPresets` list to exclude any preset whose target height exceeds
 * the source height (no upscaling). If the source is smaller than every
 * preset, the lowest-quality preset is returned as a safe fallback so that
 * at least one rendition is always produced.
 *
 * @param inputPath - Absolute path to the source video file
 * @returns Array of quality presets that should be transcoded for this video
 * @throws Error if FFprobe cannot read the file or metadata is malformed
 */
export async function validateQualities(inputPath: string): Promise<QualityPreset[]> {
  try {
    const metadata = await getVideoMetadata(inputPath)

    logger.info(`Source video resolution: ${metadata.width}x${metadata.height}`)

    // Filter quality presets based on source resolution
    const feasibleQualities = qualityPresets.filter(preset => {
      const [, targetHeight] = preset.resolution.split('x').map(Number)

      // Don't upscale — only include qualities at or below source resolution
      if (metadata.height < targetHeight) {
        logger.warn(
          `⏭️  Skipping ${preset.name} (source height ${metadata.height} < target ${targetHeight})`
        )
        return false
      }

      return true
    })

    // Fallback: use the lowest-quality preset if nothing matched
    if (feasibleQualities.length === 0) {
      logger.warn('⚠️  No standard qualities match source resolution — falling back to lowest quality')
      return [qualityPresets[qualityPresets.length - 1]]
    }

    logger.info(`✅ Feasible qualities: ${feasibleQualities.map(q => q.name).join(', ')}`)
    return feasibleQualities
  } catch (error) {
    logger.error('Failed to validate qualities:', error)
    throw error
  }
}

/**
 * Estimate the total processing time for a video.
 *
 * This is a rough heuristic based on observed encode times:
 * - Each quality level takes approximately 2.5× the video duration to encode
 *   on a mid-range CPU using the `medium` H.264 preset.
 * - An additional 60 seconds is added to account for thumbnail sprite
 *   generation and R2 upload overhead.
 *
 * The returned value should be used for user-facing progress estimates only
 * and should not be relied on for strict timeouts.
 *
 * @param duration - Source video duration in seconds
 * @param qualityCount - Number of quality levels that will be transcoded
 * @returns Estimated total processing time in seconds
 */
export function estimateProcessingTime(duration: number, qualityCount: number): number {
  // ~2.5s of processing per second of video per quality level
  const secondsPerQuality = duration * 2.5
  const totalSeconds = secondsPerQuality * qualityCount + 60 // +60s for thumbnails & upload

  return Math.round(totalSeconds)
}
