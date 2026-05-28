import { useCallback, useEffect, useRef, useState } from 'react';
import { PLAYER_CONFIG } from '../utils/constants';

/**
 * Cross-environment timer handle. In a browser `setTimeout` returns a
 * `number`; under `@types/node` it returns `NodeJS.Timeout`. Letting TS
 * infer it keeps both build configurations happy.
 */
type TimerHandle = ReturnType<typeof setTimeout>;

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'touchstart',
  'touchmove',
  'keydown',
] as const;

/**
 * Minimum interval (ms) between activity-event handlings.
 *
 * `mousemove` and `touchmove` can fire dozens of times per second.
 * Without throttling, every wiggle would tear down and recreate the
 * hide timer — wasted work, and on lower-end devices it shows up as
 * jank during the very moments the user is interacting with the player.
 * 100 ms is short enough to feel instant and long enough to coalesce
 * a continuous gesture into ~10 calls/second.
 */
const ACTIVITY_THROTTLE_MS = 100;

export interface UseAutoHideControlsOptions {
  isPlaying: boolean;
  /** Override the default 3-second idle window. */
  delay?: number;
}

export interface UseAutoHideControlsResult {
  showControls: boolean;
  /**
   * Force the controls to be visible and restart the idle timer. Useful
   * when a non-activity event (e.g. checkpoint dismiss, error toast)
   * should bring the chrome back without simulating a mouse move.
   */
  resetTimeout: () => void;
}

/**
 * Show video chrome on user activity and fade it out after a quiet
 * window during playback.
 *
 * Behavior:
 * - While paused, controls stay visible — fading them when the user is
 *   not actively watching would make it harder to resume.
 * - On activity (mouse move, pointer down, touch, key press) the
 *   controls reappear and the idle timer resets.
 * - After `delay` ms of no activity *while playing*, controls hide.
 * - Activity events are throttled to one handling per
 *   {@link ACTIVITY_THROTTLE_MS} so a long continuous `mousemove` does
 *   not churn React state at the event-stream rate.
 *
 * @example
 * ```tsx
 * const { showControls } = useAutoHideControls({ isPlaying });
 * return <ControlBar className={showControls ? 'visible' : 'hidden'} />;
 * ```
 */
function useAutoHideControls({
  isPlaying,
  delay = PLAYER_CONFIG.autoHideControlsDelay,
}: UseAutoHideControlsOptions): UseAutoHideControlsResult {
  const [showControls, setShowControls] = useState<boolean>(true);
  const timeoutRef = useRef<TimerHandle | null>(null);
  const lastActivityRef = useRef<number>(0);

  // Mirror `isPlaying` into a ref so the throttled handler reads the
  // latest value without rebinding listeners every time playback toggles.
  const isPlayingRef = useRef<boolean>(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const clearHideTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetTimeout = useCallback(() => {
    clearHideTimer();
    setShowControls(true);
    if (isPlayingRef.current) {
      timeoutRef.current = setTimeout(() => {
        setShowControls(false);
        timeoutRef.current = null;
      }, delay);
    }
  }, [clearHideTimer, delay]);

  useEffect(() => {
    if (!isPlaying) {
      // Paused / ended — make sure chrome is visible and no stale timer
      // is queued to hide it on the next render.
      clearHideTimer();
      setShowControls(true);
      return;
    }

    // Just entered playback: start the idle countdown immediately so
    // controls fade even if the user never moves the pointer.
    resetTimeout();

    const handleActivity = (): void => {
      const now = Date.now();
      if (now - lastActivityRef.current < ACTIVITY_THROTTLE_MS) return;
      lastActivityRef.current = now;
      resetTimeout();
    };

    for (const eventName of ACTIVITY_EVENTS) {
      // `passive: true` on touchmove/mousemove so we never accidentally
      // block scrolling or the browser's gesture pipeline — we only read
      // event timing, never call preventDefault.
      document.addEventListener(eventName, handleActivity, { passive: true });
    }

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        document.removeEventListener(eventName, handleActivity);
      }
      clearHideTimer();
    };
  }, [isPlaying, delay, resetTimeout, clearHideTimer]);

  // Final safety net: clear any in-flight timer if the host component
  // unmounts mid-countdown (the per-effect cleanup above usually
  // handles it, but this guards against effect-order edge cases).
  useEffect(() => {
    return () => clearHideTimer();
  }, [clearHideTimer]);

  return { showControls, resetTimeout };
}

export default useAutoHideControls;
