import { useEffect, useRef, useState, type RefObject } from 'react';
import Hls, { type Level, type ErrorData } from 'hls.js';
import { HLS_CONFIG } from '../utils/constants';

/**
 * Subset of {@link Level} surfaced to consumers — the manifest fields the
 * quality UI actually renders.
 */
export interface HLSLevel {
  height: number;
  bitrate: number;
}

export interface UseHLSResult {
  hls: Hls | null;
  isSupported: boolean;
  currentLevel: number;
  levels: HLSLevel[];
  error: string | null;
}

export interface UseHLSOptions {
  videoRef: RefObject<HTMLVideoElement>;
  hlsUrl: string;
  onLoadedMetadata?: (duration: number) => void;
  onQualityChange?: (level: number) => void;
}

/**
 * Attach an hls.js player (or native Safari HLS) to a `<video>` element and
 * expose manifest/level state to React.
 *
 * The hook owns the `Hls` instance for the lifetime of `hlsUrl`: changing
 * the URL tears down the previous instance and builds a new one, and
 * unmounting always calls `hls.destroy()` so MSE buffers and worker
 * threads are released.
 *
 * Error recovery follows the hls.js cookbook — `startLoad()` for network
 * errors, `recoverMediaError()` for media errors, full teardown on fatal
 * errors with an `error` string surfaced for the UI.
 *
 * @example
 * ```tsx
 * const videoRef = useRef<HTMLVideoElement>(null);
 * const { levels, currentLevel, error } = useHLS({
 *   videoRef,
 *   hlsUrl: 'https://cdn.example.com/video/master.m3u8',
 *   onLoadedMetadata: (duration) => setDuration(duration),
 *   onQualityChange: (level) => setQuality(level),
 * });
 *
 * return <video ref={videoRef} controls />;
 * ```
 */
function useHLS({
  videoRef,
  hlsUrl,
  onLoadedMetadata,
  onQualityChange,
}: UseHLSOptions): UseHLSResult {
  const hlsRef = useRef<Hls | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  const [levels, setLevels] = useState<HLSLevel[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest callbacks in a ref so we don't have to re-create the
  // Hls instance every time the parent passes a fresh closure.
  const callbacksRef = useRef({ onLoadedMetadata, onQualityChange });
  useEffect(() => {
    callbacksRef.current = { onLoadedMetadata, onQualityChange };
  }, [onLoadedMetadata, onQualityChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) {
      return;
    }

    setError(null);

    if (Hls.isSupported()) {
      const hls = new Hls({ ...HLS_CONFIG });
      hlsRef.current = hls;
      setIsSupported(true);

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        const parsed: HLSLevel[] = (data.levels as Level[]).map((level) => ({
          height: level.height,
          bitrate: level.bitrate,
        }));
        setLevels(parsed);
        if (Number.isFinite(video.duration)) {
          callbacksRef.current.onLoadedMetadata?.(video.duration);
        }
      });

      const handleLoadedMetadata = () => {
        callbacksRef.current.onLoadedMetadata?.(video.duration);
      };
      video.addEventListener('loadedmetadata', handleLoadedMetadata);

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        setCurrentLevel(data.level);
        callbacksRef.current.onQualityChange?.(data.level);
      });

      hls.on(Hls.Events.ERROR, (_event, data: ErrorData) => {
        if (!data.fatal) {
          return;
        }

        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            // Manifest load or segment fetch failed — ask hls.js to retry.
            setError(`Network error: ${data.details}`);
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            // Corrupted segment or MSE append failure — flush and retry.
            setError(`Media error: ${data.details}`);
            hls.recoverMediaError();
            break;
          default:
            setError(`Fatal playback error: ${data.details}`);
            hls.destroy();
            hlsRef.current = null;
            break;
        }
      });

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS — native HLS, no hls.js instance to manage.
      setIsSupported(true);
      video.src = hlsUrl;

      const handleLoadedMetadata = () => {
        callbacksRef.current.onLoadedMetadata?.(video.duration);
      };
      const handleError = () => {
        setError('Native HLS playback failed');
      };
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
        video.removeAttribute('src');
        video.load();
      };
    }

    setIsSupported(false);
    setError('HLS playback is not supported in this browser');
    return undefined;
  }, [videoRef, hlsUrl]);

  return {
    hls: hlsRef.current,
    isSupported,
    currentLevel,
    levels,
    error,
  };
}

export default useHLS;
