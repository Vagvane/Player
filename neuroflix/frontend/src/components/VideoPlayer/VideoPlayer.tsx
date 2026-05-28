import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FC,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import VideoElement, { type VideoElementRef } from './VideoElement';
import PlayerControls from './PlayerControls';
import Timeline from './Timeline';
import QuestionOverlay from '../Checkpoint/QuestionOverlay';
import DynamicWatermark from '../Watermark/DynamicWatermark';
import useCheckpoints from '../../hooks/useCheckpoints';
import useAutoHideControls from '../../hooks/useAutoHideControls';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import { usePlayerStore } from '../../store/playerStore';
import type { VideoMetadata } from '../../types/video';
import type { HLSLevel } from '../../hooks/useHLS';

/**
 * Props for {@link VideoPlayer}.
 */
export interface VideoPlayerProps {
  /** Player-facing metadata bundle (signed URLs, checkpoints, watermark). */
  videoData: VideoMetadata;
  /**
   * Fired after a checkpoint answer has been successfully submitted to
   * the backend. Not invoked on validation or network failures — the
   * checkpoint stays active so the viewer can retry.
   */
  onAnswerSubmitted?: (checkpointId: string, isCorrect: boolean) => void;
  /** Called when the back button in the top bar is pressed. If omitted, the button is not rendered. */
  onBack?: () => void;
  /** Optional Tailwind class override for the outer container. */
  className?: string;
}

/**
 * Top-level orchestrator for the in-app video player.
 *
 * Composition (single responsibility per child):
 *  - {@link VideoElement} owns the `<video>` element and the hls.js
 *    instance, and mirrors media events into the player store.
 *  - {@link DynamicWatermark} renders the forensic watermark layer.
 *  - {@link Timeline} renders the scrub bar, buffered ranges,
 *    checkpoint markers, and thumbnail preview tooltip.
 *  - {@link PlayerControls} renders the bottom control bar
 *    (play/pause, volume, time, fullscreen).
 *  - {@link QuestionOverlay} renders the interactive checkpoint UI
 *    when the playhead crosses a not-yet-answered question.
 *
 * Stacking (lowest → highest `z-index`):
 *  | Layer              | z-index | Notes                                |
 *  | ------------------ | ------- | ------------------------------------ |
 *  | `<video>`          | `z-0`   | base layer, owns the pixels          |
 *  | Watermark          | `z-10`  | drifts over the video, no input      |
 *  | Buffering spinner  | `z-20`  | dim scrim + spinner during stalls    |
 *  | Timeline           | `z-30`  | scrub bar, sibling to controls       |
 *  | PlayerControls     | `z-30`  | bottom chrome, same plane as timeline |
 *  | QuestionOverlay    | `z-40`  | modal — must occlude controls/chrome |
 *
 * Ref topology:
 *  - `videoElementRef` is the imperative handle exposed by
 *    {@link VideoElement}; it gives the container click-to-toggle and
 *    seek operations.
 *  - `htmlVideoRef` carries the raw `HTMLVideoElement` so the lower-
 *    level hooks (`useCheckpoints`, `useKeyboardShortcuts`) and the
 *    `PlayerControls` leaves can drive playback directly without going
 *    through the imperative handle. We sync it on mount once
 *    `useImperativeHandle` has attached.
 *  - `containerRef` is the fullscreen target — the outer `<div>` so
 *    overlays scale with the video instead of being clipped.
 *
 * Responsive layout:
 *  - Mobile: 100% width, locked 16:9 via `aspect-video`.
 *  - Desktop: capped at `max-w-7xl` (~1280px), centered with `mx-auto`.
 *  - Fullscreen (any breakpoint): native browser fullscreen scales the
 *    container to the viewport; on mobile the OS handles landscape.
 */
const VideoPlayer: FC<VideoPlayerProps> = ({
  videoData,
  onAnswerSubmitted,
  onBack,
  className,
}) => {
  const videoElementRef = useRef<VideoElementRef>(null);
  // Bridge ref carrying the raw <video> so the hooks/leaves that need
  // an HTMLVideoElement ref (not our imperative handle) can wire in.
  const htmlVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { hlsUrl, thumbnailVttUrl, checkpoints, watermark, title } = videoData;

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const storeDuration = usePlayerStore((s) => s.duration);
  // Use the metadata duration as a fallback until the HLS manifest loads.
  // Without this, duration stays 0 for the first 1–2 s, which prevents the
  // thumbnail preview and checkpoint markers from working during that window.
  const duration = storeDuration > 0 ? storeDuration : videoData.duration;
  const bufferedRanges = usePlayerStore((s) => s.bufferedRanges);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const setBufferedRanges = usePlayerStore((s) => s.setBufferedRanges);

  // Display-only error surfaced from the underlying <video> or hls.js.
  // Network errors get a retry affordance; fatal errors get a plain
  // message. Cleared the next time the user retries playback.
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Quality level state — populated once hls.js parses the manifest.
  const [qualityLevels, setQualityLevels] = useState<HLSLevel[]>([]);
  const [currentQualityLevel, setCurrentQualityLevel] = useState<number>(-1);

  // Delayed-unmount state so the checkpoint overlay can fade out
  // before being removed from the DOM.
  const [overlayCheckpoint, setOverlayCheckpoint] = useState<typeof activeCheckpoint>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);

    // Once the VideoElement mounts and attaches its imperative handle,
  // forward the raw <video> into htmlVideoRef so the dependent hooks
  // and PlayerControls leaves see a real element.
  useEffect(() => {
    htmlVideoRef.current = videoElementRef.current?.getVideoElement() ?? null;
  }, []);

  // Sync quality levels after hls.js has had time to parse the manifest.
  // 2.5s covers slow connections; a faster machine will have levels by 1s.
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = videoElementRef.current;
      if (!el) return;
      setQualityLevels(el.getLevels());
      setCurrentQualityLevel(el.getCurrentLevel());
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleSetLevel = useCallback((level: number) => {
    videoElementRef.current?.setLevel(level);
    setCurrentQualityLevel(level);
  }, []);

  const { activeCheckpoint, handleAnswer, isSubmitting: checkpointSubmitting, submitError, wrongAnswer } = useCheckpoints({
    checkpoints,
    currentTime,
    videoRef: htmlVideoRef,
    onAnswerSubmitted,
  });

    useEffect(() => {
    if (activeCheckpoint) {
      setOverlayCheckpoint(activeCheckpoint);
      setOverlayVisible(true);
    } else {
      setOverlayVisible(false);
      const timer = setTimeout(() => setOverlayCheckpoint(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [activeCheckpoint]);


  const { showControls } = useAutoHideControls({ isPlaying });

  // The keyboard layer is the single owner of global shortcuts —
  // every leaf calls useVideoControls with shortcuts disabled to
  // avoid duplicate handlers. Suspended while a checkpoint is up so
  // Space/Arrow keys don't seek behind the modal.
  useKeyboardShortcuts(htmlVideoRef, !activeCheckpoint);

  const onLoadedMetadata = useCallback(
    (dur: number) => {
      setDuration(dur);
      if (videoData.resumeTime && videoData.resumeTime > 0) {
        videoElementRef.current?.seek(videoData.resumeTime);
      }
    },
    [setDuration, videoData.resumeTime],
  );

  const onTimeUpdate = useCallback(
    (time: number) => {
      setCurrentTime(time);
    },
    [setCurrentTime],
  );

  const onProgress = useCallback(() => {
    const video = videoElementRef.current?.getVideoElement();
    setBufferedRanges(video?.buffered ?? null);
  }, [setBufferedRanges]);

  const onEnded = useCallback(() => {
    // Reaching the end isn't an error — leave any prior error cleared.
    // A future "next video" or "replay" flow can hook in here; for now
    // we let the controls remain visible (isPlaying flips off, so
    // useAutoHideControls keeps them shown automatically).
    setPlaybackError(null);
  }, []);

  const onError = useCallback((error: string) => {
    // eslint-disable-next-line no-console
    console.error('Video error:', error);
    setPlaybackError(error);
  }, []);

  const handleRetry = useCallback(() => {
    setPlaybackError(null);
    // Re-issue play — useHLS already re-attempts segment fetches on
    // network errors; this just nudges <video> to resume once the
    // error toast is dismissed.
    void videoElementRef.current?.play();
  }, []);

  const handleSeek = useCallback((time: number) => {
    videoElementRef.current?.seek(time);
  }, []);

  /**
   * Toggle play/pause when the user clicks the container chrome —
   * but only the empty area. Clicks that bubble up from controls,
   * the overlay, or any interactive child must be ignored, else
   * pressing Play would immediately pause again.
   */
  const handleContainerClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (activeCheckpoint) return;
      const target = event.target as Node;
      const isContainerHit =
        target === containerRef.current ||
        target === videoElementRef.current?.getVideoElement();
      if (!isContainerHit) return;

      if (isPlaying) {
        videoElementRef.current?.pause();
      } else {
        void videoElementRef.current?.play();
      }
    },
    [activeCheckpoint, isPlaying],
  );

  return (
    <div
      ref={containerRef}
      className={`
        relative w-full max-w-7xl mx-auto
        aspect-video
        bg-[#141414] rounded-lg overflow-hidden
        shadow-2xl
        ${className || ''}
      `}
      onClick={handleContainerClick}
    >
      {/* Layer 0 — the <video> element itself; everything else stacks on top. */}
      <VideoElement
        ref={videoElementRef}
        hlsUrl={hlsUrl}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onProgress={onProgress}
        onEnded={onEnded}
        onError={onError}
      />

      {/* Layer 30 — top gradient + title bar. Fades in with controls. */}
      <div
        className={`
          absolute top-0 left-0 right-0 z-30
          bg-gradient-to-b from-black via-black/50 to-transparent
          px-4 pt-4 pb-16
          transition-opacity duration-300
          ${showControls && !activeCheckpoint ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="
                w-9 h-9 flex items-center justify-center
                rounded-full text-white
                hover:bg-white/20 transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-white/50
                shrink-0
              "
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h2 className="text-white font-semibold text-base md:text-lg truncate drop-shadow-md">
            {title}
          </h2>
        </div>
      </div>

      {/* Layer 8 — large center play button. Fades in when paused, out when
          playing. pointer-events-none so clicks fall through to the video
          element and are caught by handleContainerClick on the outer div. */}
      <div
        className={`
          absolute inset-0 z-[8]
          flex items-center justify-center
          pointer-events-none
          transition-opacity duration-300
          ${!isPlaying && !activeCheckpoint && !isBuffering ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <div
          className="
            w-24 h-24
            rounded-full
            bg-black/40 backdrop-blur-sm
            flex items-center justify-center
            ring-2 ring-white/25
            shadow-2xl
          "
        >
          <svg
            className="w-12 h-12 text-white ml-1.5"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Layer 10 — forensic watermark; drifts over the video, no input. */}
      <DynamicWatermark
        email={watermark.email}
        organization={watermark.organization}
      />

      {/* Layer 20 — buffering scrim + spinner during MSE stalls. */}
      {isBuffering && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 pointer-events-none">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Layer 20 — playback error toast with retry. Sits on the same
          plane as the spinner since the two states are mutually exclusive. */}
      {playbackError && (
        <div className="absolute inset-x-0 top-4 z-20 mx-auto w-fit max-w-[90%] rounded-md bg-red-600/90 px-4 py-2 text-white shadow-lg">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium">Playback error:</span>
            <span className="opacity-90">{playbackError}</span>
            <button
              type="button"
              onClick={handleRetry}
              className="ml-2 rounded bg-white/20 px-2 py-0.5 text-xs font-semibold hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Layer 30 — scrub bar. Hidden while a checkpoint occupies the
          screen so the viewer cannot skip past the question. */}
      <Timeline
        currentTime={currentTime}
        duration={duration}
        bufferedRanges={bufferedRanges}
        checkpoints={checkpoints}
        thumbnailVttUrl={thumbnailVttUrl}
        show={showControls && !activeCheckpoint}
        onSeek={handleSeek}
      />

      {/* Layer 30 — bottom control bar. Same hiding rule as the timeline. */}
      <PlayerControls
        show={showControls && !activeCheckpoint}
        videoRef={htmlVideoRef}
        containerRef={containerRef}
        qualityLevels={qualityLevels}
        currentQualityLevel={currentQualityLevel}
        onSetLevel={handleSetLevel}
      />

      {/* Layer 40 — checkpoint modal. Highest layer because it must
          intercept input from every control beneath it. */}
      {overlayCheckpoint && (
        <QuestionOverlay
          checkpoint={overlayCheckpoint}
          onAnswer={handleAnswer}
          isSubmitting={checkpointSubmitting}
          submitError={submitError}
          wrongAnswer={wrongAnswer}
          visible={overlayVisible}
        />
      )}
    </div>
  );
};

export default VideoPlayer;
