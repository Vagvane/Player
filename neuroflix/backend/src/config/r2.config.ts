/**
 * Cloudflare R2 Configuration
 *
 * Cloudflare R2 is an S3-compatible object storage service. This module
 * initialises an AWS S3 SDK client pointed at the R2 endpoint so that all
 * standard `@aws-sdk/client-s3` commands work without modification.
 *
 * ## Cloudflare account requirements
 * 1. A Cloudflare account with R2 enabled (free tier available).
 * 2. An R2 bucket created in the Cloudflare dashboard.
 * 3. An R2 API token with "Object Read & Write" permissions.
 *    Dashboard → R2 → Manage R2 API Tokens → Create API Token
 * 4. The following values from that token / bucket:
 *    - Account ID   (Dashboard → right sidebar)
 *    - Access Key ID
 *    - Secret Access Key
 *    - Bucket Name
 *    - (Optional) Public URL if the bucket has public access enabled
 *
 * ## Environment variables required
 * ```
 * R2_ACCOUNT_ID=<your-account-id>
 * R2_ACCESS_KEY_ID=<your-access-key-id>
 * R2_SECRET_ACCESS_KEY=<your-secret-access-key>
 * R2_BUCKET_NAME=<your-bucket-name>
 * R2_PUBLIC_URL=https://<custom-domain-or-r2-public-url>  # optional
 * ```
 */

import { S3Client, HeadBucketCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3'
import { logger } from '../utils/logger'

// ---------------------------------------------------------------------------
// Validate required environment variables at startup
// ---------------------------------------------------------------------------

/**
 * List of environment variables that must be present before the application
 * can interact with R2. Missing any of these will throw immediately so the
 * problem is caught at boot time rather than at the first request.
 */
const requiredEnvVars = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME'
]

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`)
  }
})

// ---------------------------------------------------------------------------
// R2 configuration object
// ---------------------------------------------------------------------------

/**
 * Centralised R2 configuration derived from environment variables.
 *
 * @property accountId        - Cloudflare Account ID
 * @property accessKeyId      - R2 API token Access Key ID
 * @property secretAccessKey  - R2 API token Secret Access Key
 * @property bucketName       - Target R2 bucket name
 * @property publicUrl        - Base public URL for the bucket
 *                              (defaults to the standard `<bucket>.r2.dev` URL)
 * @property region           - Always `'auto'` for R2 (Cloudflare selects the
 *                              nearest region automatically)
 */
export const r2Config = {
  accountId: process.env.R2_ACCOUNT_ID!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  bucketName: process.env.R2_BUCKET_NAME!,
  publicUrl:
    process.env.R2_PUBLIC_URL ||
    `https://${process.env.R2_BUCKET_NAME}.r2.dev`,
  region: 'auto' as const
}

// ---------------------------------------------------------------------------
// S3-compatible client
// ---------------------------------------------------------------------------

/**
 * Pre-configured AWS S3 client that targets the Cloudflare R2 endpoint.
 *
 * R2 is fully S3-compatible, meaning every `@aws-sdk/client-s3` command
 * (PutObject, GetObject, DeleteObject, etc.) works without changes. The only
 * difference is the custom `endpoint` pointing to:
 * `https://<accountId>.r2.cloudflarestorage.com`
 *
 * @example
 * import { r2Client } from './r2.config'
 * import { PutObjectCommand } from '@aws-sdk/client-s3'
 *
 * await r2Client.send(new PutObjectCommand({ Bucket: '...', Key: '...', Body: file }))
 */
export const r2Client = new S3Client({
  region: r2Config.region,
  endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2Config.accessKeyId,
    secretAccessKey: r2Config.secretAccessKey
  }
})

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Normalise an R2 object key by stripping any leading slash.
 *
 * R2 (like S3) does not use leading slashes in object keys, but internal
 * paths produced by other parts of the application may include one.
 *
 * @param path - Raw path string
 * @returns Normalised R2 key without a leading slash
 *
 * @example
 * getR2Key('/videos/abc/master.m3u8') // → 'videos/abc/master.m3u8'
 * getR2Key('videos/abc/master.m3u8')  // → 'videos/abc/master.m3u8'
 */
export function getR2Key(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path
}

/**
 * Build the full public URL for an R2 object.
 *
 * Only works when the bucket has public access enabled or a custom domain
 * is configured. For private content use signed URLs via the R2 service.
 *
 * @param key - R2 object key (leading slash is stripped automatically)
 * @returns Full public URL
 *
 * @example
 * getPublicUrl('videos/abc/master.m3u8')
 * // → 'https://my-bucket.r2.dev/videos/abc/master.m3u8'
 */
export function getPublicUrl(key: string): string {
  return `${r2Config.publicUrl}/${getR2Key(key)}`
}

/**
 * Generate the standard R2 storage paths for a given video ID.
 *
 * All video assets follow a consistent directory structure under the video's
 * UUID so they can be located and cleaned up predictably.
 *
 * @param videoId - UUID of the video
 * @returns Object containing R2 keys for each asset type
 *
 * @example
 * const paths = getVideoPaths('550e8400-e29b-41d4-a716-446655440000')
 * // paths.hls → 'videos/550e8400.../master.m3u8'
 */
export function getVideoPaths(videoId: string) {
  return {
    /** Original uploaded file (stored temporarily before processing) */
    upload: `uploads/${videoId}/original.mp4`,
    /** HLS master playlist */
    hls: `videos/${videoId}/master.m3u8`,
    /** WebVTT thumbnail sprite index file */
    thumbnailVtt: `videos/${videoId}/thumbnails.vtt`,
    /** Thumbnail sprite image */
    sprite: `videos/${videoId}/sprite.jpg`,
    /** Prefix for all HLS segment files */
    segments: `videos/${videoId}/`
  }
}

// ---------------------------------------------------------------------------
// CORS configuration
// ---------------------------------------------------------------------------

/**
 * Apply CORS rules to the R2 bucket so that browser clients can fetch HLS
 * segments, manifests, and thumbnail assets directly from the Cloudflare CDN
 * (when `R2_PUBLIC_URL` is set) without being blocked by the same-origin policy.
 *
 * ## Why this is needed
 * When CDN mode is active the frontend fetches files straight from
 * `R2_PUBLIC_URL` (e.g. `https://pub-xxx.r2.dev`). Browsers enforce CORS on
 * cross-origin XHR / fetch calls, so without an `Access-Control-Allow-Origin`
 * header the request is blocked even though the file was served (status 200).
 *
 * ## What this does
 * Calls `PutBucketCors` — the S3-compatible API Cloudflare R2 supports —
 * to install a single CORS rule that allows GET and HEAD from the frontend
 * origin(s). The operation is idempotent so it is safe to run on every startup.
 *
 * ## When to call it
 * Only needed when `R2_PUBLIC_URL` is set (CDN mode). In proxy mode the backend
 * adds CORS headers itself via the `cors` middleware and this function is skipped.
 *
 * @returns `true` on success, `false` on failure (non-fatal — server continues)
 */
export async function configureBucketCors(): Promise<boolean> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

  // Always include the configured frontend URL plus common local dev origins.
  const allowedOrigins = Array.from(
    new Set([
      frontendUrl,
      'http://localhost:5173',  // Vite default
      'http://localhost:3000',  // alternative dev port
    ]),
  )

  try {
    await r2Client.send(
      new PutBucketCorsCommand({
        Bucket: r2Config.bucketName,
        CORSConfiguration: {
          CORSRules: [
            {
              /**
               * Allow the frontend to read any HLS file (manifest, segment,
               * VTT, sprite) directly from the CDN.
               *
               * AllowedMethods: GET for normal file fetches, HEAD for
               *   hls.js range / pre-flight segment checks.
               *
               * AllowedHeaders: '*' lets hls.js send its custom headers
               *   (e.g. `Range`) without a separate OPTIONS pre-flight failing.
               *
               * ExposeHeaders: surface Content-Length / ETag so the browser
               *   can validate cache entries and hls.js can size its buffer.
               *
               * MaxAgeSeconds: 86400 (24 h) — caches the pre-flight result in
               *   the browser so repeated segment fetches don't trigger extra
               *   OPTIONS round-trips.
               */
              AllowedOrigins: allowedOrigins,
              AllowedMethods: ['GET', 'HEAD'],
              AllowedHeaders: ['*'],
              ExposeHeaders: ['Content-Length', 'Content-Type', 'ETag', 'Accept-Ranges'],
              MaxAgeSeconds: 86400,
            },
          ],
        },
      }),
    )

    logger.info(
      `R2 CORS configured for origins: ${allowedOrigins.join(', ')}`,
    )
    return true
  } catch (error) {
    logger.error('Failed to configure R2 CORS rules', error)
    return false
  }
}

// ---------------------------------------------------------------------------
// Connection test
// ---------------------------------------------------------------------------

/**
 * Verify that the R2 credentials and bucket are reachable.
 *
 * Call this during application startup to surface misconfigured credentials
 * before the server begins accepting requests.
 *
 * @returns `true` if the bucket is accessible, `false` otherwise
 *
 * @example
 * const ok = await testR2Connection()
 * if (!ok) process.exit(1)
 */
export async function testR2Connection(): Promise<boolean> {
  try {
    await r2Client.send(
      new HeadBucketCommand({ Bucket: r2Config.bucketName })
    )
    logger.info('R2 connection successful')
    return true
  } catch (error) {
    logger.error('R2 connection failed', error)
    return false
  }
}
