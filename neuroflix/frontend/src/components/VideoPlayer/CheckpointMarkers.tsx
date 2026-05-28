import type { FC } from 'react';
import { formatTime } from '../../utils/formatTime';
import type { Checkpoint } from '../../types/checkpoint';

/**
 * Props for {@link CheckpointMarkers}.
 */
export interface CheckpointMarkersProps {
  /** Checkpoints owned by the active video, in any order. */
  checkpoints: Checkpoint[];
  /** Total media duration, in seconds. `0` while metadata is loading. */
  duration: number;
  /** Optional Tailwind class override appended to each marker dot. */
  className?: string;
}

/**
 * Yellow dots laid over the scrub bar to signal where the viewer will
 * be stopped for an interactive checkpoint question.
 *
 * The dots are purely informational — they're `pointer-events-none`
 * so the parent {@link Timeline}'s seek/hover handlers fire even when
 * the cursor lands on a marker. Their `title` exposes the timestamp
 * so a hover (or assistive-tech tooltip) names the location without
 * spoiling the question.
 *
 * Sizing nudges up slightly on mobile (`w-3`/`h-3` vs `w-2.5`/`h-2.5`)
 * so the markers stay legible on smaller scrub bars where the rest of
 * the timeline is also thicker.
 */
const CheckpointMarkers: FC<CheckpointMarkersProps> = ({
  checkpoints,
  duration,
  className,
}) => {
  if (duration <= 0 || checkpoints.length === 0) return null;

  return (
    <>
      {checkpoints.map((checkpoint) => {
        // Drop markers that fall outside the actual media — happens
        // when a checkpoint outlives a re-encode that shortened the
        // clip. Rendering them would push the dot off the bar and
        // confuse the layout calculation in the parent.
        if (
          checkpoint.timestamp < 0 ||
          checkpoint.timestamp > duration
        ) {
          return null;
        }

        const position = (checkpoint.timestamp / duration) * 100;

        return (
          <div
            key={checkpoint.id}
            className={`
              absolute top-1/2 -translate-y-1/2
              w-3 h-3 md:w-2.5 md:h-2.5
              bg-[#FFD700]
              rounded-full
              pointer-events-none
              shadow-lg
              z-10
              ${className || ''}
            `}
            style={{ left: `${position}%`, marginLeft: '-6px' }}
            title={`Question at ${formatTime(checkpoint.timestamp)}`}
          />
        );
      })}
    </>
  );
};

export default CheckpointMarkers;
