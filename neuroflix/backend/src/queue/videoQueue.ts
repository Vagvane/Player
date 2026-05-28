import { Queue } from 'bullmq'
import { logger } from '../utils/logger'

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
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  }
}

const videoQueue = new Queue('video-processing', {
  connection: getRedisOptions(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 604800 }
  }
})

export interface VideoJobData {
  videoId: string
  originalFilePath: string
  title: string
  userId: string
}

export async function addVideoProcessingJob(jobData: VideoJobData): Promise<string> {
  const job = await videoQueue.add('transcode', jobData, {
    jobId: jobData.videoId,
    priority: 1
  })
  logger.info(`📨 Video processing job queued: ${job.id}`)
  return job.id!
}