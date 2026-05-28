import type { FC, RefObject } from 'react';
import useFullscreen from '../../hooks/useFullscreen';

/**
 * Props for {@link FullscreenButton}.
 */
export interface FullscreenButtonProps {
  /**
   * Ref to the element that should enter fullscreen. Typically the
   * outer player container so overlays (controls, captions, watermark)
   * scale with the `<video>` instead of being left behind in the page.
   *
   * On iOS Safari, only `<video>` elements can enter fullscreen — if
   * you need iOS coverage, pass a video ref here instead.
   */
  containerRef: RefObject<HTMLDivElement>;
}

/** "Enter fullscreen" — four outward-pointing corners. */
const EnterFullscreenIcon: FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
  </svg>
);

/** "Exit fullscreen" — four inward-pointing corners. */
const ExitFullscreenIcon: FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
  </svg>
);

/**
 * Button that toggles fullscreen for the player container.
 *
 * Browser support is delegated to {@link useFullscreen}, which probes
 * unprefixed, `webkit`, `moz`, and `ms` flavors of the Fullscreen API.
 * If none are available the hook returns `isSupported: false` and the
 * button renders nothing — there's no useful UX for "click to do
 * nothing." Modern Chromium, Firefox, Edge, and desktop Safari all
 * support fullscreen on arbitrary elements; iOS Safari only supports
 * it on `<video>` directly.
 *
 * Keyboard: the `F` key shortcut is owned by `useVideoControls` at
 * the player root (see [PROMPT 2.1.2]), so we deliberately don't
 * register a duplicate keydown listener here. `Esc` exits fullscreen
 * via the browser's native handling; `useFullscreen` reconciles via
 * `fullscreenchange` regardless of how the user left.
 *
 * On mobile, tapping the button enters native device fullscreen and
 * the OS handles landscape orientation hints.
 */
const FullscreenButton: FC<FullscreenButtonProps> = ({ containerRef }) => {
  const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen(containerRef);

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      aria-pressed={isFullscreen}
      className="
        w-9 h-9
        flex items-center justify-center
        rounded-full
        text-white hover:bg-white/20
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-white/50
      "
    >
      {isFullscreen ? <ExitFullscreenIcon /> : <EnterFullscreenIcon />}
    </button>
  );
};

export default FullscreenButton;
