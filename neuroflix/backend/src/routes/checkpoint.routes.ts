/**
 * Checkpoint Routes
 *
 * Defines all routes related to video checkpoints (quiz questions)
 * including fetching checkpoint questions for a video, submitting answers,
 * and retrieving a user's answer history with statistics.
 *
 * Base path: /api/v1/checkpoints
 */

import { Router } from 'express'
import {
  getCheckpoints,
  submitCheckpointAnswer,
  getUserCheckpointAnswers
} from '../controllers/checkpoint.controller'
import { authenticate } from '../middleware/auth.middleware'
import { submitAnswerValidation } from '../middleware/validator.middleware'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

/**
 * @route   GET /api/checkpoints/video/:videoId
 * @desc    Get all checkpoint questions for a given video.
 *          Correct answers are stripped from the response so they cannot
 *          be inspected by the client before submission.
 * @access  Public
 * @param   videoId {string} - ID of the video whose checkpoints to fetch
 * @returns { success: true, data: { checkpoints } }
 */
router.get(
  '/video/:videoId',
  asyncHandler(getCheckpoints)
)

/**
 * @route   POST /api/checkpoints/answer
 * @desc    Submit an answer to a checkpoint question.
 *          The server looks up the correct answer, evaluates the submission,
 *          persists the result, and returns whether the answer was correct.
 * @access  Private (requires valid JWT Bearer token)
 * @headers Authorization: Bearer <token>
 * @body    { videoId: UUID, checkpointId: string, answer: 0-3, timeSpent?: number }
 * @returns { success: true, message: string, data: { isCorrect, correctAnswer, userAnswer, savedAnswer } }
 */
router.post(
  '/answer',
  authenticate,
  submitAnswerValidation,
  asyncHandler(submitCheckpointAnswer)
)

/**
 * @route   GET /api/checkpoints/user/:videoId
 * @desc    Retrieve all of the authenticated user's submitted answers for a
 *          specific video, along with aggregate statistics (total, correct,
 *          incorrect, percentage score).
 * @access  Private (requires valid JWT Bearer token)
 * @param   videoId {string} - ID of the video to fetch answer history for
 * @headers Authorization: Bearer <token>
 * @returns { success: true, data: { answers, stats: { total, correct, incorrect, percentage } } }
 */
router.get(
  '/user/:videoId',
  authenticate,
  asyncHandler(getUserCheckpointAnswers)
)

export default router
