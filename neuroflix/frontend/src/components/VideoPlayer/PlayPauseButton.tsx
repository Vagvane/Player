import type { FC, RefObject } from 'react';
import useVideoControls from '../../hooks/useVideoControls';
import { usePlayerStore } from '../../store/playerStore';

/**
 * Props for {@link PlayPauseButton}.
 *
 * The spec'd "no props" shape can't actually drive playback — a leaf
 * button has no way to reach the real `<video>` element without
 * either a ref handed down by the parent or a Context provider.
 * We pick the former: keep the surface tiny and let the parent
 * thread a single ref through.
 */
export interface PlayPauseButtonProps {
  /** Ref to the `<video>` element owned by `VideoElement`. */
  videoRef: RefObject<HTMLVideoElement>;
}

/**
 * Inline SVG — play triangle. `fill="currentColor"` so the icon
 * inherits the button's text color and respects hover/focus states.
 */
const PlayIcon: FC = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

/** Inline SVG — pause (two bars). */
const PauseIcon: FC = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
  </svg>
);

/**
 * Round button that toggles play / pause for the active video.
 *
 * State comes from {@link usePlayerStore} (the `isPlaying` flag is
 * kept in sync by `VideoElement`'s media-event listeners), and the
 * actual transport call goes through {@link useVideoControls} so the
 * `<video>` element and the store stay in lockstep — including the
 * autoplay-policy promise-rejection path.
 *
 * Sizing: 44×44px on mobile (meets the Apple HIG minimum touch-target
 * guideline) and 48×48px from `md:` up.
 *
 * @example
 * ```tsx
 * const videoRef = useRef<HTMLVideoElement>(null);
 * <PlayPauseButton videoRef={videoRef} />
 * ```
 */
const PlayPauseButton: FC<PlayPauseButtonProps> = ({ videoRef }) => {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const { togglePlay } = useVideoControls({ videoRef, enableKeyboardShortcuts: false });

  return (
    <button
      type="button"
      onClick={togglePlay}
      aria-label={isPlaying ? 'Pause' : 'Play'}
      aria-pressed={isPlaying}
      className="
        w-11 h-11 md:w-12 md:h-12
        flex items-center justify-center
        rounded-full
        hover:bg-white/20
        text-white
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-white/50
      "
    >
      {isPlaying ? <PauseIcon /> : <PlayIcon />}
    </button>
  );
};

export default PlayPauseButton;
