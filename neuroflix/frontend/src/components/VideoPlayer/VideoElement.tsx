import {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  type ForwardedRef,
} from 'react';
import useHLS, { type HLSLevel } from '../../hooks/useHLS';
import { usePlayerStore } from '../../store/playerStore';

/**
 * Imperative handle exposed by {@link VideoElement} via `forwardRef`.
 *
 * Parents drive playback through these methods rather than reaching
 * into the underlying `<video>` directly, so the component can swap
 * out its DOM implementation (e.g. wrap in a Shadow DOM, switch to
 * MSE-only paths) without breaking callers.
 */
export interface VideoElementRef {
  /** Begin playback. Swallows autoplay-policy rejections (logged only). */
  play: () => Promise<void>;
  /** Pause playback. No-op if the element is not yet mounted. */
  pause: () => void;
  /** Seek to an absolute time, in seconds. */
  seek: (time: number) => void;
  /** Escape hatch — returns the raw `<video>` element or `null`. */
  getVideoElement: () => HTMLVideoElement | null;
   /** Switch to a specific HLS quality level. Pass -1 for automatic ABR. */
  setLevel: (level: number) => void;
  /** Returns the array of available quality levels parsed from the manifest. */
  getLevels: () => HLSLevel[];
  /** Returns the index of the currently active quality level, or -1 for auto. */
  getCurrentLevel: () => number;
}

/**
 * Props accepted by {@link VideoElement}.
 */
export interface VideoElementProps {
  /** Signed URL to the HLS master playlist (`master.m3u8`). */
  hlsUrl: string;
  /** Fired once when the media's `duration` becomes known. */
  onLoadedMetadata: (duration: number) => void;
  /** Fired on every `timeupdate` (~250ms cadence). */
  onTimeUpdate: (currentTime: number) => void;
  /** Fired when new segments are buffered into MSE. */
  onProgress: () => void;
  /** Fired when playback reaches the end of the media. */
  onEnded: () => void;
  /** Fired for fatal playback errors (HLS or `<video>`-level). */
  onError: (error: string) => void;
  /**
   * Fired once when hls.js finishes parsing the master manifest and the
   * quality-level list becomes available. Use this instead of polling
   * `getLevels()` on a timer — it fires as soon as hls.js emits
   * `MANIFEST_PARSED`, regardless of network speed.
   */
  onManifestParsed?: (levels: HLSLevel[], currentLevel: number) => void;
  /** Optional Tailwind class override for the `<video>` element. */
  className?: string;
}

/**
 * Core `<video>` element with hls.js integration.
 *
 * Responsibilities:
 *  - Mount a single `<video>` element and attach an hls.js instance
 *    (or native Safari HLS) via the {@link useHLS} hook.
 *  - Mirror the media element's runtime state into the global
 *    {@link usePlayerStore} so controls/overlays can subscribe.
 *  - Surface lifecycle events (`loadedmetadata`, `timeupdate`,
 *    `progress`, `ended`, `error`) to the parent via callbacks.
 *  - Expose imperative `play`/`pause`/`seek` methods so parents can
 *    drive playback without prop-flipping latency.
 *
 * This component is intentionally dumb about UI: it renders only the
 * `<video>` itself, leaving overlays, control bars, and watermarks
 * to sibling components stacked above it.
 */
function VideoElement(
  props: VideoElementProps,
  ref: ForwardedRef<VideoElementRef>,
) {
  const {
    hlsUrl,
    onLoadedMetadata,
    onTimeUpdate,
    onProgress,
    onEnded,
    onError,
    onManifestParsed,
    className,
  } = props;

  const videoRef = useRef<HTMLVideoElement>(null);

  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const setBufferedRanges = usePlayerStore((s) => s.setBufferedRanges);
  const setIsBuffering = usePlayerStore((s) => s.setIsBuffering);
  const playbackRate = usePlayerStore((s) => s.playbackRate);

useEffect(() => {
  if (videoRef.current) {
    videoRef.current.playbackRate = playbackRate;
  }
}, [playbackRate]);

  const { hls, levels, currentLevel } = useHLS({
    videoRef,
    hlsUrl,
    onLoadedMetadata,
    onQualityChange: (_level) => {
      // Quality changes are reflected in the store via QualitySelector — no log needed.
    },
  });

  // Keep the latest callback in a ref so the effect below doesn't re-run
  // every time the parent re-renders and passes a fresh closure.
  const onManifestParsedRef = useRef(onManifestParsed);
  useEffect(() => {
    onManifestParsedRef.current = onManifestParsed;
  }, [onManifestParsed]);

  // Fire the manifest-parsed callback as soon as hls.js populates levels.
  // This replaces any setTimeout-based polling in the parent — we react to
  // the actual MANIFEST_PARSED event (via levels state change) rather than
  // guessing when it will have fired.
  useEffect(() => {
    if (levels.length > 0) {
      onManifestParsedRef.current?.(levels, currentLevel);
    }
  }, [levels, currentLevel]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      onLoadedMetadata(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate(video.currentTime);
    };

    const handleProgress = () => {
      setBufferedRanges(video.buffered);
      onProgress();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded();
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleCanPlay = () => setIsBuffering(false);

    const handleError = () => {
      const mediaError = video.error;
      console.error('Video element error:', mediaError);
      onError(mediaError?.message || 'Video playback error');
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [
    onLoadedMetadata,
    onTimeUpdate,
    onProgress,
    onEnded,
    onError,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setBufferedRanges,
    setIsBuffering,
  ]);

    useImperativeHandle(
    ref,
    (): VideoElementRef => ({
      play: async () => {
        try {
          await videoRef.current?.play();
        } catch (error) {
          // Autoplay policies (Chrome/Safari) reject play() until the
          // user interacts with the page — log and let the UI prompt.
          console.error('Play failed:', error);
        }
      },
      pause: () => {
        videoRef.current?.pause();
      },
      seek: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },
      getVideoElement: () => videoRef.current,
      setLevel: (level: number) => {
        if (hls) hls.currentLevel = level;
      },
      getLevels: () => levels,
      getCurrentLevel: () => currentLevel,
    }),
    [hls, levels, currentLevel],
  );
  
  return (
    <video
      ref={videoRef}
      className={className || 'w-full h-full bg-black'}
      playsInline
      preload="metadata"
      crossOrigin="anonymous"
    />
  );
}

export default forwardRef<VideoElementRef, VideoElementProps>(VideoElement);
