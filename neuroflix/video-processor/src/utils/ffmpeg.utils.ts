/**
 * FFmpeg Utility Functions
 *
 * Provides helpers for executing FFmpeg/FFprobe commands, extracting video
 * metadata, building Windows-safe command strings, and cleaning up temporary
 * processing artefacts.
 *
 * @module ffmpeg.utils
 */

import path from 'path'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { ffmpegConfig } from '../config/ffmpeg.config'
import { logger } from './logger'

// ---------------------------------------------------------------------------
// Promisified exec
// ---------------------------------------------------------------------------

/**
 * Promise-based wrapper around Node's `child_process.exec`.
 * Used for short-lived commands where full stdout/stderr capture is preferred
 * (e.g. FFprobe metadata queries).
 */
const execAsync = promisify(exec)

// ---------------------------------------------------------------------------
// Execute FFmpeg Command
// ---------------------------------------------------------------------------

/**
 * Spawn an FFmpeg process and wait for it to complete.
 *
 * FFmpeg writes all diagnostic output (including progress) to **stderr**, so
 * this function attaches a `data` listener there. When an optional
 * `onProgress` callback is supplied the listener attempts to parse the
 * `time=HH:MM:SS` token that FFmpeg emits periodically and forwards the
 * parsed position to the caller.
 *
 * The process is spawned with `shell: true` so that the fully-quoted command
 * string (produced by {@link buildFFmpegCommand}) is interpreted correctly on
 * Windows cmd/PowerShell without additional escaping.
 *
 * @param command    - Complete FFmpeg command string, including the executable
 *                     path and all arguments (see {@link buildFFmpegCommand}).
 * @param onProgress - Optional callback invoked with the current elapsed
 *                     seconds whenever a `time=` token is parsed from stderr.
 *                     Actual percentage calculation requires the caller to
 *                     divide by the known video duration.
 * @returns A Promise that resolves when FFmpeg exits with code 0, or rejects
 *          with an `Error` containing the exit code on failure.
 *
 * @example
 * const cmd = buildFFmpegCommand(['-i', escapeFFmpegPath(src), ...])
 * await executeFFmpegCommand(cmd, (elapsed) => {
 *   const pct = Math.round((elapsed / totalDuration) * 100)
 *   console.log(`Progress: ${pct}%`)
 * })
 */
export async function executeFFmpegCommand(
  command: string,
  onProgress?: (elapsedSeconds: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    logger.info(`Executing FFmpeg command: ${command.substring(0, 100)}...`)

    // Spawn inside a shell so Windows can resolve quoted paths and pipes.
    const proc = spawn(command, {
      shell: true,
      windowsHide: true // Keep console window hidden on Windows
    })

    let stderr = ''

    proc.stderr?.on('data', (data: Buffer) => {
      const chunk = data.toString()
      stderr += chunk

      // Parse elapsed time from FFmpeg's progress output, e.g.:
      //   frame=  120 fps= 60 q=28.0 size=    256kB time=00:00:04.00 ...
      if (onProgress) {
        const timeMatch = chunk.match(/time=(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/)
        if (timeMatch) {
          const hours = parseInt(timeMatch[1], 10)
          const minutes = parseInt(timeMatch[2], 10)
          const seconds = parseInt(timeMatch[3], 10)
          const elapsedSeconds = hours * 3600 + minutes * 60 + seconds

          logger.debug(`FFmpeg processing at ${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`)
          onProgress(elapsedSeconds)
        }
      }
    })

    proc.on('close', (code) => {
      if (code === 0) {
        logger.info('✅ FFmpeg command completed successfully')
        resolve()
      } else {
        logger.error(`❌ FFmpeg command failed with code: ${code}`)
        logger.error('FFmpeg stderr (last 2000 chars):', stderr.slice(-2000))
        reject(new Error(`FFmpeg exited with code ${code}`))
      }
    })

    proc.on('error', (error: Error) => {
      logger.error('❌ FFmpeg process error:', error)
      reject(error)
    })
  })
}

// ---------------------------------------------------------------------------
// Get Video Metadata
// ---------------------------------------------------------------------------

/**
 * Return essential metadata for a video file by running FFprobe in JSON mode.
 *
 * The function queries both `format` (container-level info) and `streams`
 * (track-level info) and extracts fields from the first video stream found.
 *
 * @param inputPath - Absolute path to the video file to inspect.
 * @returns A Promise resolving to an object with:
 *   - `duration`  – Total duration in seconds (float).
 *   - `width`     – Frame width in pixels.
 *   - `height`    – Frame height in pixels.
 *   - `codec`     – Video codec name (e.g. `"h264"`, `"hevc"`).
 *   - `bitrate`   – Overall container bitrate in bits/s.
 * @throws If FFprobe is unavailable, the file cannot be read, or no video
 *         stream exists in the container.
 *
 * @example
 * const meta = await getVideoMetadata('C:/videos/input.mp4')
 * console.log(meta.width, meta.height, meta.duration)
 */
export async function getVideoMetadata(inputPath: string): Promise<{
  duration: number
  width: number
  height: number
  codec: string
  bitrate: number
}> {
  try {
    // Use forward-slash path inside the quoted argument – FFprobe accepts both
    // on Windows and this avoids double-escaping issues in the shell.
    const normalizedPath = inputPath.replace(/\\/g, '/')
    const command =
      `"${ffmpegConfig.ffprobePath}" -v quiet -print_format json ` +
      `-show_format -show_streams "${normalizedPath}"`

    const { stdout } = await execAsync(command)
    const metadata = JSON.parse(stdout)

    // Locate the first video stream
    const videoStream = metadata.streams.find(
      (s: { codec_type: string }) => s.codec_type === 'video'
    )

    if (!videoStream) {
      throw new Error(`No video stream found in: ${inputPath}`)
    }

    return {
      duration: parseFloat(metadata.format.duration),
      width: videoStream.width as number,
      height: videoStream.height as number,
      codec: videoStream.codec_name as string,
      bitrate: parseInt(metadata.format.bit_rate, 10)
    }
  } catch (error) {
    logger.error('Failed to get video metadata:', error)
    throw error
  }
}

// ---------------------------------------------------------------------------
// Build FFmpeg Command String
// ---------------------------------------------------------------------------

/**
 * Assemble a complete FFmpeg command string for use with
 * {@link executeFFmpegCommand}.
 *
 * The FFmpeg executable path is wrapped in double-quotes so that Windows paths
 * containing spaces are handled correctly by the shell.
 *
 * @param args - Ordered list of FFmpeg arguments (flags and values). Each
 *               element that is a file path should already be escaped via
 *               {@link escapeFFmpegPath}.
 * @returns The full command string, e.g.:
 *   `"C:/video-processor/ffmpeg/bin/ffmpeg.exe" -i "C:/temp/abc.mp4" ...`
 *
 * @example
 * const cmd = buildFFmpegCommand([
 *   '-i', escapeFFmpegPath(inputFile),
 *   '-c:v', 'libx264',
 *   escapeFFmpegPath(outputFile)
 * ])
 */
export function buildFFmpegCommand(args: string[]): string {
  // Normalise the executable path to forward slashes for FFmpeg on Windows
  const exePath = ffmpegConfig.ffmpegPath.replace(/\\/g, '/')
  return `"${exePath}" ${args.join(' ')}`
}

// ---------------------------------------------------------------------------
// Escape Windows File Paths for FFmpeg
// ---------------------------------------------------------------------------

/**
 * Prepare a Windows file-system path for safe inclusion in an FFmpeg command.
 *
 * FFmpeg on Windows accepts both `\` and `/` as path separators, but mixing
 * them with the surrounding shell quoting can cause parse failures.
 * Converting all backslashes to forward slashes and wrapping the result in
 * double-quotes is the most reliable approach.
 *
 * @param filePath - Raw Windows path, e.g. `C:\Users\foo\temp\video.mp4`.
 * @returns Quoted, forward-slash path safe for FFmpeg, e.g.
 *          `"C:/Users/foo/temp/video.mp4"`.
 *
 * @example
 * escapeFFmpegPath('C:\\Users\\foo\\video.mp4')
 * // → '"C:/Users/foo/video.mp4"'
 */
export function escapeFFmpegPath(filePath: string): string {
  return `"${filePath.replace(/\\/g, '/')}"`
}

// ---------------------------------------------------------------------------
// Cleanup Temporary Files
// ---------------------------------------------------------------------------

/**
 * Delete the temporary original video file that was downloaded from R2 during
 * processing.
 *
 * The cleanup is performed on a best-effort basis: if the file does not exist
 * or deletion fails the error is logged as a warning rather than re-thrown, so
 * a cleanup failure never aborts the overall job.
 *
 * @param videoId - The video ID whose `<videoId>_original.mp4` temp file
 *                  should be removed.
 *
 * @example
 * await cleanupTempFiles('abc123')
 * // 🗑️  Cleaned up temp file: C:\...\temp\abc123_original.mp4
 */
export async function cleanupTempFiles(videoId: string): Promise<void> {
  // Dynamic import keeps this utility free of a top-level fs/promises import
  // which would otherwise shadow the synchronous `fs` used in ffmpeg.config.
  const fs = await import('fs/promises')
  const tempFile = path.join(ffmpegConfig.tempDir, `${videoId}_original.mp4`)

  try {
    // Check existence before unlinking to avoid ENOENT errors in the log.
    const exists = await fs.access(tempFile).then(() => true).catch(() => false)
    if (exists) {
      await fs.unlink(tempFile)
      logger.info(`🗑️  Cleaned up temp file: ${tempFile}`)
    } else {
      logger.debug(`Temp file not found (already cleaned?): ${tempFile}`)
    }
  } catch (error) {
    logger.warn('Failed to cleanup temp files:', error)
  }
}
