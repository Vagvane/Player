import type { Checkpoint } from './checkpoint';

/**
 * Lifecycle status of a video asset as it moves through ingestion,
 * transcoding, and delivery.
 */
export enum VideoStatus {
  /** File bytes are being uploaded to origin storage. */
  UPLOADING = 'UPLOADING',
  /** Upload complete; transcoding / packaging in progress. */
  PROCESSING = 'PROCESSING',
  /** HLS master and auxiliary assets are available for playback. */
  READY = 'READY',
  /** Upload or processing failed terminally. */
  FAILED = 'FAILED',
}

/**
 * Canonical server-side representation of a video record.
 *
 * Paths are storage keys (e.g. R2 object keys), not user-facing URLs.
 * Signed URLs for playback are produced separately — see {@link VideoMetadata}.
 */
export interface Video {
  /** Stable UUID identifier. */
  id: string;
  /** Human-readable title shown in catalog and player UI. */
  title: string;
  /** Long-form description; `null` when not provided. */
  description: string | null;
  /** Total playback duration in seconds. */
  duration: number;
  /** Current lifecycle status. */
  status: VideoStatus;
  /** R2 object key for the HLS `master.m3u8` playlist; `null` until ready. */
  hlsPath: string | null;
  /** R2 object key for the WebVTT thumbnail track; `null` until generated. */
  thumbnailVttPath: string | null;
  /** R2 object key for the thumbnail sprite sheet; `null` until generated. */
  spritePath: string | null;
  /** Record creation timestamp. */
  createdAt: Date;
  /** Last-modified timestamp. */
  updatedAt: Date;
}

/**
 * Player-facing metadata bundle returned to the client at playback time.
 *
 * URLs here are short-lived signed URLs, not storage paths.
 */
export interface VideoMetadata {
  /** Video UUID. */
  id: string;
  /** Display title. */
  title: string;
  /** Total playback duration in seconds. */
  duration: number;
  /** Signed URL to the HLS master playlist. */
  hlsUrl: string;
  /** Signed URL to the WebVTT thumbnail track. */
  thumbnailVttUrl: string;
  /** Inline-question checkpoints attached to this video. */
  checkpoints: Checkpoint[];
  /** Forensic watermark payload to overlay during playback. */
  watermark: {
    /** Authenticated viewer's email. */
    email: string;
    /** Viewer's organization / tenant identifier. */
    organization: string;
  };
  /** Saved playback position in seconds; `0` or absent if never watched. */
  resumeTime?: number;
}

/**
 * One thumbnail cue parsed out of a WebVTT track, pointing at a region
 * within a sprite sheet image.
 */
export interface ThumbnailCue {
  /** Cue start time in seconds (inclusive). */
  startTime: number;
  /** Cue end time in seconds (exclusive). */
  endTime: number;
  /** URL of the sprite sheet image containing this thumbnail. */
  spriteUrl: string;
  /** X coordinate of the thumbnail's top-left corner within the sprite, in pixels. */
  x: number;
  /** Y coordinate of the thumbnail's top-left corner within the sprite, in pixels. */
  y: number;
  /** Thumbnail width in pixels. */
  width: number;
  /** Thumbnail height in pixels. */
  height: number;
}
