/**
 * FFmpeg Configuration
 * Path management, quality presets, HLS settings, and thumbnail configuration
 * for the Neuroflix video processing pipeline on Windows.
 *
 * @module ffmpeg.config
 */

import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'

// ---------------------------------------------------------------------------
// Binary & Directory Paths
// ---------------------------------------------------------------------------

/**
 * FFmpeg binary paths for Windows.
 * Assumes FFmpeg is placed in video-processor/ffmpeg/bin/
 *
 * @example
 * import { ffmpegConfig } from './ffmpeg.config'
 * console.log(ffmpegConfig.ffmpegPath) // C:\...\video-processor\ffmpeg\bin\ffmpeg.exe
 */
export const ffmpegConfig = {
  /** Absolute path to the FFmpeg binaries directory */
  binPath: path.join(process.cwd(), 'ffmpeg', 'bin'),

  /** Absolute path to the FFmpeg executable */
  ffmpegPath: path.join(process.cwd(), 'ffmpeg', 'bin', 'ffmpeg.exe'),

  /** Absolute path to the FFprobe executable (used for video metadata) */
  ffprobePath: path.join(process.cwd(), 'ffmpeg', 'bin', 'ffprobe.exe'),

  /** Temporary directory used to store downloaded originals during processing */
  tempDir: path.join(process.cwd(), 'temp'),

  /** Output directory where transcoded HLS files and thumbnails are stored */
  outputDir: path.join(process.cwd(), 'output')
} as const

// ---------------------------------------------------------------------------
// HLS Quality Presets
// ---------------------------------------------------------------------------

/**
 * HLS encoding quality levels used by the transcoder.
 * Covers the four tiers required by Neuroflix: 1080p, 720p, 480p, 360p.
 *
 * Each preset defines:
 * - `name`         – Human-readable quality label
 * - `resolution`   – Target width×height (WxH)
 * - `videoBitrate` – Target average video bitrate
 * - `audioBitrate` – Target audio bitrate
 * - `maxrate`      – Maximum instantaneous bitrate (≈7% above target)
 * - `bufsize`      – Decoder buffer size (≈1.5× maxrate)
 */
export const qualityPresets = [
  {
    name: '1080p',
    resolution: '1920x1080',
    videoBitrate: '5000k',
    audioBitrate: '192k',
    maxrate: '5350k',
    bufsize: '7500k'
  },
  {
    name: '720p',
    resolution: '1280x720',
    videoBitrate: '2500k',
    audioBitrate: '128k',
    maxrate: '2675k',
    bufsize: '3750k'
  },
  {
    name: '480p',
    resolution: '854x480',
    videoBitrate: '1000k',
    audioBitrate: '128k',
    maxrate: '1070k',
    bufsize: '1500k'
  },
  {
    name: '360p',
    resolution: '640x360',
    videoBitrate: '500k',
    audioBitrate: '96k',
    maxrate: '535k',
    bufsize: '750k'
  }
] as const

/** Inferred type of a single quality preset entry */
export type QualityPreset = (typeof qualityPresets)[number]

// ---------------------------------------------------------------------------
// HLS Segmentation Settings
// ---------------------------------------------------------------------------

/**
 * HLS segmentation configuration used when generating playlists.
 *
 * VOD best-practice: 4–6 second segments balance seek accuracy and CDN
 * efficiency. `playlistSize: 0` keeps all segments in the playlist (required
 * for VOD – players need the full segment list to support arbitrary seeking).
 */
export const hlsConfig = {
  /** Segment duration in seconds (VOD recommendation: 4–6 s) */
  segmentDuration: 4,

  /** Number of segments in the playlist window. 0 = all segments (VOD) */
  playlistSize: 0,

  /** HLS playlist type. Must be 'vod' for on-demand content */
  playlistType: 'vod' as const,

  /** Segment filename pattern passed to FFmpeg's -hls_segment_filename option */
  segmentPattern: '%v_%03d.ts',

  /** Filename of the HLS master playlist */
  masterPlaylist: 'master.m3u8',

  /** Per-quality playlist filename pattern */
  qualityPlaylistPattern: '%v.m3u8'
} as const

// ---------------------------------------------------------------------------
// Thumbnail Sprite Settings
// ---------------------------------------------------------------------------

/**
 * Thumbnail sprite generation settings.
 *
 * Strategy: extract one frame every 2 seconds (`fps: 0.5`), resize each to
 * 160×90 px, and tile them into a 10×10 grid giving up to 100 thumbnails per
 * sprite sheet. Video players (e.g. HLS.js) use the paired VTT file to map
 * playback time → sprite coordinates for scrubber previews.
 */
export const thumbnailConfig = {
  /**
   * Thumbnail extraction rate in frames per second.
   * 0.5 fps = 1 thumbnail every 2 seconds.
   */
  fps: 0.5,

  /** Width of a single thumbnail cell in pixels */
  width: 320,

  /** Height of a single thumbnail cell in pixels */
  height: 180,

  /** Number of thumbnail columns in the sprite grid */
  gridColumns: 10,

  /** Number of thumbnail rows in the sprite grid */
  gridRows: 10,

  /** Output filename for the JPEG sprite sheet */
  spriteFilename: 'sprite.jpg',

  /** Output filename for the WebVTT thumbnail index */
  vttFilename: 'thumbnails.vtt'
} as const

// ---------------------------------------------------------------------------
// Utility: Verify FFmpeg Installation
// ---------------------------------------------------------------------------

/**
 * Verify that FFmpeg and FFprobe are present and executable.
 *
 * Performs three checks:
 * 1. The `ffmpeg.exe` file exists at the expected path.
 * 2. The `ffprobe.exe` file exists at the expected path.
 * 3. `ffmpeg -version` exits successfully (validates the binary is runnable).
 *
 * @returns `true` when both binaries are found and FFmpeg executes correctly;
 *          `false` otherwise (errors are printed to stderr).
 *
 * @example
 * if (!verifyFFmpegInstallation()) {
 *   process.exit(1)
 * }
 */
export function verifyFFmpegInstallation(): boolean {
  try {
    // 1. Check ffmpeg.exe exists
    if (!fs.existsSync(ffmpegConfig.ffmpegPath)) {
      console.error(`❌ FFmpeg not found at: ${ffmpegConfig.ffmpegPath}`)
      return false
    }

    // 2. Check ffprobe.exe exists
    if (!fs.existsSync(ffmpegConfig.ffprobePath)) {
      console.error(`❌ FFprobe not found at: ${ffmpegConfig.ffprobePath}`)
      return false
    }

    // 3. Test execution – execSync throws on non-zero exit code
    const version = execSync(`"${ffmpegConfig.ffmpegPath}" -version`, {
      encoding: 'utf8'
    })

    console.log('✅ FFmpeg installed:', version.split('\n')[0])
    return true
  } catch (error) {
    console.error('❌ FFmpeg verification failed:', error)
    return false
  }
}

// ---------------------------------------------------------------------------
// Utility: Initialize Required Directories
// ---------------------------------------------------------------------------

/**
 * Create the `temp` and `output` directories if they do not already exist.
 *
 * Call this once during application startup before any processing begins.
 *
 * @example
 * initializeDirectories()
 * // ✅ Created directory: C:\...\video-processor\temp
 * // ✅ Created directory: C:\...\video-processor\output
 */
export function initializeDirectories(): void {
  const dirs: string[] = [ffmpegConfig.tempDir, ffmpegConfig.outputDir]

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      console.log(`✅ Created directory: ${dir}`)
    }
  })
}

// ---------------------------------------------------------------------------
// Utility: Get Per-Video Processing Paths
// ---------------------------------------------------------------------------

/**
 * Build all file-system paths needed to process a single video.
 *
 * The returned paths follow this convention:
 * ```
 * temp/
 *   <videoId>_original.mp4   ← downloaded source file
 * output/
 *   <videoId>/
 *     master.m3u8            ← HLS master playlist
 *     <quality>.m3u8         ← per-quality playlists
 *     <quality>_NNN.ts       ← HLS segments
 *     sprite.jpg             ← thumbnail sprite sheet
 *     thumbnails.vtt         ← WebVTT thumbnail index
 * ```
 *
 * @param videoId - Unique identifier for the video (used as directory name).
 * @returns An object containing fully-qualified paths for all artefacts.
 *
 * @example
 * const paths = getProcessingPaths('abc123')
 * // paths.inputFile    → C:\...\temp\abc123_original.mp4
 * // paths.outputDir    → C:\...\output\abc123
 * // paths.masterPlaylist → C:\...\output\abc123\master.m3u8
 */
export function getProcessingPaths(videoId: string) {
  return {
    /** Path where the original video is saved after downloading from R2 */
    inputFile: path.join(ffmpegConfig.tempDir, `${videoId}_original.mp4`),

    /** Root output directory for all artefacts belonging to this video */
    outputDir: path.join(ffmpegConfig.outputDir, videoId),

    // --- HLS outputs ---

    /** Absolute path to the HLS master playlist */
    masterPlaylist: path.join(ffmpegConfig.outputDir, videoId, 'master.m3u8'),

    // --- Thumbnail outputs ---

    /** Absolute path to the JPEG thumbnail sprite sheet */
    sprite: path.join(ffmpegConfig.outputDir, videoId, 'sprite.jpg'),

    /** Absolute path to the WebVTT thumbnail index file */
    vtt: path.join(ffmpegConfig.outputDir, videoId, 'thumbnails.vtt')
  }
}
