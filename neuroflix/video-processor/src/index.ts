/**
 * Neuroflix Video Processor - Main Entry Point
 *
 * Starts the BullMQ worker and initialises all required resources:
 * - Verifies FFmpeg installation
 * - Creates temp / output directories
 * - Loads environment variables
 * - Starts the video processing worker
 */

import 'dotenv/config'
import { verifyFFmpegInstallation, initializeDirectories } from './config/ffmpeg.config'
import { shutdownWorker } from './queue/worker'
import { logger } from './utils/logger'

/**
 * Bootstrap the video processor service
 */
async function main(): Promise<void> {
  logger.info('🚀 Starting Neuroflix Video Processor...')

  // 1. Verify FFmpeg is available
  const ffmpegOk = verifyFFmpegInstallation()
  if (!ffmpegOk) {
    logger.error('❌ FFmpeg not found. Run `npm run download:ffmpeg` or place ffmpeg.exe / ffprobe.exe in ./ffmpeg/bin/')
    process.exit(1)
  }

  // 2. Ensure temp & output directories exist
  initializeDirectories()

  // 3. The worker is already listening (imported above); just confirm it is running
  logger.info('✅ Video processing worker is running')
  logger.info(`   Queue  : video-processing`)
  logger.info(`   Redis  : ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`)
  logger.info(`   Backend: ${process.env.BACKEND_API_URL || 'http://localhost:3001/api/v1'}`)
  logger.info('⏳ Waiting for jobs...')
}

// Graceful shutdown on unhandled errors
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught exception:', error)
  shutdownWorker().finally(() => process.exit(1))
})

process.on('unhandledRejection', (reason) => {
  logger.error('💥 Unhandled promise rejection:', reason)
  shutdownWorker().finally(() => process.exit(1))
})

main().catch((error) => {
  logger.error('❌ Failed to start video processor:', error)
  process.exit(1)
})
