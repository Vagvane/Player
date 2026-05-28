import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FC,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import ProgressBar from './ProgressBar';
import BufferBar from './BufferBar';
import CheckpointMarkers from './CheckpointMarkers';
import ThumbnailPreview from './ThumbnailPreview';
import Playhead from './Playhead';
import useThumbnails from '../../hooks/useThumbnails';
import { formatTime } from '../../utils/formatTime';
import type { Checkpoint } from '../../types/checkpoint';

/**
 * Props for {@link Timeline}.
 */
export interface TimelineProps {
  /** Current playhead position, in seconds. */
  currentTime: number;
  /** Total media duration, in seconds. May be `0` before metadata loads. */
  duration: number;
  /** Currently-buffered ranges from the `<video>` element, or `null`. */
  bufferedRanges: TimeRanges | null;
  /** Checkpoint markers to overlay on the scrub bar. */
  checkpoints: Checkpoint[];
  /** Signed URL to the WebVTT thumbnail-sprite track. */
  thumbnailVttUrl: string;
  /** Show/hide the timeline. Driven by the parent's auto-hide controller. */
  show: boolean;
  /** Invoked with the new playback time (in seconds) when the user seeks. */
  onSeek: (time: number) => void;
}

/**
 * Mobile touch hover requires a long-press hold of this many milliseconds
 * before the thumbnail preview appears. Below this threshold a touch is
 * treated as a tap (i.e. a seek), matching native iOS/Android scrubber
 * conventions.
 */
const LONG_PRESS_MS = 500;

/**
 * Cross-platform timer handle.
 *
 * `NodeJS.Timeout` (as the spec suggests) only resolves when `@types/node`
 * is in scope; in a strict browser project it isn't, so we read the return
 * type off `setTimeout` itself and stay platform-agnostic.
 */
type TimerHandle = ReturnType<typeof setTimeout>;

/**
 * Compute a `[0, 1]` fraction along the timeline for a pointer's
 * `clientX` value. Clamped so out-of-bounds drags (which fire when the
 * pointer leaves the strip while the button is held) don't seek beyond
 * the media.
 */
function fractionFromClientX(rect: DOMRect, clientX: number): number {
  if (rect.width <= 0) return 0;
  const raw = (clientX - rect.left) / rect.width;
  return Math.max(0, Math.min(1, raw));
}

/**
 * The video player's scrub bar.
 *
 * Layered visuals (back to front):
 *  1. `BufferBar`         — gray fill showing buffered ranges.
 *  2. `CheckpointMarkers` — yellow dots marking checkpoint timestamps.
 *  3. `ProgressBar`       — red fill from `0` to the current playhead.
 *  4. `Playhead`          — red circle handle, shown only on hover.
 *
 * Pointer interactions:
 *  - Desktop: mouse-enter reveals the playhead; mouse-move updates the
 *    thumbnail preview cue; click seeks to the pointer's timestamp.
 *  - Mobile: a long-press (≥ 500ms) reveals the thumbnail preview and
 *    lets the user drag to scrub. A short tap seeks immediately. This
 *    mirrors the native iOS/Android scrubber gesture set so the touch
 *    target doubles as both a "seek to here" affordance and a
 *    "preview before committing" affordance.
 *
 * The component is stateless about playback — it never mutates the
 * `<video>` element itself. It reports the user's intent up via the
 * `onSeek` callback and lets the parent decide how to apply it.
 */
const Timeline: FC<TimelineProps> = ({
  currentTime,
  duration,
  bufferedRanges,
  checkpoints,
  thumbnailVttUrl,
  show,
  onSeek,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);

  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [hoverTime, setHoverTime] = useState<number>(0);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // Pending long-press timer for touch input. Kept in a ref (not state)
  // because flipping it would re-render the timeline on every tap, and
  // we never read it from JSX.
  const longPressTimerRef = useRef<TimerHandle | null>(null);

  const { getThumbnailForTime } = useThumbnails(thumbnailVttUrl);

  const progressPercent =
    duration > 0 ? (currentTime / duration) * 100 : 0;

  /**
   * Translate a pointer position into a seek time + tooltip anchor, then
   * publish both as state. Shared between mouse-move and touch-move so
   * the hover preview tracks both input types identically.
   */
  const updateHoverFromPoint = useCallback(
    (clientX: number) => {
      if (!timelineRef.current || duration <= 0) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const fraction = fractionFromClientX(rect, clientX);
      setHoverTime(fraction * duration);
      setHoverPosition({ x: clientX, y: rect.top });
    },
    [duration],
  );

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      updateHoverFromPoint(e.clientX);
    },
    [updateHoverFromPoint],
  );

  const handleClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current || duration <= 0) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const fraction = fractionFromClientX(rect, e.clientX);
      onSeek(fraction * duration);
    },
    [duration, onSeek],
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  // Long-press gesture detection on touch surfaces.
  //
  // We capture the initial touch coordinates synchronously and replay
  // them when the timer fires, because (a) the React TouchEvent object
  // may have moved on by the time the timer resolves, and (b) the
  // spec's `if (!isHovering) return` guard in handleTouchMove would
  // otherwise eat the very first frame — `setIsHovering(true)` is
  // asynchronous, so isHovering is still `false` on the next call.
  const handleTouchStart = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      const touch = e.touches[0];
      if (!touch) return;
      const startClientX = touch.clientX;

      const timer = setTimeout(() => {
        setIsHovering(true);
        updateHoverFromPoint(startClientX);
      }, LONG_PRESS_MS);

      longPressTimerRef.current = timer;
    },
    [updateHoverFromPoint],
  );

  const handleTouchMove = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      if (!isHovering) return;
      const touch = e.touches[0];
      if (!touch) return;
      updateHoverFromPoint(touch.clientX);
    },
    [isHovering, updateHoverFromPoint],
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsHovering(false);
  }, []);

  // Belt-and-suspenders cleanup: if the component unmounts mid-press
  // (e.g. the parent hides the player while the user is still holding),
  // the pending timer would otherwise fire against an unmounted tree.
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const thumbnail = getThumbnailForTime(hoverTime);

  return (
    <div
      className={`
        absolute bottom-14 left-0 right-0 z-30
        px-4
        transition-opacity duration-300
        ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}
    >
      {/* Mobile gets a thicker (h-2) strip for a forgiving touch target;
          desktop sits at h-1 and grows to h-3 on hover. */}
      <div
        ref={timelineRef}
        className="
          relative h-2 md:h-1
          bg-white/20 rounded-full
          cursor-pointer
          hover:h-3
          transition-all duration-150
          group
        "
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        aria-valuenow={currentTime}
        aria-valuetext={formatTime(currentTime)}
      >
        <BufferBar bufferedRanges={bufferedRanges} duration={duration} />

        <CheckpointMarkers checkpoints={checkpoints} duration={duration} />

        <ProgressBar progress={progressPercent} />

        <Playhead progress={progressPercent} show={isHovering} />
      </div>

      {isHovering && thumbnail && (
        <ThumbnailPreview
          thumbnail={thumbnail}
          position={hoverPosition}
          time={formatTime(hoverTime)}
        />
      )}
    </div>
  );
};

export default Timeline;
