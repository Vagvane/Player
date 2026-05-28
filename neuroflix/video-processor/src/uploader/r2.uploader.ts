/**
 * R2 Uploader
 * Uploads processed HLS files, thumbnail sprites, and VTT files to
 * Cloudflare R2 object storage after video transcoding is complete.
 */

import fs from 'fs/promises'
import path from 'path'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { logger } from '../utils/logger'

/**
 * Cloudflare R2 client.
 * Credentials and endpoint are read from environment variables at startup.
 */
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
  }
})

/** Target R2 bucket name, sourced from the environment. */
const BUCKET_NAME = process.env.R2_BUCKET_NAME!

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Upload a single local file to R2.
 *
 * @param localPath - Absolute path to the file on the local filesystem
 * @param r2Key - Destination object key inside the R2 bucket
 * @param contentType - MIME type for the object (used by CDN / browsers)
 * @throws Error if the S3 PutObject command fails
 */
async function uploadFile(
  localPath: string,
  r2Key: string,
  contentType: string
): Promise<void> {
  try {
    const fileContent = await fs.readFile(localPath)

    await r2Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: r2Key,
        Body: fileContent,
        ContentType: contentType
      })
    )

    logger.debug(`✅ Uploaded: ${r2Key}`)
  } catch (error) {
    logger.error(`Failed to upload ${r2Key}:`, error)
    throw error
  }
}

/**
 * Resolve the correct MIME type for a file based on its extension.
 *
 * Covers the four file types produced by the transcoding pipeline:
 * - `.m3u8`  — HLS playlist
 * - `.ts`    — MPEG-2 transport stream segment
 * - `.jpg`   — Thumbnail sprite
 * - `.vtt`   — WebVTT subtitle / thumbnail cue file
 *
 * @param ext - Lowercase file extension including the leading dot (e.g. `.m3u8`)
 * @returns MIME type string; falls back to `application/octet-stream` for unknowns
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Recursively upload every file in a local directory to R2.
 *
 * Walks the directory tree (non-recursive entries are skipped), determines
 * the MIME type for each file, normalises Windows backslashes to forward
 * slashes in the R2 key, and uploads each file sequentially.
 *
 * Progress is reported via logger after every successful upload and once
 * more when the directory upload is fully complete.
 *
 * @param localDir - Absolute path to the local directory to upload
 * @param r2Prefix - R2 key prefix applied to every uploaded file
 *                   (e.g. `"videos/abc-123/"`)
 * @returns Array of R2 object keys that were successfully uploaded
 * @throws Error if reading the directory or uploading any file fails
 */
export async function uploadDirectory(
  localDir: string,
  r2Prefix: string
): Promise<string[]> {
  logger.info(`📤 Uploading directory: ${localDir} -> ${r2Prefix}`)

  const uploadedKeys: string[] = []

  try {
    // fs.readdir with { recursive: true } returns relative paths from localDir
    const files = await fs.readdir(localDir, { recursive: true })

    for (const file of files) {
      const localPath = path.join(localDir, file as string)
      const stat = await fs.stat(localPath)

      // Skip sub-directories — we only want files
      if (stat.isDirectory()) continue

      const ext = path.extname(file as string).toLowerCase()
      const contentType = getContentType(ext)

      // Normalise Windows backslashes so R2 keys always use forward slashes
      const r2Key = `${r2Prefix}${(file as string).replace(/\\/g, '/')}`

      await uploadFile(localPath, r2Key, contentType)
      uploadedKeys.push(r2Key)

      // Per-file progress log
      logger.logUploadProgress('directory', Math.round((uploadedKeys.length / files.length) * 100))
    }

    logger.info(`✅ Uploaded ${uploadedKeys.length} files to R2`)
    return uploadedKeys
  } catch (error) {
    logger.error('Failed to upload directory:', error)
    throw error
  }
}

/**
 * Upload the complete HLS package for a single video to R2.
 *
 * Uploads every file found in `localOutputDir` (master playlist, per-quality
 * playlists, `.ts` segments, thumbnail sprite, and VTT file) under the prefix
 * `videos/<videoId>/`.
 *
 * After the upload finishes, the well-known R2 paths for the master playlist,
 * VTT file, and sprite are returned so the backend can persist them in the
 * database and generate signed URLs for clients.
 *
 * @param videoId - Unique video identifier; determines the R2 key prefix
 * @param localOutputDir - Local directory produced by the transcoding pipeline
 * @returns Object containing the key R2 paths for the processed video assets
 * @throws Error if any file upload fails
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

  // Verify sprite.jpg exists locally before uploading — fail fast with a clear error
  // rather than storing a broken R2 path in the database
  const path = await import('path')
  const spritePath = path.join(localOutputDir, 'sprite.jpg')
  const spriteExists = await fs.access(spritePath).then(() => true).catch(() => false)
  if (!spriteExists) {
    throw new Error(`sprite.jpg not found in output directory — thumbnail generation must have failed: ${spritePath}`)
  }

  // Upload everything in the output directory
  await uploadDirectory(localOutputDir, r2Prefix)

  // Return the canonical R2 paths (not full public/signed URLs)
  return {
    hlsPath: `${r2Prefix}master.m3u8`,
    thumbnailVttPath: `${r2Prefix}thumbnails.vtt`,
    spritePath: `${r2Prefix}sprite.jpg`
  }
}
