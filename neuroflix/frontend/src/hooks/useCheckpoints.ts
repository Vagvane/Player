import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import checkpointService from '../services/checkpointService';
import { PLAYER_CONFIG } from '../utils/constants';
import type { Checkpoint } from '../types/checkpoint';

export interface UseCheckpointsOptions {
  checkpoints: Checkpoint[];
  currentTime: number;
  videoRef: RefObject<HTMLVideoElement>;
  /**
   * Fired once a submission has succeeded. Not called on validation or
   * network failure — the hook keeps the checkpoint active in that case
   * so the viewer can retry.
   */
  onAnswerSubmitted?: (checkpointId: string, isCorrect: boolean) => void;
}

export interface UseCheckpointsResult {
  activeCheckpoint: Checkpoint | null;
  isSubmitting: boolean;
  submitError: string | null;
  /** `true` after a submission that returned `isCorrect: false`. Cleared when the user retries. */
  wrongAnswer: boolean;
  handleAnswer: (answerIndex: number) => Promise<void>;
  resetCheckpoints: () => void;
  completedCount: number;
}

/**
 * Drive inline multiple-choice checkpoints during video playback.
 *
 * Watches `currentTime` against the checkpoint list; when the playhead
 * crosses within {@link PLAYER_CONFIG.checkpointThreshold} of a not-yet-
 * answered checkpoint, the hook:
 *   1. Pauses the underlying `<video>` element.
 *   2. Records `answerStartTime` so we can report time-on-question.
 *   3. Surfaces the active checkpoint to the UI via `activeCheckpoint`.
 *
 * On {@link handleAnswer}, the answer is POSTed via `checkpointService`.
 * On success, the checkpoint id is added to the local completion set,
 * the active checkpoint is cleared, and playback resumes. On failure,
 * the active checkpoint and start time are *preserved* so the viewer
 * can retry without losing their question state.
 *
 * Completion is tracked per-instance via a `Set<string>`; call
 * {@link resetCheckpoints} when switching videos or restarting a video
 * so the new run isn't blocked by stale completions.
 *
 * @example
 * ```tsx
 * const { activeCheckpoint, handleAnswer, isSubmitting } = useCheckpoints({
 *   checkpoints,
 *   currentTime,
 *   videoRef,
 *   onAnswerSubmitted: (id, ok) => analytics.track('checkpoint', { id, ok }),
 * });
 *
 * return activeCheckpoint ? (
 *   <CheckpointModal
 *     checkpoint={activeCheckpoint}
 *     disabled={isSubmitting}
 *     onSelect={handleAnswer}
 *   />
 * ) : null;
 * ```
 */
function useCheckpoints({
  checkpoints,
  currentTime,
  videoRef,
  onAnswerSubmitted,
}: UseCheckpointsOptions): UseCheckpointsResult {
  const [activeCheckpoint, setActiveCheckpoint] = useState<Checkpoint | null>(null);
  const [completedCheckpointIds, setCompletedCheckpointIds] = useState<Set<string>>(
    () => new Set()
  );
  const [answerStartTime, setAnswerStartTime] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [wrongAnswer, setWrongAnswer] = useState<boolean>(false);

  // Keep the latest callback in a ref so the trigger effect doesn't
  // re-run every time the parent passes a new closure.
  const onAnswerSubmittedRef = useRef(onAnswerSubmitted);
  useEffect(() => {
    onAnswerSubmittedRef.current = onAnswerSubmitted;
  }, [onAnswerSubmitted]);

  // Mirror the active checkpoint into a ref so the trigger effect can
  // read it without subscribing — avoids the loop where firing the
  // trigger changes the dep that re-runs the trigger.
  const activeCheckpointRef = useRef<Checkpoint | null>(activeCheckpoint);
  useEffect(() => {
    activeCheckpointRef.current = activeCheckpoint;
  }, [activeCheckpoint]);

  useEffect(() => {
    if (activeCheckpointRef.current) return;
    if (!checkpoints || checkpoints.length === 0) return;

    const threshold = PLAYER_CONFIG.checkpointThreshold;
    for (const checkpoint of checkpoints) {
      if (completedCheckpointIds.has(checkpoint.id)) continue;
      if (Math.abs(checkpoint.timestamp - currentTime) >= threshold) continue;

      videoRef.current?.pause();
      setActiveCheckpoint(checkpoint);
      setAnswerStartTime(Date.now());
      setSubmitError(null);
      setWrongAnswer(false);
      break;
    }
  }, [currentTime, checkpoints, completedCheckpointIds, videoRef]);

  const handleAnswer = useCallback(
    async (answerIndex: number): Promise<void> => {
      const checkpoint = activeCheckpoint;
      if (!checkpoint) return;
      if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
        setSubmitError(`Invalid answer index: ${answerIndex}`);
        return;
      }
      if (isSubmitting) return;

      const startedAt = answerStartTime ?? Date.now();
      const timeSpentSeconds = Math.round((Date.now() - startedAt) / 1000);

      setIsSubmitting(true);
      setSubmitError(null);
      setWrongAnswer(false);

      try {
        const { isCorrect } = await checkpointService.submitAnswer(
          checkpoint.id, answerIndex, timeSpentSeconds, checkpoint.videoId,
        );

        if (isCorrect) {
          // Correct answer — close the overlay and resume playback.
          setCompletedCheckpointIds((prev) => {
            const next = new Set(prev);
            next.add(checkpoint.id);
            return next;
          });
          setActiveCheckpoint(null);
          setAnswerStartTime(null);

          const video = videoRef.current;
          if (video) {
            const result = video.play();
            if (result && typeof result.then === 'function') {
              result.catch(() => {});
            }
          }
          onAnswerSubmittedRef.current?.(checkpoint.id, true);
        } else {
          // Wrong answer — keep the overlay open so the viewer must retry.
          setWrongAnswer(true);
          onAnswerSubmittedRef.current?.(checkpoint.id, false);
        }
      } catch (err) {
        console.error('useCheckpoints: failed to submit answer', err);
        const message =
          err instanceof Error ? err.message : 'Failed to submit answer';
        setSubmitError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [activeCheckpoint, answerStartTime, isSubmitting, videoRef]
  );

  const resetCheckpoints = useCallback(() => {
    setCompletedCheckpointIds(new Set());
    setActiveCheckpoint(null);
    setAnswerStartTime(null);
    setSubmitError(null);
    setIsSubmitting(false);
    setWrongAnswer(false);
  }, []);

  return {
    activeCheckpoint,
    isSubmitting,
    submitError,
    wrongAnswer,
    handleAnswer,
    resetCheckpoints,
    completedCount: completedCheckpointIds.size,
  };
}

export default useCheckpoints;
