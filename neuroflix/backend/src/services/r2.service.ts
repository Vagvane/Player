/**
 * Cloudflare R2 Service
 *
 * Provides file upload, download, deletion, signed URL generation,
 * existence checks, and metadata retrieval using the AWS S3-compatible
 * Cloudflare R2 storage API.
 */

import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2Client, r2Config, getR2Key } from '../config/r2.config'
import { logger } from '../utils/logger'
import { Readable, pipeline as streamPipeline } from 'stream'
import { promisify } from 'util'

const pipeline = promisify(streamPipeline)

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * Options for uploading a file to R2.
 */
interface UploadOptions {
  /** Destination key (path) inside the R2 bucket */
  key: string
  /** File content – can be a raw Buffer, a Node.js Readable stream, or a string */
  body: Buffer | Readable | string
  /** MIME type of the file (e.g. "video/mp4", "image/jpeg") */
  contentType?: string
  /** Optional custom metadata to store alongside the object */
  metadata?: Record<string, string>
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/**
 * Upload a file to Cloudflare R2.
 *
 * @param options - Upload options containing key, body, contentType, and metadata
 * @returns The R2 object key where the file was stored
 * @throws Error if the upload fails
 *
 * @example
 * const key = await uploadFile({
 *   key: 'uploads/video-id/original.mp4',
 *   body: fileBuffer,
 *   contentType: 'video/mp4'
 * })
 */
export async function uploadFile(options: UploadOptions): Promise<string> {
  try {
    const { key, body, contentType, metadata } = options
    const r2Key = getR2Key(key)

    await r2Client.send(
      new PutObjectCommand({
        Bucket: r2Config.bucketName,
        Key: r2Key,
        Body: body as any,
        ContentType: contentType,
        Metadata: metadata
      })
    )

    logger.info(`File uploaded successfully: ${r2Key}`)
    return r2Key
  } catch (error) {
    logger.error('File upload failed', error)
    throw new Error(`R2 upload failed: ${error}`)
  }
}

// ---------------------------------------------------------------------------
// Signed URL
// ---------------------------------------------------------------------------

/**
 * Generate a pre-signed URL that allows temporary, secure access to an R2 object
 * without requiring the caller to have AWS/R2 credentials.
 *
 * @param key       - R2 object key (path inside the bucket)
 * @param expiresIn - Validity window in seconds (default: 3600 = 1 hour)
 * @returns A time-limited pre-signed URL string
 * @throws Error if URL generation fails
 *
 * @example
 * const url = await getSignedUrlForFile('videos/video-id/master.m3u8', 7200)
 */
export async function getSignedUrlForFile(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const r2Key = getR2Key(key)

    const command = new GetObjectCommand({
      Bucket: r2Config.bucketName,
      Key: r2Key
    })

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn })

    logger.debug(`Generated signed URL for: ${r2Key}`)
    return signedUrl
  } catch (error) {
    logger.error('Signed URL generation failed', error)
    throw new Error(`Failed to generate signed URL: ${error}`)
  }
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/**
 * Download a file from Cloudflare R2 and return its contents as a Buffer.
 *
 * @param key - R2 object key (path inside the bucket)
 * @returns File contents as a Node.js Buffer
 * @throws Error if the download fails or the object body is empty
 *
 * @example
 * const buffer = await downloadFile('uploads/video-id/original.mp4')
 * fs.writeFileSync('local-copy.mp4', buffer)
 */
export async function downloadFile(key: string): Promise<Buffer> {
  try {
    const r2Key = getR2Key(key)

    const response = await r2Client.send(
      new GetObjectCommand({
        Bucket: r2Config.bucketName,
        Key: r2Key
      })
    )

    if (!response.Body) {
      throw new Error('File body is empty')
    }

    // Convert the SDK's async-iterable body stream into a single Buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of response.Body as any) {
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)
    logger.debug(`Downloaded file: ${r2Key}, size: ${buffer.length} bytes`)

    return buffer
  } catch (error) {
    logger.error('File download failed', error)
    throw new Error(`R2 download failed: ${error}`)
  }
}

// ---------------------------------------------------------------------------
// Stream (pipe — zero buffer, bytes flow directly to the HTTP response)
// ---------------------------------------------------------------------------

/**
 * Open a streaming connection to an R2 object and return the raw body stream.
 *
 * Unlike {@link downloadFile}, this function does **not** accumulate the
 * entire object into a Node.js `Buffer`.  The caller receives a live
 * `Readable` that they can `.pipe()` (or use with `stream/promises`
 * `pipeline`) directly into an Express `Response`.  This keeps memory usage
 * constant regardless of file size — critical for large `.ts` video segments.
 *
 * @param key          - R2 object key (leading slash stripped automatically)
 * @param destination  - A Node.js `Writable` stream to pipe into (e.g. an
 *                       Express `Response`). When provided the function awaits
 *                       completion and resolves when all bytes have been sent.
 *                       When omitted the raw `Readable` is returned for the
 *                       caller to pipe manually.
 * @returns Metadata object with the body stream, content-type, and byte length.
 * @throws  Re-throws R2 errors wrapped with an `R2 stream failed:` prefix.
 *
 * @example
 * // Pipe directly to Express response:
 * const { body, contentType, contentLength } = await streamFile('videos/abc/seg.ts')
 * res.set('Content-Type', contentType ?? 'video/mp2t')
 * if (contentLength) res.set('Content-Length', String(contentLength))
 * await pipeline(body, res)
 */
export async function streamFile(key: string): Promise<{
  body: Readable
  contentType?: string
  contentLength?: number
}> {
  try {
    const r2Key = getR2Key(key)

    const response = await r2Client.send(
      new GetObjectCommand({
        Bucket: r2Config.bucketName,
        Key: r2Key
      })
    )

    if (!response.Body) {
      throw new Error('File body is empty')
    }

    logger.debug(`Streaming file: ${r2Key}`)

    return {
      body: response.Body as Readable,
      contentType: response.ContentType,
      contentLength: response.ContentLength
    }
  } catch (error) {
    logger.error('File stream failed', error)
    throw new Error(`R2 stream failed: ${error}`)
  }
}

// Re-export pipeline so controllers can import a single symbol:
export { pipeline as streamPipeline }

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/**
 * Permanently delete a file from Cloudflare R2.
 *
 * @param key - R2 object key (path inside the bucket)
 * @throws Error if the deletion fails
 *
 * @example
 * await deleteFile('uploads/video-id/original.mp4')
 */
export async function deleteFile(key: string): Promise<void> {
  try {
    const r2Key = getR2Key(key)

    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: r2Config.bucketName,
        Key: r2Key
      })
    )

    logger.info(`File deleted successfully: ${r2Key}`)
  } catch (error) {
    logger.error('File deletion failed', error)
    throw new Error(`R2 deletion failed: ${error}`)
  }
}

// ---------------------------------------------------------------------------
// Existence check
// ---------------------------------------------------------------------------

/**
 * Check whether a file exists in Cloudflare R2 without downloading it.
 *
 * Uses a HeadObject request which is cheaper than a full GET and returns
 * `false` on a 404/NotFound response instead of throwing.
 *
 * @param key - R2 object key (path inside the bucket)
 * @returns `true` if the file exists, `false` if it does not
 * @throws Re-throws any error that is not a "not found" response
 *
 * @example
 * const exists = await fileExists('videos/video-id/master.m3u8')
 * if (!exists) { ... }
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const r2Key = getR2Key(key)

    await r2Client.send(
      new HeadObjectCommand({
        Bucket: r2Config.bucketName,
        Key: r2Key
      })
    )

    return true
  } catch (error: any) {
    // R2 / S3 returns a "NotFound" error name when the object does not exist
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false
    }
    throw error
  }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

/**
 * Retrieve metadata for an object stored in Cloudflare R2.
 *
 * Uses a HeadObject request so the file body is never transferred.
 *
 * @param key - R2 object key (path inside the bucket)
 * @returns An object containing `size` (bytes), `lastModified` (Date), and
 *          an optional `contentType` string
 * @throws Error if the metadata request fails
 *
 * @example
 * const meta = await getFileMetadata('videos/video-id/master.m3u8')
 * console.log(`Size: ${meta.size} bytes, Modified: ${meta.lastModified}`)
 */
export async function getFileMetadata(key: string): Promise<{
  size: number
  lastModified: Date
  contentType?: string
}> {
  try {
    const r2Key = getR2Key(key)

    const response = await r2Client.send(
      new HeadObjectCommand({
        Bucket: r2Config.bucketName,
        Key: r2Key
      })
    )

    return {
      size: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
      contentType: response.ContentType
    }
  } catch (error) {
    logger.error('Failed to get file metadata', error)
    throw new Error(`Failed to get metadata: ${error}`)
  }
}
