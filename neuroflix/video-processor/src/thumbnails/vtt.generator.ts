/**
 * WebVTT Thumbnail File Generator
 *
 * Generates a WebVTT file that maps video time ranges to regions within
 * the thumbnail sprite sheet. Media players (e.g. Video.js, HLS.js) use
 * this file to display preview thumbnails when the user hovers over the
 * progress bar / seek bar.
 *
 * VTT format example:
 * ```
 * WEBVTT
 *
 * 1
 * 00:00:00.000 --> 00:00:02.000
 * sprite.jpg#xywh=0,0,160,90
 *
 * 2
 * 00:00:02.000 --> 00:00:04.000
 * sprite.jpg#xywh=160,0,160,90
 * ```
 */

import fs from 'fs/promises'
import path from 'path'
import { thumbnailConfig, getProcessingPaths } from '../config/ffmpeg.config'
import { getVideoMetadata } from '../utils/ffmpeg.utils'
import { logger } from '../utils/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Represents a single WebVTT cue that points to a region within the sprite.
 */
interface VTTCue {
  /** Cue start time in seconds */
  startTime: number
  /** Cue end time in seconds */
  endTime: number
  /** Sprite image filename (relative path, e.g. "sprite.jpg") */
  spriteUrl: string
  /** Media fragment: "x,y,w,h" pixel coordinates within the sprite image */
  xywh: string
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a WebVTT thumbnail file that maps video time ranges to sprite
 * coordinates, enabling seek-bar preview thumbnails in media players.
 *
 * @param videoId        - Unique identifier for the video
 * @param inputPath      - Absolute path to the source video file (used only
 *                         to read duration via FFprobe)
 * @param spriteFilename - Relative filename of the sprite image referenced
 *                         inside each VTT cue (default: `"sprite.jpg"`)
 * @returns Absolute path to the written `.vtt` file
 * @throws If FFprobe metadata extraction or file write fails
 *
 * @example
 * const vttPath = await generateVTTFile('abc123', '/tmp/abc123_original.mp4')
 * // => '/output/abc123/thumbnails.vtt'
 */
export async function generateVTTFile(
  videoId: string,
  inputPath: string,
  spriteFilename: string = 'sprite.jpg'
): Promise<string> {
  logger.info(`📝 Generating VTT file for video: ${videoId}`)

  try {
    // Retrieve video duration from FFprobe
    const metadata = await getVideoMetadata(inputPath)
    logger.info(`📹 Video duration for VTT generation: ${metadata.duration}s`)

    // Resolve output path for this video's VTT file
    const paths = getProcessingPaths(videoId)
    const vttPath = paths.vtt

    // Build cue list based on video duration & thumbnail config
    const cues = generateVTTCues(metadata.duration, spriteFilename)
    logger.info(`🖼️  Generated ${cues.length} VTT cues`)

    // Serialise cues to WebVTT format
    const vttContent = buildVTTContent(cues)

    // Validate the generated content before writing
    validateVTTContent(vttContent)

    // Ensure the output directory exists
    await fs.mkdir(path.dirname(vttPath), { recursive: true })

    // Write the VTT file
    await fs.writeFile(vttPath, vttContent, 'utf8')

    logger.info(`✅ VTT file generated: ${vttPath}`)
    return vttPath
  } catch (error) {
    logger.error('❌ VTT file generation failed:', error)
    throw error
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Generate an array of VTT cues that map time intervals to sprite regions.
 *
 * Each cue covers `1 / thumbnailConfig.fps` seconds of video and references
 * the corresponding cell in the sprite grid (row-major order).
 *
 * @param videoDuration  - Total video duration in seconds
 * @param spriteFilename - Sprite filename referenced in each cue URI
 * @returns Ordered array of {@link VTTCue} objects
 */
function generateVTTCues(videoDuration: number, spriteFilename: string): VTTCue[] {
  const cues: VTTCue[] = []

  // Time gap between consecutive thumbnails (e.g. 1 / 0.5 = 2 seconds)
  const intervalSeconds = 1 / thumbnailConfig.fps

  // Maximum thumbnails the sprite grid can hold (e.g. 10 × 10 = 100)
  const maxThumbnails = thumbnailConfig.gridColumns * thumbnailConfig.gridRows

  // How many thumbnails fit within the actual video duration
 const thumbnailCount = Math.min(
  Math.ceil(videoDuration * thumbnailConfig.fps),
  maxThumbnails
  )

  for (let i = 0; i < thumbnailCount; i++) {
    const startTime = i * intervalSeconds
    // Clamp the last cue's end time to the actual video end
    const endTime = Math.min((i + 1) * intervalSeconds, videoDuration)

    // Map linear index → 2-D grid position (row-major)
    const row = Math.floor(i / thumbnailConfig.gridColumns)
    const col = i % thumbnailConfig.gridColumns

    // Pixel offset of this cell within the sprite image
    const x = col * thumbnailConfig.width
    const y = row * thumbnailConfig.height

    cues.push({
      startTime,
      endTime,
      spriteUrl: spriteFilename,
      xywh: `${x},${y},${thumbnailConfig.width},${thumbnailConfig.height}`
    })
  }

  return cues
}

/**
 * Serialise an array of {@link VTTCue} objects into a valid WebVTT string.
 *
 * Output format per cue:
 * ```
 * <index>
 * HH:MM:SS.mmm --> HH:MM:SS.mmm
 * <spriteUrl>#xywh=<x>,<y>,<w>,<h>
 * ```
 *
 * @param cues - Ordered cue array produced by {@link generateVTTCues}
 * @returns Complete WebVTT file content as a string
 */
function buildVTTContent(cues: VTTCue[]): string {
  // Every WebVTT file must begin with the "WEBVTT" signature
  let content = 'WEBVTT\n\n'

  cues.forEach((cue, index) => {
    const startTimeStr = formatVTTTime(cue.startTime)
    const endTimeStr = formatVTTTime(cue.endTime)

    // Cue identifier (1-based)
    content += `${index + 1}\n`
    // Timing line
    content += `${startTimeStr} --> ${endTimeStr}\n`
    // Sprite URI with media fragment for the cell region
    content += `${cue.spriteUrl}#xywh=${cue.xywh}\n\n`
  })

  return content
}

/**
 * Format a duration in seconds as a WebVTT timestamp (`HH:MM:SS.mmm`).
 *
 * WebVTT requires at least two digits for hours, minutes and seconds, and
 * exactly three digits for milliseconds (RFC 8216 / W3C WebVTT spec).
 *
 * @param seconds - Non-negative time value in seconds (may include fractions)
 * @returns Formatted timestamp string, e.g. `"00:01:34.500"`
 *
 * @example
 * formatVTTTime(94.5)   // => "00:01:34.500"
 * formatVTTTime(3600)   // => "01:00:00.000"
 * formatVTTTime(0)      // => "00:00:00.000"
 */
function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':') + '.' + ms.toString().padStart(3, '0')
}

/**
 * Perform basic structural validation on the generated WebVTT content.
 *
 * Checks:
 * 1. Content starts with the mandatory `WEBVTT` header.
 * 2. At least one cue timing line (`-->`) is present.
 * 3. Each cue includes a sprite fragment (`#xywh=`).
 *
 * @param content - The WebVTT string to validate
 * @throws {Error} If any structural requirement is not met
 */
function validateVTTContent(content: string): void {
  if (!content.startsWith('WEBVTT')) {
    throw new Error('VTT validation failed: missing WEBVTT header')
  }

  if (!content.includes('-->')) {
    throw new Error('VTT validation failed: no cue timing lines found')
  }

  if (!content.includes('#xywh=')) {
    throw new Error('VTT validation failed: no sprite fragment identifiers found')
  }

  logger.debug('✅ VTT content validation passed')
}
