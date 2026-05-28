/**
 * Prisma Seed File
 * ----------------
 * Populates the database with test data for development and testing.
 *
 * Run with:  npx prisma db seed
 *
 * ⚠️  WARNING: This script CLEARS all existing data before seeding.
 *              Never run this against a production database!
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

// ---------------------------------------------------------------------------
// Prisma client instance
// A single instance is sufficient for the seed script — no hot-reload concern.
// ---------------------------------------------------------------------------
const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function main() {
  console.log('🌱 Seeding database...')

  // -------------------------------------------------------------------------
  // Step 1: Clear existing data
  // Delete in reverse-dependency order to avoid FK constraint violations:
  //   CheckpointAnswer → VideoProgress → Video → User
  // -------------------------------------------------------------------------
  await prisma.checkpointAnswer.deleteMany()
  await prisma.videoProgress.deleteMany()
  await prisma.video.deleteMany()
  await prisma.user.deleteMany()

  console.log('✅ Cleared existing data')

  // -------------------------------------------------------------------------
  // Step 2: Create test users
  // Both users share the same hashed password ("password123") for convenience.
  // bcrypt.hash(password, saltRounds) — 10 rounds is the recommended default.
  // -------------------------------------------------------------------------
  const hashedPassword = await bcrypt.hash('password123', 10)

  /**
   * Regular test user — used to verify standard viewing & progress flows.
   */
  const user1 = await prisma.user.create({
    data: {
      email: 'test@neuroflix.com',
      password: hashedPassword,       // Never store plain text passwords
      organization: 'Neuroflix Test Org',
      firstName: 'Test',
      lastName: 'User'
    }
  })

  /**
   * Admin user — represents an organisational administrator.
   */
  const user2 = await prisma.user.create({
    data: {
      email: 'admin@neuroflix.com',
      password: hashedPassword,
      organization: 'Neuroflix',
      firstName: 'Admin',
      lastName: 'User'
    }
  })

  console.log('✅ Created test users')
  console.log(`   • ${user1.email} (id: ${user1.id})`)
  console.log(`   • ${user2.email} (id: ${user2.id})`)

  // -------------------------------------------------------------------------
  // Step 3: Create test videos
  // These reference R2 object keys (paths), NOT full URLs.
  // Paths follow the convention:  videos/<video-id>/<filename>
  // fileSize uses BigInt because JS numbers can't safely represent > 2^53 bytes.
  // duration / originalDuration are in seconds (frontend converts to MM:SS).
  // -------------------------------------------------------------------------

  /**
   * Video 1 – already processed (status: READY) with all HLS artefacts.
   */
  const video1 = await prisma.video.create({
    data: {
      title: 'Introduction to Video Streaming',
      description:
        'Learn the fundamentals of video streaming, including HLS, adaptive bitrate, and CDN delivery.',
      duration: 180,                                         // 3 minutes
      status: 'READY',
      originalFilename: 'intro-streaming.mp4',
      hlsPath: 'videos/test-video-1/master.m3u8',           // R2 object key
      thumbnailVttPath: 'videos/test-video-1/thumbnails.vtt',
      spritePath: 'videos/test-video-1/sprite.jpg',
      fileSize: BigInt(15_000_000),                          // ~15 MB
      originalDuration: 180,
      processedAt: new Date()
    }
  })

  /**
   * Video 2 – also READY; slightly shorter, different topic.
   */
  const video2 = await prisma.video.create({
    data: {
      title: 'Content Delivery Networks Explained',
      description:
        'Understanding how CDNs work and why they are essential for video delivery at scale.',
      duration: 120,                                         // 2 minutes
      status: 'READY',
      originalFilename: 'cdn-explained.mp4',
      hlsPath: 'videos/sample-video-2/master.m3u8',
      thumbnailVttPath: 'videos/sample-video-2/thumbnails.vtt',
      spritePath: 'videos/sample-video-2/sprite.jpg',
      fileSize: BigInt(12_000_000),                          // ~12 MB
      originalDuration: 120,
      processedAt: new Date()
    }
  })

  console.log('✅ Created test videos')
  console.log(`   • "${video1.title}" (id: ${video1.id})`)
  console.log(`   • "${video2.title}" (id: ${video2.id})`)

  // -------------------------------------------------------------------------
  // Step 4: Create video progress for user1
  // @@unique([userId, videoId]) ensures one row per user/video combination.
  // currentTime is in seconds; completed=false means the user is mid-watch.
  // -------------------------------------------------------------------------
  await prisma.videoProgress.create({
    data: {
      userId: user1.id,
      videoId: video1.id,
      currentTime: 45,   // 45 seconds into the video
      completed: false
    }
  })

  console.log('✅ Created video progress')
  console.log(`   • ${user1.email} → "${video1.title}" @ 45s`)

  // -------------------------------------------------------------------------
  // Final summary
  // -------------------------------------------------------------------------
  console.log('')
  console.log('🎉 Seeding complete!')
  console.log('')
  console.log('Test credentials:')
  console.log('  Email:    test@neuroflix.com')
  console.log('  Email:    admin@neuroflix.com')
  console.log('  Password: password123')
}

// ---------------------------------------------------------------------------
// Run the seed function
// .catch() ensures a non-zero exit code on failure (important for CI).
// .finally() always disconnects the Prisma client to free DB connections.
// ---------------------------------------------------------------------------
main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    console.log('🔌 Database connection closed')
  })
