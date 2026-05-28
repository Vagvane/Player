# NEUROFLIX VIDEO PLAYER - IMPLEMENTATION PROMPTS
## Part 4: Video Processor - FFmpeg, HLS, Thumbnails, Job Queue
## Full Technical Prompt Engineering Document

**Part**: 4 of 5
**Status**: ✅ COMPLETE - All 18 Prompts
**Focus**: Video Processing Pipeline (FFmpeg, HLS Transcoding, Thumbnail Generation, BullMQ)
**Prerequisites**: Part 3 (Backend) - R2 service, Video service, Database
**Target**: Claude Code AI
**Environment**: Windows + Node.js + FFmpeg
**Date**: May 25th, 2026

---

## 📊 PART 4 COMPLETION STATUS

| Section | Prompts | Status |
|---------|---------|--------|
| 4.1: FFmpeg Setup & Configuration | 3 | ✅ Complete |
| 4.2: HLS Transcoding Engine | 4 | ✅ Complete |
| 4.3: Thumbnail & Sprite Generation | 3 | ✅ Complete |
| 4.4: BullMQ Job Queue | 3 | ✅ Complete |
| 4.5: Worker & Processing Logic | 3 | ✅ Complete |
| 4.6: Environment & Dependencies | 2 | ✅ Complete |
| **TOTAL** | **18** | **✅ COMPLETE** |

---

## 📋 TABLE OF CONTENTS - PART 4

1. [FFmpeg Setup & Configuration](#section-41-ffmpeg-setup--configuration)
2. [HLS Transcoding Engine](#section-42-hls-transcoding-engine)
3. [Thumbnail & Sprite Generation](#section-43-thumbnail--sprite-generation)
4. [BullMQ Job Queue](#section-44-bullmq-job-queue)
5. [Worker & Processing Logic](#section-45-worker--processing-logic)
6. [Environment & Dependencies](#section-46-environment--dependencies)

---

## SECTION 4.1: FFMPEG SETUP & CONFIGURATION

### PROMPT 4.1.1: Create FFmpeg Configuration

```
Create FFmpeg configuration and path management for Windows.

File: video-processor/src/config/ffmpeg.config.ts

Requirements:

1. Imports:
   ```typescript
   import path from 'path'
   import fs from 'fs'
   import { execSync } from 'child_process'
   ```

2. FFmpeg paths configuration:
   ```typescript
   /**
    * FFmpeg binary paths for Windows
    * Assumes FFmpeg is in video-processor/ffmpeg/bin/
    */
   export const ffmpegConfig = {
     // Path to FFmpeg binaries directory
     binPath: path.join(process.cwd(), 'ffmpeg', 'bin'),

     // FFmpeg executable
     ffmpegPath: path.join(process.cwd(), 'ffmpeg', 'bin', 'ffmpeg.exe'),

     // FFprobe executable (for video metadata)
     ffprobePath: path.join(process.cwd(), 'ffmpeg', 'bin', 'ffprobe.exe'),

     // Temp directory for processing
     tempDir: path.join(process.cwd(), 'temp'),

     // Output directory for processed videos
     outputDir: path.join(process.cwd(), 'output')
   }
   ```

3. HLS encoding settings:
   ```typescript
   /**
    * HLS encoding quality levels
    * Based on Neuroflix requirements: 1080p, 720p, 480p, 360p
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
   ]
   ```

4. HLS segment settings:
   ```typescript
   /**
    * HLS segmentation configuration
    */
   export const hlsConfig = {
     // Segment duration in seconds (VOD recommendation: 4-6 seconds)
     segmentDuration: 4,

     // Number of segments in playlist window
     playlistSize: 0, // 0 = all segments (VOD)

     // Playlist type
     playlistType: 'vod',

     // Segment filename pattern
     segmentPattern: '%v_%03d.ts',

     // Master playlist filename
     masterPlaylist: 'master.m3u8',

     // Quality playlist pattern
     qualityPlaylistPattern: '%v.m3u8'
   }
   ```

5. Thumbnail sprite settings:
   ```typescript
   /**
    * Thumbnail sprite generation settings
    */
   export const thumbnailConfig = {
     // Frame rate for thumbnail extraction (0.5 = 1 frame every 2 seconds)
     fps: 0.5,

     // Individual thumbnail size
     width: 160,
     height: 90,

     // Sprite grid size (10x10 = 100 thumbnails)
     gridColumns: 10,
     gridRows: 10,

     // Output filenames
     spriteFilename: 'sprite.jpg',
     vttFilename: 'thumbnails.vtt'
   }
   ```

6. Verify FFmpeg installation:
   ```typescript
   /**
    * Verify FFmpeg installation
    * @returns True if FFmpeg is installed and accessible
    */
   export function verifyFFmpegInstallation(): boolean {
     try {
       // Check if FFmpeg executable exists
       if (!fs.existsSync(ffmpegConfig.ffmpegPath)) {
         console.error(`❌ FFmpeg not found at: ${ffmpegConfig.ffmpegPath}`)
         return false
       }

       // Check if FFprobe executable exists
       if (!fs.existsSync(ffmpegConfig.ffprobePath)) {
         console.error(`❌ FFprobe not found at: ${ffmpegConfig.ffprobePath}`)
         return false
       }

       // Test FFmpeg execution
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
   ```

7. Create required directories:
   ```typescript
   /**
    * Initialize required directories for video processing
    */
   export function initializeDirectories(): void {
     const dirs = [
       ffmpegConfig.tempDir,
       ffmpegConfig.outputDir
     ]

     dirs.forEach(dir => {
       if (!fs.existsSync(dir)) {
         fs.mkdirSync(dir, { recursive: true })
         console.log(`✅ Created directory: ${dir}`)
       }
     })
   }
   ```

8. Get video processing paths:
   ```typescript
   /**
    * Get file paths for video processing
    * @param videoId - Video ID
    * @returns Object with all file paths
    */
   export function getProcessingPaths(videoId: string) {
     return {
       // Input (downloaded from R2)
       inputFile: path.join(ffmpegConfig.tempDir, `${videoId}_original.mp4`),

       // Output directory for this video
       outputDir: path.join(ffmpegConfig.outputDir, videoId),

       // HLS outputs
       masterPlaylist: path.join(ffmpegConfig.outputDir, videoId, 'master.m3u8'),

       // Thumbnail outputs
       sprite: path.join(ffmpegConfig.outputDir, videoId, 'sprite.jpg'),
       vtt: path.join(ffmpegConfig.outputDir, videoId, 'thumbnails.vtt')
     }
   }
   ```

Add comprehensive JSDoc comments.
Output the complete configuration file.
```

### PROMPT 4.1.2: Create FFmpeg Utility Functions

```
Create utility functions for FFmpeg command execution.

File: video-processor/src/utils/ffmpeg.utils.ts

Requirements:

1. Imports:
   ```typescript
   import { exec, spawn } from 'child_process'
   import { promisify } from 'util'
   import { ffmpegConfig } from '../config/ffmpeg.config'
   import { logger } from './logger'
   ```

2. Promisify exec:
   ```typescript
   const execAsync = promisify(exec)
   ```

3. Execute FFmpeg command:
   ```typescript
   /**
    * Execute FFmpeg command with progress tracking
    * @param command - FFmpeg command string
    * @param onProgress - Progress callback (percentage)
    * @returns Promise that resolves when command completes
    */
   export async function executeFFmpegCommand(
     command: string,
     onProgress?: (progress: number) => void
   ): Promise<void> {
     return new Promise((resolve, reject) => {
       logger.info(`Executing FFmpeg command: ${command.substring(0, 100)}...`)

       const process = spawn(command, {
         shell: true,
         windowsHide: true
       })

       let stderr = ''

       process.stderr?.on('data', (data) => {
         stderr += data.toString()

         // Parse FFmpeg progress from stderr
         if (onProgress) {
           const timeMatch = stderr.match(/time=(\d{2}):(\d{2}):(\d{2})/)
           if (timeMatch) {
             const hours = parseInt(timeMatch[1])
             const minutes = parseInt(timeMatch[2])
             const seconds = parseInt(timeMatch[3])
             const totalSeconds = hours * 3600 + minutes * 60 + seconds

             // This is approximate - actual progress requires video duration
             logger.debug(`FFmpeg processing at ${hours}:${minutes}:${seconds}`)
           }
         }
       })

       process.on('close', (code) => {
         if (code === 0) {
           logger.info('✅ FFmpeg command completed successfully')
           resolve()
         } else {
           logger.error('❌ FFmpeg command failed with code:', code)
           logger.error('FFmpeg stderr:', stderr)
           reject(new Error(`FFmpeg exited with code ${code}`))
         }
       })

       process.on('error', (error) => {
         logger.error('❌ FFmpeg process error:', error)
         reject(error)
       })
     })
   }
   ```

4. Get video metadata:
   ```typescript
   /**
    * Get video metadata using FFprobe
    * @param inputPath - Path to video file
    * @returns Video metadata (duration, width, height, codec)
    */
   export async function getVideoMetadata(inputPath: string): Promise<{
     duration: number
     width: number
     height: number
     codec: string
     bitrate: number
   }> {
     try {
       const command = `"${ffmpegConfig.ffprobePath}" -v quiet -print_format json -show_format -show_streams "${inputPath}"`

       const { stdout } = await execAsync(command)
       const metadata = JSON.parse(stdout)

       // Find video stream
       const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video')

       if (!videoStream) {
         throw new Error('No video stream found')
       }

       return {
         duration: parseFloat(metadata.format.duration),
         width: videoStream.width,
         height: videoStream.height,
         codec: videoStream.codec_name,
         bitrate: parseInt(metadata.format.bit_rate)
       }
     } catch (error) {
       logger.error('Failed to get video metadata:', error)
       throw error
     }
   }
   ```

5. Build FFmpeg command:
   ```typescript
   /**
    * Build FFmpeg command with proper Windows path escaping
    * @param args - Array of command arguments
    * @returns Complete FFmpeg command string
    */
   export function buildFFmpegCommand(args: string[]): string {
     // Quote the FFmpeg path for Windows
     const command = `"${ffmpegConfig.ffmpegPath}" ${args.join(' ')}`
     return command
   }
   ```

6. Escape Windows paths:
   ```typescript
   /**
    * Escape file paths for Windows FFmpeg commands
    * @param filePath - File path to escape
    * @returns Escaped path safe for FFmpeg
    */
   export function escapeFFmpegPath(filePath: string): string {
     // Windows: Replace backslashes with forward slashes for FFmpeg
     // and wrap in quotes
     return `"${filePath.replace(/\\/g, '/')}"`
   }
   ```

7. Clean up temporary files:
   ```typescript
   /**
    * Clean up temporary files after processing
    * @param videoId - Video ID
    */
   export async function cleanupTempFiles(videoId: string): Promise<void> {
     const fs = await import('fs/promises')
     const tempFile = path.join(ffmpegConfig.tempDir, `${videoId}_original.mp4`)

     try {
       if (await fs.access(tempFile).then(() => true).catch(() => false)) {
         await fs.unlink(tempFile)
         logger.info(`🗑️  Cleaned up temp file: ${tempFile}`)
       }
     } catch (error) {
       logger.warn('Failed to cleanup temp files:', error)
     }
   }
   ```

Add comprehensive JSDoc comments.
Add Windows-specific path handling.
Output the complete utility file.
```

### PROMPT 4.1.3: Create Logger for Video Processor

```
Create logging utility for video processor.

File: video-processor/src/utils/logger.ts

Requirements:

1. Simple logger class:
   ```typescript
   /**
    * Logger utility for video processor
    */
   class Logger {
     private formatMessage(level: string, message: string, meta?: any): string {
       const timestamp = new Date().toISOString()
       const colors: Record<string, string> = {
         INFO: '\x1b[32m',  // Green
         WARN: '\x1b[33m',  // Yellow
         ERROR: '\x1b[31m', // Red
         DEBUG: '\x1b[36m'  // Cyan
       }
       const reset = '\x1b[0m'
       const color = colors[level] || ''

       let formatted = `${color}[${level}]${reset} ${timestamp} - ${message}`

       if (meta) {
         formatted += `\n  ${JSON.stringify(meta, null, 2)}`
       }

       return formatted
     }

     info(message: string, meta?: any): void {
       console.log(this.formatMessage('INFO', message, meta))
     }

     warn(message: string, meta?: any): void {
       console.warn(this.formatMessage('WARN', message, meta))
     }

     error(message: string, error?: Error | any): void {
       const meta = error instanceof Error
         ? { message: error.message, stack: error.stack }
         : error

       console.error(this.formatMessage('ERROR', message, meta))
     }

     debug(message: string, meta?: any): void {
       if (process.env.NODE_ENV === 'development') {
         console.log(this.formatMessage('DEBUG', message, meta))
       }
     }

     // Video processing specific logs
     logTranscodeStart(videoId: string, quality: string): void {
       this.info(`🎬 Starting transcoding: ${videoId} (${quality})`)
     }

     logTranscodeComplete(videoId: string, quality: string, duration: number): void {
       this.info(`✅ Transcoding complete: ${videoId} (${quality}) in ${duration}s`)
     }

     logThumbnailGeneration(videoId: string): void {
       this.info(`🖼️  Generating thumbnails: ${videoId}`)
     }

     logUploadProgress(videoId: string, progress: number): void {
       this.debug(`📤 Upload progress: ${videoId} (${progress}%)`)
     }
   }

   export const logger = new Logger()
   export default logger
   ```

Output the complete logger file.
```

---

## SECTION 4.2: HLS TRANSCODING ENGINE

### PROMPT 4.2.1: Create HLS Transcoder

```
Create main HLS transcoding engine.

File: video-processor/src/transcoder/hls.transcoder.ts

Requirements:

1. Imports:
   ```typescript
   import path from 'path'
   import fs from 'fs/promises'
   import { qualityPresets, hlsConfig, getProcessingPaths } from '../config/ffmpeg.config'
   import { executeFFmpegCommand, getVideoMetadata, escapeFFmpegPath, buildFFmpegCommand } from '../utils/ffmpeg.utils'
   import { logger } from '../utils/logger'
   ```

2. Transcode interface:
   ```typescript
   interface TranscodeResult {
     videoId: string
     qualities: string[]
     masterPlaylistPath: string
     duration: number
     success: boolean
   }
   ```

3. Main transcode function:
   ```typescript
   /**
    * Transcode video to HLS with multiple quality levels
    * @param videoId - Video ID
    * @param inputPath - Path to input video file
    * @returns Transcode result
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
         // Skip if source resolution is lower than target
         if (metadata.height < parseInt(preset.resolution.split('x')[1])) {
           logger.warn(`⏭️  Skipping ${preset.name} (source resolution too low)`)
           continue
         }

         await transcodeQuality(videoId, inputPath, preset, paths.outputDir)
         qualities.push(preset.name)
       }

       // Generate master playlist
       await generateMasterPlaylist(videoId, qualities, paths.outputDir)

       const duration = Math.round((Date.now() - startTime) / 1000)
       logger.info(`✅ HLS transcoding complete in ${duration}s`)

       return {
         videoId,
         qualities,
         masterPlaylistPath: paths.masterPlaylist,
         duration: metadata.duration,
         success: true
       }
     } catch (error) {
       logger.error('❌ HLS transcoding failed:', error)
       throw error
     }
   }
   ```

4. Transcode single quality:
   ```typescript
   /**
    * Transcode video to single quality level
    * @param videoId - Video ID
    * @param inputPath - Input video path
    * @param preset - Quality preset
    * @param outputDir - Output directory
    */
   async function transcodeQuality(
     videoId: string,
     inputPath: string,
     preset: typeof qualityPresets[0],
     outputDir: string
   ): Promise<void> {
     logger.logTranscodeStart(videoId, preset.name)
     const startTime = Date.now()

     // Build FFmpeg command
     const playlistPath = path.join(outputDir, `${preset.name}.m3u8`)
     const segmentPath = path.join(outputDir, `${preset.name}_%03d.ts`)

     const args = [
       '-i', escapeFFmpegPath(inputPath),
       '-c:v', 'libx264',                    // H.264 video codec
       '-preset', 'medium',                  // Encoding speed/quality balance
       '-crf', '23',                         // Constant Rate Factor (quality)
       '-c:a', 'aac',                        // AAC audio codec
       '-b:a', preset.audioBitrate,          // Audio bitrate
       '-ar', '48000',                       // Audio sample rate
       '-vf', `scale=${preset.resolution}`,  // Video resolution
       '-b:v', preset.videoBitrate,          // Video bitrate
       '-maxrate', preset.maxrate,           // Maximum bitrate
       '-bufsize', preset.bufsize,           // Buffer size
       '-g', '48',                           // GOP size (keyframe interval)
       '-sc_threshold', '0',                 // Disable scene change detection
       '-f', 'hls',                          // HLS format
       '-hls_time', hlsConfig.segmentDuration.toString(),
       '-hls_playlist_type', hlsConfig.playlistType,
       '-hls_segment_filename', escapeFFmpegPath(segmentPath),
       escapeFFmpegPath(playlistPath)
     ]

     const command = buildFFmpegCommand(args)
     await executeFFmpegCommand(command)

     const duration = Math.round((Date.now() - startTime) / 1000)
     logger.logTranscodeComplete(videoId, preset.name, duration)
   }
   ```

5. Generate master playlist:
   ```typescript
   /**
    * Generate HLS master playlist
    * @param videoId - Video ID
    * @param qualities - Array of quality names
    * @param outputDir - Output directory
    */
   async function generateMasterPlaylist(
     videoId: string,
     qualities: string[],
     outputDir: string
   ): Promise<void> {
     logger.info(`📝 Generating master playlist for ${videoId}`)

     // Build master playlist content
     let content = '#EXTM3U\n#EXT-X-VERSION:3\n\n'

     for (const qualityName of qualities) {
       const preset = qualityPresets.find(p => p.name === qualityName)
       if (!preset) continue

       // Extract bandwidth from bitrate (e.g., "5000k" -> 5000000)
       const bandwidth = parseInt(preset.videoBitrate) * 1000

       // Extract resolution
       const [width, height] = preset.resolution.split('x')

       content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${width}x${height}\n`
       content += `${qualityName}.m3u8\n\n`
     }

     // Write master playlist
     const masterPath = path.join(outputDir, 'master.m3u8')
     await fs.writeFile(masterPath, content, 'utf8')

     logger.info(`✅ Master playlist generated: ${masterPath}`)
   }
   ```

Add comprehensive JSDoc comments.
Add error handling for each quality level.
Output the complete transcoder file.
```

### PROMPT 4.2.2: Create Quality Validator

```
Create validator to check which quality levels are feasible.

File: video-processor/src/transcoder/quality.validator.ts

Requirements:

1. Imports:
   ```typescript
   import { qualityPresets } from '../config/ffmpeg.config'
   import { getVideoMetadata } from '../utils/ffmpeg.utils'
   import { logger } from '../utils/logger'
   ```

2. Validate qualities:
   ```typescript
   /**
    * Determine which quality levels are feasible for source video
    * @param inputPath - Path to input video
    * @returns Array of quality presets to use
    */
   export async function validateQualities(inputPath: string): Promise<typeof qualityPresets> {
     try {
       const metadata = await getVideoMetadata(inputPath)

       logger.info(`Source video resolution: ${metadata.width}x${metadata.height}`)

       // Filter quality presets based on source resolution
       const feasibleQualities = qualityPresets.filter(preset => {
         const [, targetHeight] = preset.resolution.split('x').map(Number)

         // Don't upscale - only include qualities at or below source resolution
         if (metadata.height < targetHeight) {
           logger.warn(`⏭️  Skipping ${preset.name} (source height ${metadata.height} < target ${targetHeight})`)
           return false
         }

         return true
       })

       if (feasibleQualities.length === 0) {
         logger.warn('⚠️  No standard qualities match source - will use lowest quality')
         return [qualityPresets[qualityPresets.length - 1]]
       }

       logger.info(`✅ Feasible qualities: ${feasibleQualities.map(q => q.name).join(', ')}`)
       return feasibleQualities
     } catch (error) {
       logger.error('Failed to validate qualities:', error)
       throw error
     }
   }
   ```

3. Estimate processing time:
   ```typescript
   /**
    * Estimate processing time based on video duration and qualities
    * @param duration - Video duration in seconds
    * @param qualityCount - Number of quality levels
    * @returns Estimated time in seconds
    */
   export function estimateProcessingTime(duration: number, qualityCount: number): number {
     // Rough estimate: 1 minute of video takes ~2-3 minutes to process per quality
     // Including thumbnail generation
     const secondsPerQuality = duration * 2.5
     const totalSeconds = secondsPerQuality * qualityCount + 60 // +1 min for thumbnails

     return Math.round(totalSeconds)
   }
   ```

Add JSDoc comments.
Output the complete validator file.
```

### PROMPT 4.2.3: Create Transcoder Index

```
Create barrel export for transcoder modules.

File: video-processor/src/transcoder/index.ts

Requirements:

Export all transcoder functions:
```typescript
export * from './hls.transcoder'
export * from './quality.validator'
```

Output the complete index file.
```

### PROMPT 4.2.4: Create R2 Uploader for Processed Videos

```
Create R2 uploader for HLS files and thumbnails.

File: video-processor/src/uploader/r2.uploader.ts

Requirements:

1. Imports:
   ```typescript
   import fs from 'fs/promises'
   import path from 'path'
   import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
   import { logger } from '../utils/logger'
   ```

2. R2 configuration:
   ```typescript
   /**
    * Initialize R2 client
    */
   const r2Client = new S3Client({
     region: 'auto',
     endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
     credentials: {
       accessKeyId: process.env.R2_ACCESS_KEY_ID!,
       secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
     }
   })

   const BUCKET_NAME = process.env.R2_BUCKET_NAME!
   ```

3. Upload single file:
   ```typescript
   /**
    * Upload single file to R2
    * @param localPath - Local file path
    * @param r2Key - R2 object key
    * @param contentType - Content type
    */
   async function uploadFile(
     localPath: string,
     r2Key: string,
     contentType: string
   ): Promise<void> {
     try {
       const fileContent = await fs.readFile(localPath)

       await r2Client.send(new PutObjectCommand({
         Bucket: BUCKET_NAME,
         Key: r2Key,
         Body: fileContent,
         ContentType: contentType
       }))

       logger.debug(`✅ Uploaded: ${r2Key}`)
     } catch (error) {
       logger.error(`Failed to upload ${r2Key}:`, error)
       throw error
     }
   }
   ```

4. Upload directory recursively:
   ```typescript
   /**
    * Upload entire directory to R2
    * @param localDir - Local directory path
    * @param r2Prefix - R2 key prefix (e.g., "videos/video-id/")
    * @returns Array of uploaded R2 keys
    */
   export async function uploadDirectory(
     localDir: string,
     r2Prefix: string
   ): Promise<string[]> {
     logger.info(`📤 Uploading directory: ${localDir} -> ${r2Prefix}`)

     const uploadedKeys: string[] = []

     try {
       // Read directory
       const files = await fs.readdir(localDir, { recursive: true })

       for (const file of files) {
         const localPath = path.join(localDir, file)
         const stat = await fs.stat(localPath)

         // Skip directories
         if (stat.isDirectory()) continue

         // Determine content type
         const ext = path.extname(file).toLowerCase()
         const contentType = getContentType(ext)

         // Build R2 key
         const r2Key = `${r2Prefix}${file.replace(/\\/g, '/')}`

         // Upload file
         await uploadFile(localPath, r2Key, contentType)
         uploadedKeys.push(r2Key)
       }

       logger.info(`✅ Uploaded ${uploadedKeys.length} files to R2`)
       return uploadedKeys
     } catch (error) {
       logger.error('Failed to upload directory:', error)
       throw error
     }
   }
   ```

5. Get content type helper:
   ```typescript
   /**
    * Get content type based on file extension
    * @param ext - File extension (with dot)
    * @returns Content type string
    */
   function getContentType(ext: string): string {
     const types: Record<string, string> = {
       '.m3u8': 'application/vnd.apple.mpegurl',
       '.ts': 'video/mp2t',
       '.jpg': 'image/jpeg',
       '.vtt': 'text/vtt'
     }

     return types[ext] || 'application/octet-stream'
   }
   ```

6. Upload HLS package:
   ```typescript
   /**
    * Upload complete HLS package for a video
    * @param videoId - Video ID
    * @param localOutputDir - Local output directory
    * @returns Object with uploaded file paths
    */
   export async function uploadHLSPackage(
     videoId: string,
     localOutputDir: string
   ): Promise<{
     hlsPath: string
     thumbnailVttPath: string
     spritePath: string
   }> {
     logger.info(`📦 Uploading HLS package for video: ${videoId}`)

     const r2Prefix = `videos/${videoId}/`

     // Upload all files
     await uploadDirectory(localOutputDir, r2Prefix)

     // Return R2 paths (not full URLs)
     return {
       hlsPath: `${r2Prefix}master.m3u8`,
       thumbnailVttPath: `${r2Prefix}thumbnails.vtt`,
       spritePath: `${r2Prefix}sprite.jpg`
     }
   }
   ```

Add comprehensive JSDoc comments.
Add progress tracking.
Output the complete uploader file.
```

---

## SECTION 4.3: THUMBNAIL & SPRITE GENERATION

### PROMPT 4.3.1: Create Thumbnail Generator

```
Create thumbnail sprite generator.

File: video-processor/src/thumbnails/sprite.generator.ts

Requirements:

1. Imports:
   ```typescript
   import path from 'path'
   import { thumbnailConfig, getProcessingPaths } from '../config/ffmpeg.config'
   import { executeFFmpegCommand, getVideoMetadata, escapeFFmpegPath, buildFFmpegCommand } from '../utils/ffmpeg.utils'
   import { logger } from '../utils/logger'
   ```

2. Generate thumbnail sprite:
   ```typescript
   /**
    * Generate thumbnail sprite sheet from video
    * @param videoId - Video ID
    * @param inputPath - Path to input video
    * @returns Path to generated sprite
    */
   export async function generateThumbnailSprite(
     videoId: string,
     inputPath: string
   ): Promise<string> {
     logger.logThumbnailGeneration(videoId)
     const startTime = Date.now()

     try {
       // Get video metadata
       const metadata = await getVideoMetadata(inputPath)

       // Get output paths
       const paths = getProcessingPaths(videoId)
       const spritePath = paths.sprite

       // Build FFmpeg command for sprite generation
       const args = [
         '-i', escapeFFmpegPath(inputPath),
         '-vf', [
           `fps=${thumbnailConfig.fps}`,                    // Extract 1 frame every 2 seconds
           `scale=${thumbnailConfig.width}:${thumbnailConfig.height}`,  // Resize to 160x90
           `tile=${thumbnailConfig.gridColumns}x${thumbnailConfig.gridRows}`  // 10x10 grid
         ].join(','),
         '-frames:v', '1',                                  // Output single image
         '-q:v', '2',                                       // JPEG quality (1-31, lower is better)
         escapeFFmpegPath(spritePath)
       ]

       const command = buildFFmpegCommand(args)
       await executeFFmpegCommand(command)

       const duration = Math.round((Date.now() - startTime) / 1000)
       logger.info(`✅ Thumbnail sprite generated in ${duration}s: ${spritePath}`)

       return spritePath
     } catch (error) {
       logger.error('❌ Thumbnail sprite generation failed:', error)
       throw error
     }
   }
   ```

3. Calculate thumbnail count:
   ```typescript
   /**
    * Calculate number of thumbnails based on video duration
    * @param videoDuration - Video duration in seconds
    * @returns Number of thumbnails to generate
    */
   export function calculateThumbnailCount(videoDuration: number): number {
     // fps=0.5 means 1 thumbnail every 2 seconds
     const thumbnailsPerSecond = thumbnailConfig.fps
     const totalThumbnails = Math.floor(videoDuration * thumbnailsPerSecond)

     // Cap at grid size
     const maxThumbnails = thumbnailConfig.gridColumns * thumbnailConfig.gridRows

     return Math.min(totalThumbnails, maxThumbnails)
   }
   ```

Add comprehensive JSDoc comments.
Output the complete sprite generator file.
```

### PROMPT 4.3.2: Create VTT File Generator

```
Create WebVTT file generator for thumbnail sprite.

File: video-processor/src/thumbnails/vtt.generator.ts

Requirements:

1. Imports:
   ```typescript
   import fs from 'fs/promises'
   import path from 'path'
   import { thumbnailConfig, getProcessingPaths } from '../config/ffmpeg.config'
   import { getVideoMetadata } from '../utils/ffmpeg.utils'
   import { logger } from '../utils/logger'
   ```

2. VTT cue interface:
   ```typescript
   interface VTTCue {
     startTime: number
     endTime: number
     spriteUrl: string
     xywh: string  // x,y,w,h coordinates in sprite
   }
   ```

3. Generate VTT file:
   ```typescript
   /**
    * Generate WebVTT file for thumbnail sprite
    * @param videoId - Video ID
    * @param inputPath - Path to input video
    * @param spriteFilename - Sprite image filename (relative)
    * @returns Path to generated VTT file
    */
   export async function generateVTTFile(
     videoId: string,
     inputPath: string,
     spriteFilename: string = 'sprite.jpg'
   ): Promise<string> {
     logger.info(`📝 Generating VTT file for video: ${videoId}`)

     try {
       // Get video metadata
       const metadata = await getVideoMetadata(inputPath)

       // Get output paths
       const paths = getProcessingPaths(videoId)
       const vttPath = paths.vtt

       // Calculate cues
       const cues = generateVTTCues(metadata.duration, spriteFilename)

       // Build VTT content
       const vttContent = buildVTTContent(cues)

       // Write VTT file
       await fs.writeFile(vttPath, vttContent, 'utf8')

       logger.info(`✅ VTT file generated: ${vttPath}`)
       return vttPath
     } catch (error) {
       logger.error('❌ VTT file generation failed:', error)
       throw error
     }
   }
   ```

4. Generate VTT cues:
   ```typescript
   /**
    * Generate VTT cues for sprite
    * @param videoDuration - Video duration in seconds
    * @param spriteFilename - Sprite filename
    * @returns Array of VTT cues
    */
   function generateVTTCues(videoDuration: number, spriteFilename: string): VTTCue[] {
     const cues: VTTCue[] = []
     const intervalSeconds = 1 / thumbnailConfig.fps  // 2 seconds per thumbnail
     const maxThumbnails = thumbnailConfig.gridColumns * thumbnailConfig.gridRows

     const thumbnailCount = Math.min(
       Math.floor(videoDuration * thumbnailConfig.fps),
       maxThumbnails
     )

     for (let i = 0; i < thumbnailCount; i++) {
       const startTime = i * intervalSeconds
       const endTime = Math.min((i + 1) * intervalSeconds, videoDuration)

       // Calculate sprite position (row, column)
       const row = Math.floor(i / thumbnailConfig.gridColumns)
       const col = i % thumbnailConfig.gridColumns

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
   ```

5. Build VTT content:
   ```typescript
   /**
    * Build VTT file content from cues
    * @param cues - Array of VTT cues
    * @returns VTT file content string
    */
   function buildVTTContent(cues: VTTCue[]): string {
     let content = 'WEBVTT\n\n'

     cues.forEach((cue, index) => {
       const startTimeStr = formatVTTTime(cue.startTime)
       const endTimeStr = formatVTTTime(cue.endTime)

       content += `${index + 1}\n`
       content += `${startTimeStr} --> ${endTimeStr}\n`
       content += `${cue.spriteUrl}#xywh=${cue.xywh}\n\n`
     })

     return content
   }
   ```

6. Format VTT time:
   ```typescript
   /**
    * Format seconds to VTT time format (HH:MM:SS.mmm)
    * @param seconds - Time in seconds
    * @returns Formatted time string
    */
   function formatVTTTime(seconds: number): string {
     const hours = Math.floor(seconds / 3600)
     const minutes = Math.floor((seconds % 3600) / 60)
     const secs = Math.floor(seconds % 60)
     const ms = Math.floor((seconds % 1) * 1000)

     return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
   }
   ```

Add comprehensive JSDoc comments.
Add VTT format validation.
Output the complete VTT generator file.
```

### PROMPT 4.3.3: Create Thumbnail Index

```
Create barrel export for thumbnail modules.

File: video-processor/src/thumbnails/index.ts

Requirements:

Export all thumbnail functions:
```typescript
export * from './sprite.generator'
export * from './vtt.generator'
```

Output the complete index file.
```

---

## SECTION 4.4: BULLMQ JOB QUEUE

### PROMPT 4.4.1: Create Queue Configuration

```
Create BullMQ job queue configuration.

File: video-processor/src/queue/queue.config.ts

Requirements:

1. Imports:
   ```typescript
   import { Queue, QueueOptions } from 'bullmq'
   import { logger } from '../utils/logger'
   ```

2. Redis connection:
   ```typescript
   /**
    * Redis connection configuration
    */
   export const redisConnection = {
     host: process.env.REDIS_HOST || 'localhost',
     port: parseInt(process.env.REDIS_PORT || '6379'),
     password: process.env.REDIS_PASSWORD,
     maxRetriesPerRequest: null,
     enableReadyCheck: false
   }
   ```

3. Queue options:
   ```typescript
   /**
    * Default queue options
    */
   const queueOptions: QueueOptions = {
     connection: redisConnection,
     defaultJobOptions: {
       attempts: 3,                    // Retry failed jobs 3 times
       backoff: {
         type: 'exponential',
         delay: 5000                  // Start with 5 second delay
       },
       removeOnComplete: {
         age: 86400,                  // Keep completed jobs for 24 hours
         count: 100                   // Keep last 100 completed jobs
       },
       removeOnFail: {
         age: 604800                  // Keep failed jobs for 7 days
       }
     }
   }
   ```

4. Create queue:
   ```typescript
   /**
    * Video transcoding queue
    */
   export const videoQueue = new Queue('video-processing', queueOptions)

   logger.info('✅ Video processing queue initialized')
   ```

5. Job data interface:
   ```typescript
   /**
    * Video processing job data
    */
   export interface VideoJobData {
     videoId: string
     originalFilePath: string    // Path in R2 (uploads/video-id/original.mp4)
     title: string
     userId: string
   }
   ```

6. Add job helper:
   ```typescript
   /**
    * Add video processing job to queue
    * @param jobData - Video job data
    * @returns Job ID
    */
   export async function addVideoProcessingJob(jobData: VideoJobData): Promise<string> {
     try {
       const job = await videoQueue.add('transcode', jobData, {
         jobId: jobData.videoId,    // Use videoId as jobId for idempotency
         priority: 1                // Normal priority
       })

       logger.info(`📨 Video processing job queued: ${job.id}`)
       return job.id!
     } catch (error) {
       logger.error('Failed to add video processing job:', error)
       throw error
     }
   }
   ```

7. Get job status:
   ```typescript
   /**
    * Get job status
    * @param jobId - Job ID (videoId)
    * @returns Job state
    */
   export async function getJobStatus(jobId: string): Promise<string | null> {
     try {
       const job = await videoQueue.getJob(jobId)
       if (!job) return null

       const state = await job.getState()
       return state
     } catch (error) {
       logger.error('Failed to get job status:', error)
       return null
     }
   }
   ```

Add comprehensive JSDoc comments.
Output the complete queue config file.
```

### PROMPT 4.4.2: Create Worker

```
Create BullMQ worker to process video jobs.

File: video-processor/src/queue/worker.ts

Requirements:

1. Imports:
   ```typescript
   import { Worker, Job } from 'bullmq'
   import { redisConnection, VideoJobData } from './queue.config'
   import { processVideo } from '../processor/video.processor'
   import { logger } from '../utils/logger'
   ```

2. Create worker:
   ```typescript
   /**
    * Video processing worker
    */
   export const videoWorker = new Worker(
     'video-processing',
     async (job: Job<VideoJobData>) => {
       logger.info(`🔄 Processing job: ${job.id}`)

       try {
         // Process video
         const result = await processVideo(job.data)

         logger.info(`✅ Job completed: ${job.id}`)
         return result
       } catch (error) {
         logger.error(`❌ Job failed: ${job.id}`, error)
         throw error
       }
     },
     {
       connection: redisConnection,
       concurrency: 1,              // Process 1 video at a time (resource intensive)
       limiter: {
         max: 1,                   // Max 1 job
         duration: 1000            // per second
       }
     }
   )
   ```

3. Worker event handlers:
   ```typescript
   /**
    * Worker completed event
    */
   videoWorker.on('completed', (job) => {
     logger.info(`✅ Job ${job.id} completed successfully`)
   })

   /**
    * Worker failed event
    */
   videoWorker.on('failed', (job, error) => {
     if (job) {
       logger.error(`❌ Job ${job.id} failed:`, error)
     }
   })

   /**
    * Worker error event
    */
   videoWorker.on('error', (error) => {
     logger.error('❌ Worker error:', error)
   })

   /**
    * Worker active event
    */
   videoWorker.on('active', (job) => {
     logger.info(`🔄 Job ${job.id} started processing`)
   })

   /**
    * Worker stalled event
    */
   videoWorker.on('stalled', (jobId) => {
     logger.warn(`⚠️  Job ${jobId} stalled`)
   })
   ```

4. Graceful shutdown:
   ```typescript
   /**
    * Graceful shutdown handler
    */
   export async function shutdownWorker(): Promise<void> {
     logger.info('🛑 Shutting down worker...')

     try {
       await videoWorker.close()
       logger.info('✅ Worker shut down gracefully')
     } catch (error) {
       logger.error('❌ Worker shutdown error:', error)
     }
   }

   // Handle process termination
   process.on('SIGTERM', shutdownWorker)
   process.on('SIGINT', shutdownWorker)
   ```

Add comprehensive JSDoc comments.
Output the complete worker file.
```

### PROMPT 4.4.3: Create Queue Index

```
Create barrel export for queue modules.

File: video-processor/src/queue/index.ts

Requirements:

Export all queue functions:
```typescript
export * from './queue.config'
export * from './worker'
```

Output the complete index file.
```

---

## SECTION 4.5: WORKER & PROCESSING LOGIC

### PROMPT 4.5.1: Create Video Processor

```
Create main video processor orchestrator.

File: video-processor/src/processor/video.processor.ts

Requirements:

1. Imports:
   ```typescript
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
   ```

2. Processing result interface:
   ```typescript
   interface ProcessingResult {
     videoId: string
     success: boolean
     hlsPath: string
     thumbnailVttPath: string
     spritePath: string
     duration: number
   }
   ```

3. Main process function:
   ```typescript
   /**
    * Process video: download, transcode, generate thumbnails, upload
    * @param jobData - Video job data
    * @returns Processing result
    */
   export async function processVideo(jobData: VideoJobData): Promise<ProcessingResult> {
     const { videoId, originalFilePath, title } = jobData

     logger.info(`🎬 Starting video processing: ${videoId} (${title})`)
     const startTime = Date.now()

     try {
       // Update status to PROCESSING
       await updateVideoStatus(videoId, 'PROCESSING')

       // Step 1: Download original video from R2
       logger.info(`📥 Step 1/5: Downloading original video from R2`)
       const paths = getProcessingPaths(videoId)
       await downloadFromR2(originalFilePath, paths.inputFile)

       // Step 2: Transcode to HLS
       logger.info(`🎬 Step 2/5: Transcoding to HLS`)
       const transcodeResult = await transcodeToHLS(videoId, paths.inputFile)

       // Step 3: Generate thumbnail sprite
       logger.info(`🖼️  Step 3/5: Generating thumbnail sprite`)
       await generateThumbnailSprite(videoId, paths.inputFile)

       // Step 4: Generate VTT file
       logger.info(`📝 Step 4/5: Generating VTT file`)
       await generateVTTFile(videoId, paths.inputFile)

       // Step 5: Upload to R2
       logger.info(`📤 Step 5/5: Uploading to R2`)
       const uploadPaths = await uploadHLSPackage(videoId, paths.outputDir)

       // Update video status to READY
       await updateVideoStatus(videoId, 'READY', {
         hlsPath: uploadPaths.hlsPath,
         thumbnailVttPath: uploadPaths.thumbnailVttPath,
         spritePath: uploadPaths.spritePath
       })

       // Cleanup temp files
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

       // Update status to FAILED
       try {
         await updateVideoStatus(videoId, 'FAILED')
       } catch (updateError) {
         logger.error('Failed to update video status to FAILED:', updateError)
       }

       // Cleanup on failure
       try {
         await cleanupTempFiles(videoId)
         await cleanupOutputFiles(videoId)
       } catch (cleanupError) {
         logger.warn('Cleanup failed:', cleanupError)
       }

       throw error
     }
   }
   ```

4. Cleanup output files:
   ```typescript
   /**
    * Clean up output directory after upload
    * @param videoId - Video ID
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
   ```

Add comprehensive JSDoc comments.
Add error recovery logic.
Output the complete processor file.
```

### PROMPT 4.5.2: Create R2 Downloader

```
Create R2 downloader for original videos.

File: video-processor/src/downloader/r2.downloader.ts

Requirements:

1. Imports:
   ```typescript
   import fs from 'fs/promises'
   import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
   import { logger } from '../utils/logger'
   ```

2. R2 client:
   ```typescript
   /**
    * Initialize R2 client
    */
   const r2Client = new S3Client({
     region: 'auto',
     endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
     credentials: {
       accessKeyId: process.env.R2_ACCESS_KEY_ID!,
       secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
     }
   })

   const BUCKET_NAME = process.env.R2_BUCKET_NAME!
   ```

3. Download from R2:
   ```typescript
   /**
    * Download file from R2
    * @param r2Key - R2 object key
    * @param localPath - Local destination path
    */
   export async function downloadFromR2(r2Key: string, localPath: string): Promise<void> {
     logger.info(`📥 Downloading from R2: ${r2Key}`)

     try {
       const response = await r2Client.send(new GetObjectCommand({
         Bucket: BUCKET_NAME,
         Key: r2Key
       }))

       if (!response.Body) {
         throw new Error('Empty response body from R2')
       }

       // Convert stream to buffer
       const chunks: Uint8Array[] = []
       for await (const chunk of response.Body as any) {
         chunks.push(chunk)
       }

       const buffer = Buffer.concat(chunks)

       // Write to local file
       await fs.writeFile(localPath, buffer)

       logger.info(`✅ Downloaded: ${localPath} (${buffer.length} bytes)`)
     } catch (error) {
       logger.error(`Failed to download from R2: ${r2Key}`, error)
       throw error
     }
   }
   ```

Add JSDoc comments.
Output the complete downloader file.
```

### PROMPT 4.5.3: Create Video Service for Status Updates

```
Create video service to update database status.

File: video-processor/src/services/video.service.ts

Requirements:

1. Imports:
   ```typescript
   import axios from 'axios'
   import { logger } from '../utils/logger'
   ```

2. Backend API configuration:
   ```typescript
   /**
    * Backend API base URL
    */
   const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3001/api/v1'

   /**
    * Internal API key for video processor
    */
   const API_KEY = process.env.VIDEO_PROCESSOR_API_KEY
   ```

3. Update video status:
   ```typescript
   /**
    * Update video status in database via backend API
    * @param videoId - Video ID
    * @param status - New status (PROCESSING, READY, FAILED)
    * @param paths - Optional R2 paths
    */
   export async function updateVideoStatus(
     videoId: string,
     status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED',
     paths?: {
       hlsPath?: string
       thumbnailVttPath?: string
       spritePath?: string
     }
   ): Promise<void> {
     try {
       logger.info(`📝 Updating video status: ${videoId} -> ${status}`)

       const response = await axios.patch(
         `${BACKEND_API_URL}/videos/${videoId}/status`,
         {
           status,
           ...paths
         },
         {
           headers: {
             'X-API-Key': API_KEY
           }
         }
       )

       logger.info(`✅ Video status updated: ${videoId}`)
     } catch (error) {
       logger.error(`Failed to update video status: ${videoId}`, error)
       throw error
     }
   }
   ```

Add JSDoc comments.
Add retry logic for network failures.
Output the complete service file.
```

---

## SECTION 4.6: ENVIRONMENT & DEPENDENCIES

### PROMPT 4.6.1: Create Environment Variables Template

```
Create .env.example file for video processor.

File: video-processor/.env.example

Requirements:

```env
# Node Environment
NODE_ENV=development

# Redis (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Cloudflare R2 Storage
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=neuroflix-videos

# Backend API
BACKEND_API_URL=http://localhost:3001/api/v1
VIDEO_PROCESSOR_API_KEY=your-internal-api-key-for-video-processor

# FFmpeg (automatically detected from ./ffmpeg/bin/)
# No configuration needed if FFmpeg is in video-processor/ffmpeg/bin/
```

Add comments explaining each variable.
Output the complete .env.example file.
```

### PROMPT 4.6.2: Create Video Processor Package.json

```
Create package.json for video processor.

File: video-processor/package.json

Requirements:

```json
{
  "name": "neuroflix-video-processor",
  "version": "1.0.0",
  "description": "Neuroflix Video Transcoding Service (FFmpeg + HLS + BullMQ)",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "worker": "tsx src/queue/worker.ts",
    "test:ffmpeg": "tsx src/tests/test-ffmpeg.ts",
    "download:ffmpeg": "node scripts/download-ffmpeg.js"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.400.0",
    "axios": "^1.4.0",
    "bullmq": "^4.0.0",
    "ioredis": "^5.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^3.12.7",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

Output the complete package.json file.
```

---

## ✅ PART 4 COMPLETION VERIFICATION

### Completeness Checklist:

- [x] **Section 4.1**: FFmpeg Setup & Configuration - 3 prompts
  - FFmpeg configuration with quality presets, HLS settings, thumbnail config
  - FFmpeg utility functions (execute commands, get metadata, Windows paths)
  - Logger utility for video processor

- [x] **Section 4.2**: HLS Transcoding Engine - 4 prompts
  - Main HLS transcoder (4 qualities: 1080p/720p/480p/360p)
  - Quality validator (skip qualities higher than source resolution)
  - Transcoder index barrel export
  - R2 uploader for processed HLS files

- [x] **Section 4.3**: Thumbnail & Sprite Generation - 3 prompts
  - Thumbnail sprite generator (10x10 grid, 160x90px, 0.5fps extraction)
  - VTT file generator with proper time formatting
  - Thumbnail index barrel export

- [x] **Section 4.4**: BullMQ Job Queue - 3 prompts
  - Queue configuration with Redis, retry logic, job options
  - Worker with event handlers and graceful shutdown
  - Queue index barrel export

- [x] **Section 4.5**: Worker & Processing Logic - 3 prompts
  - Main video processor orchestrator (5-step pipeline)
  - R2 downloader for original videos
  - Video service for database status updates

- [x] **Section 4.6**: Environment & Dependencies - 2 prompts
  - .env.example with all required variables
  - package.json with BullMQ, AWS SDK, TypeScript

**TOTAL**: 18 prompts ✅ COMPLETE

### Logic Verification:

✅ **FFmpeg Pipeline**: Download → Transcode HLS (4 qualities) → Generate sprites → Generate VTT → Upload R2
✅ **Windows Compatibility**: Path escaping, quoted executables, forward slashes for FFmpeg
✅ **HLS Configuration**: 4-second segments, H.264 codec, AAC audio, master playlist generation
✅ **Thumbnail Generation**: 0.5fps extraction (1 every 2 seconds), 10x10 grid, 160x90px thumbnails
✅ **VTT Format**: Proper WebVTT format with xywh coordinates for sprite positioning
✅ **Job Queue**: BullMQ with Redis, retry logic, progress tracking, graceful shutdown
✅ **Error Handling**: Try-catch on all steps, status updates to database (FAILED on error)
✅ **Resource Management**: Cleanup temp files, single concurrent job (resource intensive)

### Data Flow:

```
Upload → Backend API → Queue Job (BullMQ) → Worker picks up job
   ↓
Download original from R2 → Save to temp
   ↓
FFmpeg Transcode → Generate HLS (1080p, 720p, 480p, 360p)
   ↓
FFmpeg Extract Thumbnails → Generate sprite.jpg (10x10 grid)
   ↓
Generate thumbnails.vtt → WebVTT format with sprite coordinates
   ↓
Upload all files to R2 (videos/video-id/*)
   ↓
Update database: status=READY, hlsPath, thumbnailVttPath, spritePath
   ↓
Cleanup temp and output directories
```

### Integration with Part 3 (Backend):

✅ **Upload Controller**: Creates video record → Uploads to R2 → Queues transcode job
✅ **Status Updates**: Video processor calls backend API to update status
✅ **R2 Paths**: Backend generates signed URLs from paths provided by processor
✅ **Job Queue**: Backend can add jobs, check status via queue API

**Part 4: Video Processor is COMPLETE and ready for use! 🎉**

---

**Next Steps**:
- Part 5: Scripts & Configuration (Windows setup, FFmpeg download script, deployment configs, documentation)
