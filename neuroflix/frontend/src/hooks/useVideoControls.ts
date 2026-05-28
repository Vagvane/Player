import { useCallback, useEffect, type RefObject } from 'react';
import { usePlayerStore } from '../store/playerStore';

/**
 * Valid playback rate multipliers exposed in the UI.
 *
 * Kept as a literal tuple so callers can derive a union type
 * (`typeof VALID_PLAYBACK_RATES[number]`) for menu items.
 */
export const VALID_PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;
export type PlaybackRate = (typeof VALID_PLAYBACK_RATES)[number];

const SEEK_STEP_SECONDS = 5;
const VOLUME_STEP = 0.1;

export interface UseVideoControlsOptions {
  videoRef: RefObject<HTMLVideoElement>;
  /**
   * Bind global `keydown` listeners for player shortcuts.
   * Defaults to `true`; set to `false` when the hook is used inside a
   * page that owns its own keyboard routing.
   */
  enableKeyboardShortcuts?: boolean;
}

export interface UseVideoControlsResult {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolumeLevel: (level: number) => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  setPlaybackRate: (rate: number) => void;
}

/**
 * Vendor-prefixed fullscreen surface area we care about — typed loosely
 * because the standard `HTMLVideoElement` / `Document` lib doesn't include
 * the Safari-prefixed members.
 */
interface WebkitVideoElement extends HTMLVideoElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitEnterFullscreen?: () => void;
}
interface WebkitDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
}

/**
 * Imperative controls layer on top of the `<video>` element and the
 * player store.
 *
 * Each method mirrors the underlying DOM operation into the store so
 * React subscribers stay in sync — the store remains the single source
 * of truth for UI rendering, while the video element remains the source
 * of truth for playback state.
 *
 * @example
 * ```tsx
 * const videoRef = useRef<HTMLVideoElement>(null);
 * const { togglePlay, seek, toggleFullscreen } = useVideoControls({ videoRef });
 *
 * return (
 *   <>
 *     <video ref={videoRef} />
 *     <button onClick={togglePlay}>Play / Pause</button>
 *     <button onClick={() => seek(0)}>Restart</button>
 *     <button onClick={toggleFullscreen}>Fullscreen</button>
 *   </>
 * );
 * ```
 */
function useVideoControls({
  videoRef,
  enableKeyboardShortcuts = true,
}: UseVideoControlsOptions): UseVideoControlsResult {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const isFullscreen = usePlayerStore((s) => s.isFullscreen);
  const duration = usePlayerStore((s) => s.duration);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const setIsFullscreen = usePlayerStore((s) => s.setIsFullscreen);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const toggleMuteStore = usePlayerStore((s) => s.toggleMute);
  const setPlaybackRateStore = usePlayerStore((s) => s.setPlaybackRate);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const result = video.play();
    if (result && typeof result.then === 'function') {
      // play() returns a promise that rejects on autoplay/permission errors;
      // swallow it so the UI doesn't crash but keep the store in sync.
      result
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      setIsPlaying(true);
    }
  }, [videoRef, setIsPlaying]);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
  }, [videoRef, setIsPlaying]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;
      if (!Number.isFinite(time)) return;
      const max = Number.isFinite(duration) && duration > 0 ? duration : video.duration;
      const upperBound = Number.isFinite(max) && max > 0 ? max : Number.POSITIVE_INFINITY;
      const clamped = Math.min(Math.max(time, 0), upperBound);
      video.currentTime = clamped;
      setCurrentTime(clamped);
    },
    [videoRef, duration, setCurrentTime]
  );

  const setVolumeLevel = useCallback(
    (level: number) => {
      const video = videoRef.current;
      if (!video) return;
      if (!Number.isFinite(level)) return;
      const clamped = Math.min(Math.max(level, 0), 1);
      video.volume = clamped;
      if (clamped > 0 && video.muted) {
        // Restoring volume should also unmute — matches every consumer
        // video player and the store's mute flag is independent of volume.
        video.muted = false;
        if (usePlayerStore.getState().isMuted) {
          toggleMuteStore();
        }
      }
      setVolume(clamped);
    },
    [videoRef, setVolume, toggleMuteStore]
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    toggleMuteStore();
  }, [videoRef, toggleMuteStore]);

  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current as WebkitVideoElement | null;
    if (!video) return;
    const doc = document as WebkitDocument;
    const inFullscreen =
      doc.fullscreenElement !== null && doc.fullscreenElement !== undefined
        ? true
        : Boolean(doc.webkitFullscreenElement);

    if (!inFullscreen) {
      const request =
        video.requestFullscreen?.bind(video) ??
        video.webkitRequestFullscreen?.bind(video) ??
        video.webkitEnterFullscreen?.bind(video);
      if (!request) return;
      try {
        const result = request();
        if (result && typeof (result as Promise<void>).then === 'function') {
          (result as Promise<void>)
            .then(() => setIsFullscreen(true))
            .catch(() => {
              // User denied or element detached — leave store flag alone.
            });
        } else {
          setIsFullscreen(true);
        }
      } catch {
        // Some browsers throw synchronously when called outside a user gesture.
      }
    } else {
      const exit =
        doc.exitFullscreen?.bind(doc) ?? doc.webkitExitFullscreen?.bind(doc);
      if (!exit) return;
      try {
        const result = exit();
        if (result && typeof (result as Promise<void>).then === 'function') {
          (result as Promise<void>)
            .then(() => setIsFullscreen(false))
            .catch(() => {
              // Ignore — `fullscreenchange` listener (owned elsewhere) will reconcile.
            });
        } else {
          setIsFullscreen(false);
        }
      } catch {
        // Same rationale as the enter path.
      }
    }
  }, [videoRef, setIsFullscreen]);

  // `isFullscreen` from the store is intentionally unread inside
  // `toggleFullscreen` — `document.fullscreenElement` is authoritative
  // because the user can exit fullscreen via Esc without going through
  // our handler. Reference it here to keep the dep array honest.
  void isFullscreen;

  const setPlaybackRate = useCallback(
    (rate: number) => {
      const video = videoRef.current;
      if (!video) return;
      if (!(VALID_PLAYBACK_RATES as readonly number[]).includes(rate)) {
        return;
      }
      video.playbackRate = rate;
      setPlaybackRateStore(rate);
    },
    [videoRef, setPlaybackRateStore]
  );

  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore when the user is typing into an input/textarea/contenteditable —
      // otherwise Space would scrub playback while filling a form.
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
          return;
        }
      }

      switch (event.key) {
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          seek(currentTime - SEEK_STEP_SECONDS);
          break;
        case 'ArrowRight':
          event.preventDefault();
          seek(currentTime + SEEK_STEP_SECONDS);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setVolumeLevel(volume + VOLUME_STEP);
          break;
        case 'ArrowDown':
          event.preventDefault();
          setVolumeLevel(volume - VOLUME_STEP);
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enableKeyboardShortcuts,
    togglePlay,
    seek,
    setVolumeLevel,
    toggleFullscreen,
    toggleMute,
    currentTime,
    volume,
  ]);

  return {
    play,
    pause,
    togglePlay,
    seek,
    setVolumeLevel,
    toggleMute,
    toggleFullscreen,
    setPlaybackRate,
  };
}

export default useVideoControls;
