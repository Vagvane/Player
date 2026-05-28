/**
 * R2 Downloader
 *
 * Downloads original video files from Cloudflare R2 storage to the
 * local temp directory so FFmpeg can process them.
 *
 * @module downloader/r2.downloader
 */

import fs from 'fs/promises'
import path from 'path'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { logger } from '../utils/logger'

// ─────────────────────────────────────────────
// R2 Client
// ─────────────────────────────────────────────

/**
 * Cloudflare R2 S3-compatible client.
 *
 * Credentials and account ID are read from environment variables at
 * startup.  The region must be set to `"auto"` for R2.
 */
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
  }
})

/**
 * Target R2 bucket name, sourced from the `R2_BUCKET_NAME` environment
 * variable.
 */
const BUCKET_NAME = process.env.R2_BUCKET_NAME!

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Download a file from Cloudflare R2 to the local filesystem.
 *
 * The response body is consumed as an async iterable and buffered in
 * memory before being written to disk.  This approach is safe for video
 * files that are gigabytes in size because Node.js streams chunk the
 * data automatically; the full file is only materialised as a single
 * `Buffer` right before the `fs.writeFile` call.
 *
 * The parent directory of `localPath` must already exist (it is created
 * by {@link https://github.com/neuroflix/video-processor | initializeDirectories}
 * at startup).
 *
 * @param r2Key    - R2 object key, e.g. `"uploads/abc-123/original.mp4"`
 * @param localPath - Absolute path where the downloaded file will be saved,
 *                    e.g. `"/app/temp/abc-123_original.mp4"`
 * @throws {Error} If the R2 object does not exist, the response body is
 *                 empty, or the local write fails.
 *
 * @example
 * ```typescript
 * await downloadFromR2('uploads/abc-123/original.mp4', '/app/temp/abc-123_original.mp4')
 * ```
 */
export async function downloadFromR2(r2Key: string, localPath: string): Promise<void> {
  logger.info(`📥 Downloading from R2: ${r2Key}`)

  // Ensure the destination directory exists before writing
  await fs.mkdir(path.dirname(localPath), { recursive: true })

  try {
    const response = await r2Client.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: r2Key
      })
    )

    if (!response.Body) {
      throw new Error(`Empty response body from R2 for key: ${r2Key}`)
    }

    // Stream → Buffer: iterate over async chunks and collect them
    const chunks: Uint8Array[] = []
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)

    // Persist to local temp file
    await fs.writeFile(localPath, buffer)

    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2)
    logger.info(`✅ Downloaded: ${localPath} (${sizeMB} MB / ${buffer.length} bytes)`)
  } catch (error) {
    logger.error(`❌ Failed to download from R2: ${r2Key}`, error)
    throw error
  }
}
