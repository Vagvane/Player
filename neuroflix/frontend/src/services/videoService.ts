import apiClient from './api';
import { VideoStatus, type Video, type VideoMetadata } from '../types/video';
import { useAuthStore } from '../store/authStore';

/**
 * Stream URLs returned by `/videos/:id/stream` are signed for 60 minutes.
 * We expire our in-memory copy 10 minutes earlier so a cached entry never
 * hands back a URL that's about to die on a long pause/seek.
 */
const STREAM_CACHE_TTL_MS = 50 * 60 * 1000;

/** Minimum interval between progress pings, per video. */
const PROGRESS_THROTTLE_MS = 5_000;

/** Number of retry attempts on transient failures (network / 5xx). */
const MAX_RETRY_ATTEMPTS = 2;

interface StreamCacheEntry {
  metadata: VideoMetadata;
  expiresAt: number;
}

const streamCache = new Map<string, StreamCacheEntry>();

/**
 * In-flight fetch deduplication: if two callers request the same videoId
 * simultaneously (e.g. React Strict Mode double-invoking effects), the
 * second caller shares the first promise instead of issuing duplicate
 * API requests that would trip the rate limiter.
 */
const pendingFetches = new Map<string, Promise<VideoMetadata>>();

/** Per-video throttle bookkeeping for `updateProgress`. */
const lastProgressSentAt = new Map<string, number>();

/**
 * Treat an error as transient (worth retrying) if there is no HTTP status
 * (genuine network / timeout) or the status is a server-side 5xx.
 *
 * 429 is explicitly excluded: hammering a rate-limited endpoint makes the
 * backoff window longer, not shorter. The apiClient attaches `status` to
 * every rejected error object so we can read it here without needing the
 * raw AxiosError.
 */
function isTransient(err: unknown): boolean {
  const e = err as { status?: number; response?: { status?: number } } | null;
  const status = e?.response?.status ?? e?.status;
  if (status === undefined) return true;   // no HTTP status = network error = transient
  if (status === 429) return false;        // rate-limited = don't make it worse
  return status >= 500 && status < 600;
}

/**
 * Run `op` up to {@link MAX_RETRY_ATTEMPTS} additional times after an
 * initial failure on transient errors, with linear backoff (200ms,
 * 400ms, …). Deterministic 4xx errors throw immediately.
 */
async function withRetry<T>(op: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      return await op();
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || attempt === MAX_RETRY_ATTEMPTS) break;
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }
  throw lastErr;
}

const videoService = {
  /**
   * Fetch the catalog record for a single video.
   *
   * @throws The server error payload (e.g. 404 when the video does
   *   not exist or is not visible to the caller).
   *
   * @example
   * const video = await videoService.getVideo('a7c…');
   * console.log(video.title, video.status);
   */
  async getVideo(videoId: string): Promise<Video> {
    return withRetry(
      () => apiClient.get(`/videos/${encodeURIComponent(videoId)}`) as unknown as Promise<Video>,
    );
  },

  /**
   * Fetch playback metadata for a video: signed HLS URL, signed
   * thumbnail VTT URL, checkpoints, and per-viewer watermark.
   *
   * Results are cached in-memory per videoId for
   * {@link STREAM_CACHE_TTL_MS}. A subsequent call within that
   * window returns the cached payload without a network round-trip.
   * Pass `forceRefresh: true` to bypass the cache (e.g. after a
   * known expiry or after re-login).
   *
   * @throws The server error payload — including 401, which the API
   *   client will also handle by clearing the session.
   *
   * @example
   * const meta = await videoService.getVideoStream(videoId);
   * hls.loadSource(meta.hlsUrl);
   */
  async getVideoStream(videoId: string, forceRefresh = false): Promise<VideoMetadata> {
    if (!forceRefresh) {
      const cached = streamCache.get(videoId);
      if (cached && cached.expiresAt > Date.now()) return cached.metadata;
      if (cached) streamCache.delete(videoId);

      // Deduplicate concurrent fetches for the same video — return the
      // existing in-flight promise instead of firing duplicate API requests.
      const pending = pendingFetches.get(videoId);
      if (pending) return pending;
    }

    const fetchPromise = this._fetchVideoStream(videoId);
    if (!forceRefresh) pendingFetches.set(videoId, fetchPromise);
    return fetchPromise;
  },

  async _fetchVideoStream(videoId: string): Promise<VideoMetadata> {
    try {
  // Fetch video record and checkpoints in parallel
  const [response, cpResponse] = await Promise.all([
    withRetry(
      () =>
        apiClient.get(
          `/videos/${encodeURIComponent(videoId)}`,
        ) as unknown as Promise<{ success: boolean; data: { video: any; progress: any } }>,
    ),
    withRetry(
      () =>
        apiClient.get(
          `/checkpoints/video/${encodeURIComponent(videoId)}`,
        ) as unknown as Promise<{ data: { checkpoints: any[] } }>,
    ).catch(() => ({ data: { checkpoints: [] } })), // fail gracefully — no checkpoints is fine
  ]);

  const video = response?.data?.video;
  const progress = response?.data?.progress;

  if (!video) {
    throw { status: 404, message: 'Video not found.' };
  }

  if (!video.hlsUrl) {
    throw { status: 409, message: 'Video is not ready for playback yet.' };
  }

  const authUser = useAuthStore.getState().user;

  const metadata: VideoMetadata = {
    id: video.id,
    title: video.title,
    duration: video.duration ?? 0,
    hlsUrl: video.hlsUrl,
    thumbnailVttUrl: video.thumbnailVttUrl ?? '',
        checkpoints: (cpResponse?.data?.checkpoints ?? []).map((cp: any) => ({
      ...cp,
      videoId: videoId,   // inject the videoId that the API omits from each checkpoint
    })),
    watermark: {
      email: authUser?.email ?? 'guest@neuroflix.com',
      organization: authUser?.organization ?? 'Neuroflix',
    },
    resumeTime: progress?.currentTime ?? 0,
  };

    streamCache.set(videoId, {
      metadata,
      expiresAt: Date.now() + STREAM_CACHE_TTL_MS,
    });
    return metadata;
    } finally {
      pendingFetches.delete(videoId);
    }
  },

  /**
   * List all videos the caller can see, filtered to those ready for
   * playback (`status === READY`). Videos still uploading,
   * processing, or in a failed state are omitted.
   *
   * @example
   * const videos = await videoService.getAllVideos();
   * // videos[].status is always VideoStatus.READY
   */
  async getAllVideos(): Promise<Video[]> {
  const response = await withRetry(
    () => apiClient.get('/videos') as unknown as Promise<{ data: { videos: Video[] } }>,
  );
  const all = response?.data?.videos ?? [];
  return all.filter((v) => v.status === VideoStatus.READY);
},
  /**
   * Report playback position to the backend. Fire-and-forget — the
   * returned promise resolves immediately and any network error is
   * logged via `console.warn` rather than thrown, so progress
   * reporting never disrupts playback.
   *
   * Calls for the same `videoId` are throttled to at most one per
   * {@link PROGRESS_THROTTLE_MS}. The first call after the throttle
   * window expires goes through; intermediate calls are dropped (not
   * queued) — the next accepted call will carry the up-to-date
   * `currentTime`, so dropping is correct.
   *
   * @example
   * // Inside a `timeupdate` handler:
   * videoService.updateProgress(videoId, video.currentTime);
   */
  updateProgress(videoId: string, currentTime: number): Promise<void> {
    const now = Date.now();
    const last = lastProgressSentAt.get(videoId) ?? 0;
    if (now - last < PROGRESS_THROTTLE_MS) {
      return Promise.resolve();
    }
    lastProgressSentAt.set(videoId, now);

    apiClient
      .post(`/videos/${encodeURIComponent(videoId)}/progress`, { currentTime: Math.round(currentTime) })
      .catch((err) => {
        console.warn('videoService.updateProgress failed:', err);
      });

    return Promise.resolve();
  },

  /**
   * Drop the cached entry for a single video. Call when leaving the
   * player so the next visit fetches fresh progress data from the
   * backend instead of returning a stale `resumeTime`.
   */
  invalidateVideoCache(videoId: string): void {
    streamCache.delete(videoId);
    pendingFetches.delete(videoId);
  },

  /**
   * Drop all cached stream metadata. Call on logout (or any other
   * identity change) so a new viewer never receives the previous
   * viewer's signed URLs or watermark payload.
   */
  clearStreamCache(): void {
    streamCache.clear();
    pendingFetches.clear();
    lastProgressSentAt.clear();
  },
};

export default videoService;
