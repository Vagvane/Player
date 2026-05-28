import { useCallback, useEffect, useRef, useState } from 'react';
import { parseVTT } from '../utils/parseVTT';
import type { ThumbnailCue } from '../types/video';

/**
 * Module-level cache of parsed thumbnail tracks, keyed by VTT URL.
 *
 * Thumbnail sprites are immutable once published, so caching across hook
 * instances (and across remounts of the same player) avoids re-fetching
 * and re-parsing on every scrub-bar hover or video reload. Signed URLs
 * include their signature in the query string, so different signatures
 * for the same logical file are correctly treated as different cache
 * entries — which matches the underlying HTTP semantics.
 */
const thumbnailCache = new Map<string, ThumbnailCue[]>();

const MAX_FETCH_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

export interface UseThumbnailsResult {
  thumbnails: ThumbnailCue[];
  isLoading: boolean;
  error: string | null;
  getThumbnailForTime: (time: number) => ThumbnailCue | null;
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
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

async function fetchWithRetry(url: string, signal: AbortSignal): Promise<string> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt += 1) {
    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        // 4xx are not worth retrying (signature expired, file missing) —
        // fail fast so the UI can surface the error.
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return await response.text();
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') throw err;
      lastError = err;
      const isClientError =
        err instanceof Error && /^HTTP 4\d{2}/.test(err.message);
      if (isClientError || attempt === MAX_FETCH_ATTEMPTS - 1) {
        break;
      }
      // Exponential backoff: 500ms, 1s, 2s...
      await delay(RETRY_BASE_DELAY_MS * 2 ** attempt, signal);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Unknown fetch error');
}

/**
 * Binary-search the cue list for the entry covering `time`.
 *
 * `parseVTT` emits cues in source order (i.e. ascending `startTime`)
 * with adjoining intervals, so a binary search is correct and beats the
 * O(N) scan a `find` would do on a long film with thousands of cues.
 */
function findCueForTime(cues: ThumbnailCue[], time: number): ThumbnailCue | null {
  if (cues.length === 0 || !Number.isFinite(time) || time < 0) return null;

  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const cue = cues[mid];
    if (time < cue.startTime) {
      hi = mid - 1;
    } else if (time >= cue.endTime) {
      lo = mid + 1;
    } else {
      return cue;
    }
  }
  return null;
}

/**
 * Load a WebVTT thumbnail-sprite track and expose lookups against it.
 *
 * Results are cached in-memory by URL, so the hook is cheap to mount
 * repeatedly (e.g. when toggling between players) and the network fetch
 * only happens once per signed URL. The cache survives unmount but is
 * cleared on page reload — appropriate for short-lived signed URLs.
 *
 * Failed fetches are retried up to 3 times with exponential backoff for
 * 5xx / network errors; 4xx responses fail fast since they usually mean
 * the signature has expired and retrying won't help.
 *
 * @example
 * ```tsx
 * const { thumbnails, isLoading, getThumbnailForTime } = useThumbnails(vttUrl);
 *
 * const hoverCue = getThumbnailForTime(hoverTime);
 * return hoverCue ? (
 *   <div
 *     style={{
 *       backgroundImage: `url(${hoverCue.spriteUrl})`,
 *       backgroundPosition: `-${hoverCue.x}px -${hoverCue.y}px`,
 *       width: hoverCue.width,
 *       height: hoverCue.height,
 *     }}
 *   />
 * ) : null;
 * ```
 */
function useThumbnails(vttUrl: string): UseThumbnailsResult {
  const [thumbnails, setThumbnails] = useState<ThumbnailCue[]>(() =>
    vttUrl ? thumbnailCache.get(vttUrl) ?? [] : []
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // `thumbnails` reference is kept fresh for `getThumbnailForTime` without
  // re-creating the callback on every render — important because the
  // callback is typically wired to a high-frequency scrub-bar handler.
  const thumbnailsRef = useRef<ThumbnailCue[]>(thumbnails);
  useEffect(() => {
    thumbnailsRef.current = thumbnails;
  }, [thumbnails]);

  useEffect(() => {
    if (!vttUrl) {
      setThumbnails([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const cached = thumbnailCache.get(vttUrl);
    if (cached) {
      setThumbnails(cached);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const vttText = await fetchWithRetry(vttUrl, controller.signal);
        const rawCues = parseVTT(vttText);

        // Resolve relative sprite URLs (e.g. "sprite.jpg") against the
        // VTT file's own base URL so the browser fetches from the backend,
        // not from the current page origin.
        const vttBase = vttUrl.substring(0, vttUrl.lastIndexOf('/') + 1);
        const cues = rawCues.map((cue) => ({
          ...cue,
          spriteUrl: cue.spriteUrl.startsWith('http')
            ? cue.spriteUrl
            : `${vttBase}${cue.spriteUrl}`,
        }));

        thumbnailCache.set(vttUrl, cues);
        if (!cancelled) {
          setThumbnails(cues);
          setError(null);
        }
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        console.error('useThumbnails: failed to load thumbnails', err);
        if (!cancelled) {
          setThumbnails([]);
          setError('Failed to load thumbnails');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [vttUrl]);

  const getThumbnailForTime = useCallback(
    (time: number): ThumbnailCue | null => findCueForTime(thumbnailsRef.current, time),
    []
  );

  return { thumbnails, isLoading, error, getThumbnailForTime };
}

export default useThumbnails;
