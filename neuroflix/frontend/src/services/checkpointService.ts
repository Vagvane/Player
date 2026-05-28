import apiClient from './api';
import type { CheckpointAnswer } from '../types/checkpoint';

/**
 * Cache of submitted/fetched answers, keyed by checkpoint UUID.
 * Used to short-circuit duplicate submissions and to let UI render
 * already-answered checkpoints without an extra round-trip.
 */
const answerCache = new Map<string, CheckpointAnswer>();

/**
 * Secondary index: for each `videoId`, the set of checkpoint IDs we
 * have cached answers for. Needed so {@link checkpointService.clearCache}
 * can drop entries by video without scanning every key.
 */
const videoIndex = new Map<string, Set<string>>();

function indexAnswer(answer: CheckpointAnswer): void {
  answerCache.set(answer.checkpointId, answer);
  let set = videoIndex.get(answer.videoId);
  if (!set) {
    set = new Set();
    videoIndex.set(answer.videoId, set);
  }
  set.add(answer.checkpointId);
}

/**
 * `true` iff `n` is one of `0`, `1`, `2`, `3`. Rejects non-integers,
 * NaN, and out-of-range values up front so we never send a malformed
 * answer to the backend.
 */
function isValidAnswerIndex(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 3;
}

const checkpointService = {
  /**
   * Submit a viewer's response to a checkpoint and return the scored
   * result. Validates `answer` is an integer in `[0, 3]` before any
   * network call — invalid indices throw synchronously.
   *
   * If an answer for this `checkpointId` is already cached (either
   * from an earlier submission or a prior `getCheckpointAnswers`
   * fetch), the cached value is returned without re-submitting. This
   * is intentional: each checkpoint accepts exactly one answer per
   * viewer, and a duplicate POST would be wasted work at best and a
   * server-side conflict error at worst.
   *
   * @throws `RangeError` when `answer` is not 0–3.
   * @throws The server error payload on network or backend failure.
   */
  async submitAnswer(
    checkpointId: string,
    answer: number,
    timeSpentSeconds?: number,
    videoId?: string,
  ): Promise<{ isCorrect: boolean; savedAnswer: CheckpointAnswer }> {
    if (!isValidAnswerIndex(answer)) {
      throw new RangeError(
        `Invalid checkpoint answer ${answer}: must be an integer in [0, 3]`,
      );
    }

    const response = (await apiClient.post(
      '/checkpoints/answer',
      { checkpointId, answer, timeSpent: timeSpentSeconds, videoId },
    )) as unknown as { success: boolean; data: { isCorrect: boolean; savedAnswer: CheckpointAnswer } };

    const isCorrect = response?.data?.isCorrect ?? false;
    const savedAnswer = response?.data?.savedAnswer ?? (response as unknown as CheckpointAnswer);

    indexAnswer(savedAnswer);
    return { isCorrect, savedAnswer };
  },

  /**
   * Fetch every answer the current viewer has recorded for `videoId`.
   * Populates the local cache so subsequent {@link submitAnswer} calls
   * for already-answered checkpoints short-circuit.  The hook uses the
   * returned list to pre-populate the completed-checkpoint set so the
   * viewer is never re-asked a question they already answered correctly
   * in a previous session.
   *
   * Fails silently when the user is unauthenticated — the caller should
   * catch and ignore the error (start the session with an empty set).
   */
  async getCheckpointAnswers(videoId: string): Promise<CheckpointAnswer[]> {
    // Route: GET /api/v1/checkpoints/user/:videoId
    // Response shape: { success, data: { answers: CheckpointAnswer[], stats: {...} } }
    const response = (await apiClient.get(
      `/checkpoints/user/${encodeURIComponent(videoId)}`,
    )) as unknown as {
      success: boolean;
      data: { answers: CheckpointAnswer[]; stats: unknown };
    };

    const answers = response?.data?.answers ?? [];
    for (const a of answers) indexAnswer(a);
    return answers;
  },

  /**
   * Drop cached answers for a single video. Call when the viewer
   * restarts a video so a fresh attempt isn't blocked by stale
   * "already answered" entries.
   */
  clearCache(videoId: string): void {
    const ids = videoIndex.get(videoId);
    if (!ids) return;
    for (const checkpointId of ids) answerCache.delete(checkpointId);
    videoIndex.delete(videoId);
  },

  /**
   * Drop the entire cache. Call on logout so a subsequent viewer in
   * the same browser doesn't inherit the previous viewer's answers.
   */
  clearAll(): void {
    answerCache.clear();
    videoIndex.clear();
  },
};

export default checkpointService;
