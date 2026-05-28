/**
 * @file checkpoint.controller.ts
 * @description Checkpoint controller for retrieving quiz questions and handling answer submission.
 * Correct answers are never exposed to the client until after a submission is made,
 * preventing answer farming via the API.
 */

import { Request, Response } from 'express'
import {
  getCheckpointsForVideo,
  submitAnswer,
  getUserAnswers,
  loadCheckpoints
} from '../services/checkpoint.service'
import { logger } from '../utils/logger'
import { ApiError } from '../middleware/errorHandler.middleware'

/**
 * Get all checkpoints for a video
 * GET /api/checkpoints/video/:videoId
 *
 * @param req - Express request with videoId route param
 * @param res - Express response
 * @returns 200 with checkpoint list (correct answers stripped)
 *
 * @remarks
 * Correct answers are intentionally omitted from the response.
 * They are only revealed after the user submits an answer via POST /api/checkpoints/answer.
 */
export async function getCheckpoints(req: Request, res: Response): Promise<void> {
  try {
    const { videoId } = req.params

    // Retrieve checkpoints with correct answers removed for the client
    const checkpoints = await getCheckpointsForVideo(videoId)

    res.status(200).json({
      success: true,
      data: { checkpoints }
    })
  } catch (error) {
    logger.error('Failed to get checkpoints', error)
    throw error
  }
}

/**
 * Submit an answer to a checkpoint question
 * POST /api/checkpoints/answer
 *
 * @param req - Express request with body: { videoId, checkpointId, answer, timeSpent? }
 * @param res - Express response
 * @returns 200 with correctness result, the correct answer, and the persisted record
 * @throws ApiError.unauthorized if not authenticated
 * @throws ApiError.notFound if the checkpoint does not exist for the given video
 *
 * @remarks
 * The correct answer is loaded server-side from the JSON config and never trusted from the client.
 * The result (including the correct answer) is only disclosed after the answer has been recorded.
 */
export async function submitCheckpointAnswer(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Not authenticated')
    }

    const { videoId, checkpointId, answer, timeSpent } = req.body

    // Load full checkpoint data (including correct answer) server-side
    const checkpoints = await loadCheckpoints(videoId)
    const checkpoint = checkpoints.find(cp => cp.id === checkpointId)

    if (!checkpoint) {
      throw ApiError.notFound('Checkpoint not found')
    }

    const correctAnswer = checkpoint.correctAnswer
    const isCorrect = answer === correctAnswer

    // Persist the answer record in the database
    const savedAnswer = await submitAnswer({
      userId: req.user.userId,
      videoId,
      checkpointId,
      answer,
      correctAnswer,
      timeSpent
    })

    logger.info(
      `Checkpoint answer submitted: user=${req.user.userId}, checkpoint=${checkpointId}, correct=${isCorrect}`
    )

    // Reveal the correct answer only after the submission has been recorded
    res.status(200).json({
      success: true,
      message: isCorrect ? 'Correct answer!' : 'Incorrect answer',
      data: {
        isCorrect,
        correctAnswer,
        userAnswer: answer,
        savedAnswer
      }
    })
  } catch (error) {
    logger.error('Failed to submit answer', error)
    throw error
  }
}

/**
 * Get all of the authenticated user's answers for a specific video
 * GET /api/checkpoints/user/:videoId
 *
 * @param req - Express request with videoId route param
 * @param res - Express response
 * @returns 200 with answer list and computed statistics (total, correct, incorrect, percentage)
 * @throws ApiError.unauthorized if not authenticated
 *
 * @remarks
 * Statistics are computed in-memory from the answer records to avoid additional DB queries.
 * When no answers exist yet, all stat values return 0.
 */
export async function getUserCheckpointAnswers(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Not authenticated')
    }

    const { videoId } = req.params

    const answers = await getUserAnswers(req.user.userId, videoId)

    // Compute summary statistics from the returned records
    const total = answers.length
    const correct = answers.filter(a => a.isCorrect).length
    const incorrect = total - correct
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0

    res.status(200).json({
      success: true,
      data: {
        answers,
        stats: {
          total,
          correct,
          incorrect,
          percentage
        }
      }
    })
  } catch (error) {
    logger.error('Failed to get user answers', error)
    throw error
  }
}
