import type { FC } from 'react';
import { formatTime } from '../../utils/formatTime';

/**
 * Props for {@link TimeDisplay}.
 */
export interface TimeDisplayProps {
  /**
   * Current playhead position in seconds. Non-finite, negative, or
   * `NaN` values are normalized to `0` by {@link formatTime}.
   */
  current: number;
  /**
   * Total media duration in seconds. `0` is the canonical "not yet
   * loaded" sentinel — both halves render as `00:00` in that case.
   */
  total: number;
  /** Optional Tailwind class override appended to the container. */
  className?: string;
}

/**
 * Read-only "MM:SS / MM:SS" (or "HH:MM:SS / HH:MM:SS") readout for
 * the player control bar.
 *
 * Layout uses `font-mono` so digits have fixed advance widths — the
 * current-time half ticks up once a second without nudging the rest
 * of the control bar sideways.
 *
 * Edge cases (all collapse to `00:00 / 00:00` for the affected half):
 *  - `total === 0` (duration not yet loaded) → both halves zero, so
 *    we don't briefly show a real playhead against an unknown total.
 *  - `current > total` → current is clamped to `total` to avoid
 *    visually overshooting near the end of a video.
 *  - `NaN` / `Infinity` / negative → handled inside `formatTime`.
 *
 * @example
 * ```tsx
 * <TimeDisplay current={65} total={3661} />
 * // renders: 01:05 / 01:01:01
 * ```
 */
const TimeDisplay: FC<TimeDisplayProps> = ({ current, total, className }) => {
  // Treat an unknown duration (still loading metadata) as "no time yet"
  // so we don't render "00:42 / 00:00" while the manifest streams in.
  const hasTotal = Number.isFinite(total) && total > 0;
  const safeTotal = hasTotal ? total : 0;
  const safeCurrent = hasTotal
    ? Math.min(Math.max(current, 0), safeTotal)
    : 0;

  const currentFormatted = formatTime(safeCurrent);
  const totalFormatted = formatTime(safeTotal);

  return (
    <div
      className={`
        flex items-center gap-1
        text-white text-sm font-mono
        select-none
        ${className || ''}
      `}
      role="timer"
      aria-label={`${currentFormatted} of ${totalFormatted}`}
    >
      <span className="text-white">{currentFormatted}</span>
      <span className="text-gray-400">/</span>
      <span className="text-gray-400">{totalFormatted}</span>
    </div>
  );
};

export default TimeDisplay;
