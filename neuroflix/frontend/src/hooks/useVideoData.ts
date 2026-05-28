import { useCallback, useEffect, useRef, useState } from 'react';
import videoService from '../services/videoService';
import type { VideoMetadata } from '../types/video';

const MAX_ATTEMPTS = 3;
const BACKOFF_DELAYS_MS = [1000, 2000, 4000] as const;

export interface UseVideoDataResult {
  videoData: VideoMetadata | null;
  isLoading: boolean;
  error: string | null;
  /**
   * Manually re-fetch metadata. Bypasses the service's in-memory cache
   * so an expired signed URL or stale checkpoint list is refreshed
   * against the backend.
   */
  retry: () => void;
}

interface HttpLikeError {
  message?: string;
  status?: number;
  response?: { status?: number };
}

function extractStatus(err: unknown): number | undefined {
  const e = err as HttpLikeError | null;
  return e?.response?.status ?? e?.status;
}

/**
 * Map a service error into a viewer-facing string. Generic enough to
 * survive whatever shape the axios/fetch error happens to be, with
 * specific copy for the cases the player actually has to handle.
 */
function describeError(err: unknown): string {
  const status = extractStatus(err);
  switch (status) {
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      // 403 from `/videos/:id/stream` typically means the signed URL
      // grant was revoked or the viewer was un-entitled mid-session.
      return 'You do not have permission to view this video, or the access link has expired.';
    case 404:
      return 'Video not found.';
    case 410:
      return 'This video is no longer available.';
    default:
      if (status && status >= 500) return 'The video service is temporarily unavailable. Please try again.';
      if (status && status >= 400) {
        const message = (err as HttpLikeError | null)?.message;
        return message ?? 'Failed to load video.';
      }
      // No HTTP status — almost certainly a network or CORS failure.
      return 'Network error. Please check your connection and try again.';
  }
}

/**
 * `true` if it's worth retrying. Network / 5xx / 408 / 429 are
 * transient; 4xx is deterministic (404 won't become 200 by retrying).
 */
function isRetryable(err: unknown): boolean {
  const status = extractStatus(err);
  if (status === undefined) return true;
  if (status === 408) return true;
  return status >= 500 && status < 600;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

/**
 * Fetch playback metadata for a video and expose load state to React.
 *
 * Wraps `videoService.getVideoStream` with:
 *   - Loading / error state for the UI.
 *   - Outer retry with exponential backoff (1s, 2s, 4s) on transient
 *     failures. The service itself already retries 5xx/network errors
 *     a couple of times — this hook is the slower, user-visible fallback
 *     so a flaky network has multiple chances to recover before the
 *     viewer sees an error.
 *   - 4xx errors fail fast — 404 / 403 won't recover by retrying, and
 *     hammering the API in that state is wasted work.
 *   - A `retry` action that forces a fresh fetch (bypassing the service
 *     cache), used for "Try again" buttons and for recovering from
 *     expired signed URLs reported by the player.
 *
 * The active fetch is cancelled if `videoId` changes mid-flight or the
 * component unmounts, so a slow first request can't blow away a fresh
 * second one with stale data.
 *
 * @example
 * ```tsx
 * const { videoData, isLoading, error, retry } = useVideoData(videoId);
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorBanner message={error} onRetry={retry} />;
 * if (!videoData) return null;
 *
 * return <Player metadata={videoData} />;
 * ```
 */
function useVideoData(videoId: string): UseVideoDataResult {
  const [videoData, setVideoData] = useState<VideoMetadata | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Bumping this triggers the load effect to run again. Keyed by a
  // counter rather than a boolean so consecutive retry clicks always
  // re-fire even if the previous one resolved instantly.
  const [retryNonce, setRetryNonce] = useState<number>(0);
  const forceRefreshRef = useRef<boolean>(false);

  useEffect(() => {
    if (!videoId) {
      setVideoData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    const forceRefresh = forceRefreshRef.current;
    forceRefreshRef.current = false;

    setIsLoading(true);
    setError(null);

    (async () => {
      let lastErr: unknown = null;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        if (controller.signal.aborted) return;
        try {
          // Force refresh on manual retry or on retry attempts > 0
          // (a fresh cache could still be returning an expired URL).
          const data = await videoService.getVideoStream(
            videoId,
            forceRefresh || attempt > 0
          );
          if (cancelled) return;
          setVideoData(data);
          setError(null);
          setIsLoading(false);
          return;
        } catch (err) {
          lastErr = err;
          if (!isRetryable(err) || attempt === MAX_ATTEMPTS - 1) break;
          try {
            await wait(BACKOFF_DELAYS_MS[attempt], controller.signal);
          } catch {
            return; // aborted during backoff
          }
        }
      }

      if (cancelled) return;
      console.error('useVideoData: failed to load video metadata', lastErr);
      setVideoData(null);
      setError(describeError(lastErr));
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [videoId, retryNonce]);

  const retry = useCallback(() => {
    forceRefreshRef.current = true;
    setRetryNonce((n) => n + 1);
  }, []);

  return { videoData, isLoading, error, retry };
}

export default useVideoData;
