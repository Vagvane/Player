import { Queue, QueueOptions } from 'bullmq'
import { logger } from '../utils/logger'

/**
 * Parse the Redis connection URL into a plain options object.
 * IMPORTANT: BullMQ Queue and Worker must NOT share a single IORedis instance.
 * A shared instance causes the Worker's blocking BLPOP command to hog the
 * connection, preventing Queue commands from executing, resulting in constant
 * ECONNRESET loops. Returning a plain options object lets BullMQ create its
 * own separate connections for each consumer.
 */
function getRedisOptions() {
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL)
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      tls: url.protocol === 'rediss:' ? {} : undefined,
      maxRetriesPerRequest: null as null,
      enableReadyCheck: false,
    }
  }
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  }
}

export const redisConnection = getRedisOptions()

const queueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      age: 86400,
      count: 100
    },
    removeOnFail: {
      age: 604800
    }
  }
}

export const videoQueue = new Queue('video-processing', queueOptions)

logger.info('✅ Video processing queue initialized')

export interface VideoJobData {
  videoId: string
  originalFilePath: string
  title: string
  userId: string
}

export async function addVideoProcessingJob(jobData: VideoJobData): Promise<string> {
  try {
    const job = await videoQueue.add('transcode', jobData, {
      jobId: jobData.videoId,
      priority: 1
    })
    logger.info(`📨 Video processing job queued: ${job.id}`)
    return job.id!
  } catch (error) {
    logger.error('Failed to add video processing job:', error)
    throw error
  }
}

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