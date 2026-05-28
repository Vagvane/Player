/**
 * @file worker.ts
 * @description BullMQ worker for video processing jobs.
 * Picks up jobs from the 'video-processing' queue and orchestrates
 * the full transcoding pipeline via processVideo().
 *
 * Run standalone with: tsx src/queue/worker.ts
 */
import 'dotenv/config'

import { Worker, Job } from 'bullmq'
import { redisConnection, VideoJobData } from './queue.config'
import { processVideo } from '../processor/video.processor'
import { logger } from '../utils/logger'

/**
 * Video processing worker
 *
 * Configuration:
 * - concurrency: 1  — Only one video processed at a time (FFmpeg is CPU/memory intensive)
 * - limiter.max: 1  — Rate-limited to 1 job per second to avoid Redis flooding
 *
 * The worker processor function receives a BullMQ Job containing VideoJobData
 * and delegates all work to processVideo(). If processVideo() throws, BullMQ
 * will automatically retry the job up to the configured `attempts` limit
 * (defined in queue.config.ts defaultJobOptions).
 */
export const videoWorker = new Worker<VideoJobData>(
  'video-processing',
  async (job: Job<VideoJobData>) => {
    logger.info(`🔄 Processing job: ${job.id}`)

    try {
      // Delegate to the main processing orchestrator
      const result = await processVideo(job.data)

      logger.info(`✅ Job completed: ${job.id}`)
      return result
    } catch (error) {
      logger.error(`❌ Job failed: ${job.id}`, error)
      // Re-throw so BullMQ marks the job as failed and triggers retry logic
      throw error
    }
  },
  {
    connection: redisConnection,
    concurrency: 1,       // Process 1 video at a time (resource intensive)
    limiter: {
      max: 1,             // Max 1 job
      duration: 1000      // per second
    }
  }
)

// ---------------------------------------------------------------------------
// Worker event handlers
// ---------------------------------------------------------------------------

/**
 * Fired when a job finishes successfully.
 * BullMQ passes the completed Job instance.
 */
videoWorker.on('completed', (job) => {
  logger.info(`✅ Job ${job.id} completed successfully`)
})

/**
 * Fired when a job fails (after all retry attempts are exhausted,
 * or immediately on the first failure if attempts === 1).
 * `job` may be undefined in rare edge cases, so we guard against it.
 */
videoWorker.on('failed', (job, error) => {
  if (job) {
    logger.error(`❌ Job ${job.id} failed:`, error)
  }
})

/**
 * Fired on unexpected Redis/connection errors in the worker itself.
 * Does not correspond to job-level failures.
 */
videoWorker.on('error', (error) => {
  logger.error('❌ Worker error:', error)
})

/**
 * Fired when a worker picks up a job and starts processing it.
 * Useful for monitoring and dashboards.
 */
videoWorker.on('active', (job) => {
  logger.info(`🔄 Job ${job.id} started processing`)
})

/**
 * Fired when a job is detected as stalled (worker crashed mid-processing).
 * BullMQ will automatically re-queue the job for retry.
 * @param jobId - The ID of the stalled job
 */
videoWorker.on('stalled', (jobId) => {
  logger.warn(`⚠️  Job ${jobId} stalled`)
})

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

/**
 * Graceful shutdown handler
 *
 * Waits for the currently active job (if any) to finish before closing.
 * This prevents abrupt termination mid-transcode which could corrupt output files.
 *
 * Called automatically on SIGTERM (Docker/Kubernetes stop) and SIGINT (Ctrl+C).
 */
export async function shutdownWorker(): Promise<void> {
  logger.info('🛑 Shutting down worker...')

  try {
    // videoWorker.close() waits for the active job to complete before closing
    await videoWorker.close()
    logger.info('✅ Worker shut down gracefully')
  } catch (error) {
    logger.error('❌ Worker shutdown error:', error)
  }
}

// Register OS signal handlers for graceful shutdown
process.on('SIGTERM', shutdownWorker)
process.on('SIGINT', shutdownWorker)
