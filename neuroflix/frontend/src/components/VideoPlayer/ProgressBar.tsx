import type { FC } from 'react';

/**
 * Props for {@link ProgressBar}.
 */
export interface ProgressBarProps {
  /**
   * Playback progress as a percentage in `[0, 100]`. Values outside
   * this range are clamped so a transient out-of-range readout (e.g.
   * from a stale `currentTime` after a seek past the end) cannot push
   * the fill bar beyond the track.
   */
  progress: number;
  /** Optional Tailwind class override appended to the fill bar. */
  className?: string;
}

/**
 * The red fill bar layered on top of the scrub track to indicate how
 * much of the media has been played.
 *
 * Rendered as a single absolutely-positioned `<div>` whose width is
 * driven by inline style. Stays `pointer-events-none` so it never
 * intercepts the parent {@link Timeline}'s hover / click handlers —
 * the bar is purely visual.
 *
 * The `bg-red-600` token resolves to Tailwind's default red (close to
 * the Netflix `#e50914` brand red); override via `className` if a
 * pixel-perfect brand match is required.
 *
 * `will-change: width` hints the compositor to promote the element
 * to its own layer so the per-frame width animation driven by
 * `timeupdate` doesn't trigger layout on every tick.
 */
const ProgressBar: FC<ProgressBarProps> = ({ progress, className }) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div
      className={`
        absolute top-0 left-0 h-full
        bg-[#e50914]
        rounded-full
        pointer-events-none
        transition-[width] duration-100 ease-linear
        ${className || ''}
      `}
      style={{ width: `${clampedProgress}%`, willChange: 'width' }}
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
    />
  );
};

export default ProgressBar;
