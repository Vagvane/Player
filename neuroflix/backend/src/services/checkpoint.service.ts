/**
 * Checkpoint Service
 *
 * Manages quiz checkpoints that pause a video and ask the viewer a question.
 * Checkpoint definitions are stored in a JSON configuration file (not the
 * database) so they can be edited without a schema migration.  User answers
 * and statistics ARE persisted to the database via Prisma.
 *
 * Security note: `correctAnswer` values are intentionally stripped before
 * returning checkpoint data to API consumers – answers are verified
 * server-side only.
 */

import prisma from '../config/database'
import { logger } from '../utils/logger'
import fs from 'fs/promises'
import path from 'path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single checkpoint question as stored in checkpoints.json.
 * `correctAnswer` is the 0-based index of the correct option.
 */
interface CheckpointQuestion {
  /** Unique identifier for this checkpoint (e.g. "cp-1") */
  id: string
  /** Video timestamp (seconds) at which the player pauses */
  timestamp: number
  /** Question text displayed to the viewer */
  question: string
  /** Answer choices – typically 4 items (indices 0–3) */
  options: string[]
  /** 0-based index of the correct option – NEVER sent to the client */
  correctAnswer: number
}

/**
 * Shape of a single entry in checkpoints.json.
 */
interface VideoCheckpoints {
  /** Must match the Video.id stored in the database */
  videoId: string
  checkpoints: CheckpointQuestion[]
}

/**
 * Payload required to record a user's answer.
 */
export interface SubmitAnswerData {
  userId: string
  videoId: string
  checkpointId: string
  /** 0-based index of the option selected by the user */
  answer: number
  /** 0-based index of the correct option (resolved server-side) */
  correctAnswer: number
  /** Time in seconds the user spent on the question (optional) */
  timeSpent?: number
}

// ---------------------------------------------------------------------------
// JSON data loading
// ---------------------------------------------------------------------------

/**
 * Load all checkpoint questions for a given video from the JSON config file.
 *
 * The file is read from `<cwd>/src/config/checkpoints.json`.  The function
 * returns an empty array (and logs a warning) when no entry exists for the
 * supplied `videoId` – callers should treat this as "no checkpoints" rather
 * than an error.
 *
 * @param videoId - The video's UUID to look up
 * @returns Array of `CheckpointQuestion` objects (may be empty)
 * @throws Error if the JSON file cannot be read or parsed
 *
 * @example
 * const questions = await loadCheckpoints('550e8400-e29b-41d4-a716-446655440000')
 */
export async function loadCheckpoints(videoId: string): Promise<CheckpointQuestion[]> {
  try {
    const checkpointsPath = path.join(process.cwd(), 'src', 'config', 'checkpoints.json')

    const fileContent = await fs.readFile(checkpointsPath, 'utf-8')
    const allCheckpoints: VideoCheckpoints[] = JSON.parse(fileContent)

    const videoCheckpoints = allCheckpoints.find(vc => vc.videoId === videoId)

    if (!videoCheckpoints) {
      logger.warn(`No checkpoints found for video: ${videoId}`)
      return []
    }

    return videoCheckpoints.checkpoints
  } catch (error) {
    logger.error('Failed to load checkpoints', error)
    throw new Error(`Failed to load checkpoints: ${error}`)
  }
}

// ---------------------------------------------------------------------------
// Client-facing checkpoint retrieval
// ---------------------------------------------------------------------------

/**
 * Get checkpoint questions for a video with `correctAnswer` removed.
 *
 * This is the safe version to return from API endpoints – the correct answer
 * index is stripped so the client cannot read it from the response payload.
 * Answer verification always happens server-side (see `verifyAnswer`).
 *
 * @param videoId - UUID of the video
 * @returns Array of checkpoints without the `correctAnswer` field
 * @throws Re-throws any file-system or parse errors from `loadCheckpoints`
 *
 * @example
 * const checkpoints = await getCheckpointsForVideo(videoId)
 * // Each item has: id, timestamp, question, options  (no correctAnswer)
 */
export async function getCheckpointsForVideo(
  videoId: string
): Promise<Omit<CheckpointQuestion, 'correctAnswer'>[]> {
  try {
    const checkpoints = await loadCheckpoints(videoId)

    // Destructure away correctAnswer before returning to callers
    return checkpoints.map(({ correctAnswer, ...checkpoint }) => checkpoint)
  } catch (error) {
    logger.error('Failed to get checkpoints for video', error)
    throw error
  }
}

// ---------------------------------------------------------------------------
// Answer verification
// ---------------------------------------------------------------------------

/**
 * Verify whether a user's answer is correct for a specific checkpoint.
 *
 * Loads the checkpoint list for the video and compares the supplied answer
 * index against the stored `correctAnswer`.  This is called by the submit
 * flow to determine `isCorrect` before persisting the record.
 *
 * @param videoId      - UUID of the video that owns the checkpoint
 * @param checkpointId - ID of the specific checkpoint question
 * @param answer       - 0-based index of the user's selected option
 * @returns `true` if the answer is correct, `false` otherwise
 * @throws Error if the checkpoint ID is not found for the given video
 *
 * @example
 * const correct = await verifyAnswer(videoId, 'cp-1', 2)
 */
export async function verifyAnswer(
  videoId: string,
  checkpointId: string,
  answer: number
): Promise<boolean> {
  try {
    const checkpoints = await loadCheckpoints(videoId)
    const checkpoint = checkpoints.find(cp => cp.id === checkpointId)

    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`)
    }

    return checkpoint.correctAnswer === answer
  } catch (error) {
    logger.error('Answer verification failed', error)
    throw error
  }
}

// ---------------------------------------------------------------------------
// Answer persistence
// ---------------------------------------------------------------------------

/**
 * Record a user's answer to a checkpoint question in the database.
 *
 * `isCorrect` is derived by comparing `data.answer` with `data.correctAnswer`
 * rather than trusting a client-supplied flag.  The caller is responsible for
 * resolving `correctAnswer` via `verifyAnswer` or `loadCheckpoints` before
 * invoking this function.
 *
 * @param data - Answer submission payload (userId, videoId, checkpointId,
 *               answer, correctAnswer, optional timeSpent)
 * @returns The newly created `CheckpointAnswer` database record
 * @throws Re-throws any Prisma or unexpected errors
 *
 * @example
 * const record = await submitAnswer({
 *   userId, videoId,
 *   checkpointId: 'cp-1',
 *   answer: 2,
 *   correctAnswer: 2,
 *   timeSpent: 15
 * })
 */
export async function submitAnswer(data: SubmitAnswerData) {
  try {
    // Derive correctness server-side – never trust a client-provided flag
    const isCorrect = data.answer === data.correctAnswer

    const answer = await prisma.checkpointAnswer.create({
      data: {
        userId: data.userId,
        videoId: data.videoId,
        checkpointId: data.checkpointId,
        answer: data.answer,
        isCorrect,
        timeSpent: data.timeSpent
      }
    })

    logger.info(
      `Answer submitted: user=${data.userId}, checkpoint=${data.checkpointId}, correct=${isCorrect}`
    )

    return answer
  } catch (error) {
    logger.error('Answer submission failed', error)
    throw error
  }
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Retrieve all answers submitted by a user for a specific video's checkpoints.
 *
 * Results are ordered chronologically (oldest first) so the caller can
 * reconstruct the progression through checkpoints.
 *
 * @param userId  - UUID of the user
 * @param videoId - UUID of the video
 * @returns Array of `CheckpointAnswer` records ordered by `answeredAt` ASC
 * @throws Re-throws any unexpected database errors
 *
 * @example
 * const answers = await getUserAnswers(userId, videoId)
 * const passed = answers.every(a => a.isCorrect)
 */
export async function getUserAnswers(userId: string, videoId: string) {
  try {
    return await prisma.checkpointAnswer.findMany({
      where: { userId, videoId },
      orderBy: { answeredAt: 'asc' }
    })
  } catch (error) {
    logger.error('Failed to get user answers', error)
    throw error
  }
}

/**
 * Compute aggregate statistics for a single checkpoint across all users.
 *
 * Useful for instructors or analytics dashboards to identify questions where
 * learners are consistently struggling.
 *
 * @param checkpointId - ID of the checkpoint to aggregate (e.g. "cp-1")
 * @returns Object with:
 *   - `totalAttempts`     – total number of recorded answers
 *   - `correctAnswers`    – count of correct answers
 *   - `correctPercentage` – rounded percentage of correct answers (0–100)
 *   - `averageTimeSpent`  – rounded mean seconds spent answering (0 if none recorded)
 * @throws Re-throws any unexpected database errors
 *
 * @example
 * const stats = await getCheckpointStats('cp-1')
 * console.log(`${stats.correctPercentage}% of users answered correctly`)
 */
export async function getCheckpointStats(checkpointId: string) {
  try {
    const answers = await prisma.checkpointAnswer.findMany({
      where: { checkpointId }
    })

    const total = answers.length
    const correct = answers.filter(a => a.isCorrect).length
    const correctPercentage = total > 0 ? (correct / total) * 100 : 0

    // Guard against NaN when total is 0
    const avgTimeSpent =
      total > 0
        ? answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / total
        : 0

    return {
      totalAttempts: total,
      correctAnswers: correct,
      correctPercentage: Math.round(correctPercentage),
      averageTimeSpent: Math.round(avgTimeSpent)
    }
  } catch (error) {
    logger.error('Failed to get checkpoint stats', error)
    throw error
  }
}
