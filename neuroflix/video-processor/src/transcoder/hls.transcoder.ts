/**
 * HLS Transcoding Engine
 * Transcodes video files to HLS format with multiple quality levels
 */

import path from 'path'
import fs from 'fs/promises'
import { qualityPresets, hlsConfig, getProcessingPaths, QualityPreset } from '../config/ffmpeg.config'
import { executeFFmpegCommand, getVideoMetadata, escapeFFmpegPath, buildFFmpegCommand } from '../utils/ffmpeg.utils'
import { logger } from '../utils/logger'

/**
 * Result of a successful HLS transcode operation
 */
interface TranscodeResult {
  /** Video ID that was transcoded */
  videoId: string
  /** Array of quality level names that were generated (e.g., ['1080p', '720p', '480p']) */
  qualities: string[]
  /** Absolute path to the master HLS playlist */
  masterPlaylistPath: string
  /** Duration of the source video in seconds */
  duration: number
  /** Whether transcoding completed successfully */
  success: boolean
}

/**
 * Transcode video to HLS with multiple quality levels
 *
 * This function orchestrates the full HLS transcoding pipeline:
 * 1. Reads source video metadata
 * 2. Creates the output directory
 * 3. Transcodes each applicable quality preset
 * 4. Generates a master playlist that references all quality streams
 *
 * Quality levels are skipped when the source resolution is lower than the
 * target resolution (no upscaling).
 *
 * @param videoId - Unique identifier for the video
 * @param inputPath - Absolute path to the source video file
 * @returns Transcode result containing quality list, paths and duration
 * @throws Error if transcoding fails at any stage
 */
export async function transcodeToHLS(
  videoId: string,
  inputPath: string
): Promise<TranscodeResult> {
  const startTime = Date.now()
  logger.info(`🎬 Starting HLS transcoding for video: ${videoId}`)

  try {
    // Get video metadata
    const metadata = await getVideoMetadata(inputPath)
    logger.info(`📹 Video metadata:`, metadata)

    // Create output directory
    const paths = getProcessingPaths(videoId)
    await fs.mkdir(paths.outputDir, { recursive: true })

    // Transcode each quality level
    const qualities: string[] = []
    for (const preset of qualityPresets) {
      // Skip if source resolution is lower than target (avoid upscaling)
      const targetHeight = parseInt(preset.resolution.split('x')[1])
      if (metadata.height < targetHeight) {
        logger.warn(`⏭️  Skipping ${preset.name} (source height ${metadata.height} < target ${targetHeight})`)
        continue
      }

      try {
        await transcodeQuality(videoId, inputPath, preset, paths.outputDir)
        qualities.push(preset.name)
      } catch (qualityError) {
        // Log per-quality errors but continue with remaining qualities
        logger.error(`❌ Failed to transcode quality ${preset.name} for video ${videoId}:`, qualityError)
        // Rethrow if no qualities have succeeded yet - likely a fundamental issue
        if (qualities.length === 0 && preset === qualityPresets[qualityPresets.length - 1]) {
          throw qualityError
        }
      }
    }

    if (qualities.length === 0) {
      throw new Error(`No quality levels could be transcoded for video: ${videoId}`)
    }

    // Generate master playlist referencing all transcoded quality streams
    await generateMasterPlaylist(videoId, qualities, paths.outputDir)

    const duration = Math.round((Date.now() - startTime) / 1000)
    logger.info(`✅ HLS transcoding complete in ${duration}s for video: ${videoId} (qualities: ${qualities.join(', ')})`)

    return {
      videoId,
      qualities,
      masterPlaylistPath: paths.masterPlaylist,
      duration: metadata.duration,
      success: true
    }
  } catch (error) {
    logger.error(`❌ HLS transcoding failed for video: ${videoId}`, error)
    throw error
  }
}

/**
 * Transcode video to a single quality level and produce HLS segments + playlist
 *
 * Uses H.264 (libx264) video codec and AAC audio codec. Generates .ts segment
 * files and a per-quality .m3u8 playlist in the output directory.
 *
 * @param videoId - Unique identifier for the video (used for logging)
 * @param inputPath - Absolute path to the source video file
 * @param preset - Quality preset configuration (resolution, bitrates, etc.)
 * @param outputDir - Directory where HLS segments and playlist will be written
 * @returns Resolves when transcoding for this quality level is complete
 * @throws Error if FFmpeg exits with a non-zero code
 */
async function transcodeQuality(
  videoId: string,
  inputPath: string,
  preset: QualityPreset,
  outputDir: string
): Promise<void> {
  logger.logTranscodeStart(videoId, preset.name)
  const startTime = Date.now()

  // Output paths for this quality level
  const playlistPath = path.join(outputDir, `${preset.name}.m3u8`)
  const segmentPath = path.join(outputDir, `${preset.name}_%03d.ts`)

  const args = [
    '-i', escapeFFmpegPath(inputPath),
    '-c:v', 'libx264',                           // H.264 video codec
    '-preset', 'medium',                         // Encoding speed/quality balance
    '-crf', '23',                                // Constant Rate Factor (quality, lower = better)
    '-c:a', 'aac',                               // AAC audio codec
    '-b:a', preset.audioBitrate,                 // Target audio bitrate
    '-ar', '48000',                              // Audio sample rate (Hz)
    '-vf', `scale=${preset.resolution}`,         // Scale video to target resolution
    '-b:v', preset.videoBitrate,                 // Target video bitrate
    '-maxrate', preset.maxrate,                  // Maximum allowed bitrate
    '-bufsize', preset.bufsize,                  // Encoder buffer size
    '-g', '48',                                  // GOP size (keyframe every 48 frames)
    '-sc_threshold', '0',                        // Disable scene-change detection for consistent segments
    '-f', 'hls',                                 // Output format: HLS
    '-hls_time', hlsConfig.segmentDuration.toString(),    // Segment duration in seconds
    '-hls_playlist_type', hlsConfig.playlistType,         // VOD playlist type
    '-hls_segment_filename', escapeFFmpegPath(segmentPath), // Segment filename pattern
    escapeFFmpegPath(playlistPath)               // Output playlist path
  ]

  const command = buildFFmpegCommand(args)
  await executeFFmpegCommand(command)

  const duration = Math.round((Date.now() - startTime) / 1000)
  logger.logTranscodeComplete(videoId, preset.name, duration)
}

/**
 * Generate an HLS master playlist that references all quality-level streams
 *
 * The master playlist follows HLS specification v3 and includes
 * BANDWIDTH and RESOLUTION attributes for each variant stream, enabling
 * adaptive bitrate (ABR) playback on compatible clients.
 *
 * @param videoId - Unique identifier for the video (used for logging)
 * @param qualities - Array of quality names that were successfully transcoded
 * @param outputDir - Directory where per-quality playlists reside and where
 *                    the master playlist (`master.m3u8`) will be written
 * @returns Resolves when the master playlist file has been written
 * @throws Error if writing the playlist file fails
 */
async function generateMasterPlaylist(
  videoId: string,
  qualities: string[],
  outputDir: string
): Promise<void> {
  logger.info(`📝 Generating master playlist for ${videoId}`)

  // HLS master playlist header
  let content = '#EXTM3U\n#EXT-X-VERSION:3\n\n'

  for (const qualityName of qualities) {
    const preset = qualityPresets.find(p => p.name === qualityName)
    if (!preset) {
      logger.warn(`⚠️  Preset not found for quality: ${qualityName} — skipping in master playlist`)
      continue
    }

    // Convert bitrate string (e.g. "5000k") to bits-per-second integer
    const bandwidth = parseInt(preset.videoBitrate) * 1000

    // Split "WIDTHxHEIGHT" into individual components
    const [width, height] = preset.resolution.split('x')

    content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${width}x${height}\n`
    content += `${qualityName}.m3u8\n\n`
  }

  // Write master playlist to disk
  const masterPath = path.join(outputDir, 'master.m3u8')
  await fs.writeFile(masterPath, content, 'utf8')

  logger.info(`✅ Master playlist generated: ${masterPath}`)
}
