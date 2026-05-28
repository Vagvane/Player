/**
 * An inline multiple-choice question that pauses playback at a specific
 * timestamp within a video. Used to gate progress and reinforce learning.
 */
export interface Checkpoint {
  /** Stable UUID identifier for the checkpoint. */
  id: string;
  /** UUID of the video this checkpoint belongs to. */
  videoId: string;
  /** Playback time (in seconds) at which the question should appear. */
  timestamp: number;
  /** Prompt shown to the viewer. */
  question: string;
  /** Exactly four answer choices, presented in display order. */
  options: [string, string, string, string];
  /** Zero-based index (0–3) into {@link Checkpoint.options} marking the correct choice. */
  correctAnswer: number;
  /** Optional rationale revealed after the viewer answers. */
  explanation?: string;
}

/**
 * A persisted record of a single viewer's response to a {@link Checkpoint}.
 *
 * One row is written per submitted answer; analytics and progress gating
 * read from this table.
 */
export interface CheckpointAnswer {
  /** Stable UUID identifier for this answer record. */
  id: string;
  /** UUID of the viewer who submitted the answer. */
  userId: string;
  /** UUID of the video the checkpoint belongs to (denormalized for query speed). */
  videoId: string;
  /** UUID of the checkpoint that was answered. */
  checkpointId: string;
  /** Zero-based index (0–3) of the option the viewer selected. */
  answer: number;
  /** Whether {@link CheckpointAnswer.answer} matched the checkpoint's correctAnswer. */
  isCorrect: boolean;
  /** Time the viewer spent on the question, in seconds. Omitted if not measured. */
  timeSpent?: number;
  /** Timestamp at which the answer was submitted. */
  answeredAt: Date;
}
