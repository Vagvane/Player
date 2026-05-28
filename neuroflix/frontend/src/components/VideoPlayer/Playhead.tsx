import type { FC } from 'react';

/**
 * Props for {@link Playhead}.
 */
export interface PlayheadProps {
  /** Current playback position as a percentage in `[0, 100]`. */
  progress: number;
  /**
   * Whether the handle should be visible. Owned by the parent
   * {@link Timeline}, which flips it on mouse-enter / long-press and
   * off again on leave / release.
   */
  show: boolean;
  /** Optional Tailwind class override appended to the dot. */
  className?: string;
}

/**
 * The draggable-looking red circle that marks the current playback
 * position on the scrub bar.
 *
 * Purely cosmetic: it doesn't capture pointer events itself
 * (`pointer-events-none`), so the parent timeline keeps owning hover
 * and click. Showing it only on hover keeps the resting scrub bar
 * clean — the line alone communicates progress, the dot communicates
 * "you can grab this."
 *
 * Hidden on mobile (`hidden md:block`): touch devices don't have a
 * hover state, and a permanent dot would just clutter the thinner
 * mobile timeline without adding affordance — taps already seek
 * directly through the parent's touch handlers.
 */
const Playhead: FC<PlayheadProps> = ({ progress, show, className }) => {
  return (
    <div
      className={`
        hidden md:block
        absolute top-1/2 -translate-y-1/2
        w-4 h-4
        bg-red-600 border-2 border-white
        rounded-full
        shadow-lg
        pointer-events-none
        transition-opacity duration-200
        ${show ? 'opacity-100' : 'opacity-0'}
        ${className || ''}
      `}
      style={{
        left: `${progress}%`,
        marginLeft: '-8px',
      }}
      aria-hidden="true"
    />
  );
};

export default Playhead;
