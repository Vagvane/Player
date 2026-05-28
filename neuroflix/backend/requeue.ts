import 'dotenv/config'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const redisConnection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

// CRITICAL: Must add error listener BEFORE any operations.
// Without this, ioredis ECONNRESET fires as an uncaught Node.js exception,
// killing the process before any queue operations complete.
redisConnection.on('error', (err: any) => {
  if (err.code !== 'ECONNRESET' && err.code !== 'ENOTFOUND') {
    console.error('Unexpected Redis error:', err.message)
  }
  // ECONNRESET = Upstash closed idle connection. ioredis reconnects automatically.
})

const videoQueue = new Queue('video-processing', { connection: redisConnection })

const STUCK_VIDEOS = [
  { videoId: '5ffd7d43-e1c4-41e9-85a7-484f34680dc3', title: 'video-1' },
  { videoId: '938c9b8a-37b8-4a5c-9c34-79e350f60329', title: 'video1' },
  { videoId: 'f5077024-4d9b-4dec-b116-dfa94b7d06ee', title: 'video-3' },
  { videoId: '6151ec71-ff01-4caf-82fc-07db2e5d6fa2', title: '7648337-hd_1920_1080_30' },
]

async function main() {
  for (const { videoId, title } of STUCK_VIDEOS) {
    const existingJob = await videoQueue.getJob(videoId)
    if (existingJob) {
      await existingJob.remove()
      console.log(`🗑️  Removed stuck job: ${videoId}`)
    }

    await videoQueue.add(
      'transcode',
      {
        videoId,
        originalFilePath: `uploads/${videoId}/original.mp4`,
        title,
        userId: 'manual-requeue'
      },
      { jobId: videoId, priority: 1 }
    )
    console.log(`✅ Queued: ${videoId}`)
  }

  console.log('🎉 All  videos re-queued!')
  await redisConnection.quit()
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Failed:', err.message)
  process.exit(1)
})