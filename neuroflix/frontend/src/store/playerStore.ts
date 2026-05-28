import { create } from 'zustand';

const VOLUME_STORAGE_KEY = 'playerVolume';

/**
 * Snapshot of the video element's UI-relevant state.
 *
 * Mirrored from the underlying `<video>` element via event listeners
 * in the player components; consumers should treat this as
 * read-mostly and mutate only through the store actions.
 */
export interface PlayerState {
  /** `true` when playback is active (not paused, not ended). */
  isPlaying: boolean;
  /** Current playhead position, in seconds. */
  currentTime: number;
  /** Total media duration, in seconds; `0` until metadata loads. */
  duration: number;
  /** Output volume in the range `[0, 1]`. */
  volume: number;
  /** `true` when audio is muted (independent of `volume`). */
  isMuted: boolean;
  /** `true` while the player occupies the full viewport. */
  isFullscreen: boolean;
  /** Playback speed multiplier; typical values: 0.5, 1, 1.5, 2. */
  playbackRate: number;
  /** Buffered byte ranges from the media element, or `null` pre-load. */
  bufferedRanges: TimeRanges | null;
  /** `true` while the player is waiting on the network for more data. */
  isBuffering: boolean;
  /** `true` when overlay controls should be visible. */
  showControls: boolean;
  /** Active HLS quality label, e.g. `'1080p'`; `null` for auto/unknown. */
  currentQuality: string | null;
}

/**
 * Player store actions layered on top of {@link PlayerState}.
 */
export interface PlayerStore extends PlayerState {
  /** Set the play/pause flag. */
  setIsPlaying: (playing: boolean) => void;
  /** Update the current playhead position (seconds). */
  setCurrentTime: (time: number) => void;
  /** Set the total media duration (seconds). */
  setDuration: (duration: number) => void;
  /**
   * Set the output volume. Clamped to `[0, 1]` and persisted to
   * `localStorage` so the preference survives reloads.
   */
  setVolume: (volume: number) => void;
  /** Flip the mute flag. Does not modify `volume`. */
  toggleMute: () => void;
  /** Set the fullscreen flag. */
  setIsFullscreen: (fullscreen: boolean) => void;
  /** Set the playback rate multiplier. */
  setPlaybackRate: (rate: number) => void;
  /** Set the buffered ranges from the media element. */
  setBufferedRanges: (ranges: TimeRanges | null) => void;
  /** Set the buffering flag (true while waiting on network). */
  setIsBuffering: (buffering: boolean) => void;
  /** Show or hide the overlay controls. */
  setShowControls: (show: boolean) => void;
  /** Set the active HLS quality label. */
  setCurrentQuality: (quality: string) => void;
  /**
   * Reset all player state to its initial values. Preserves the
   * persisted volume from `localStorage` so the user's preference
   * is not lost between videos.
   */
  reset: () => void;
}

function clampVolume(volume: number): number {
  if (Number.isNaN(volume)) return 0;
  if (volume < 0) return 0;
  if (volume > 1) return 1;
  return volume;
}

function readStoredVolume(): number {
  try {
    if (typeof localStorage === 'undefined') return 1;
    const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (raw === null) return 1;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? clampVolume(parsed) : 1;
  } catch {
    return 1;
  }
}

function persistVolume(volume: number): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VOLUME_STORAGE_KEY, volume.toString());
    }
  } catch {
    // localStorage unavailable — in-memory state is still correct.
  }
}

const initialState: PlayerState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: readStoredVolume(),
  isMuted: false,
  isFullscreen: false,
  playbackRate: 1,
  bufferedRanges: null,
  isBuffering: false,
  showControls: true,
  currentQuality: null,
};

export const usePlayerStore = create<PlayerStore>((set) => ({
  ...initialState,

  setIsPlaying(playing) {
    set({ isPlaying: playing });
  },

  setCurrentTime(time) {
    set({ currentTime: time });
  },

  setDuration(duration) {
    set({ duration });
  },

  setVolume(volume) {
    const clamped = clampVolume(volume);
    persistVolume(clamped);
    set({ volume: clamped });
  },

  toggleMute() {
    set((state) => ({ isMuted: !state.isMuted }));
  },

  setIsFullscreen(fullscreen) {
    set({ isFullscreen: fullscreen });
  },

  setPlaybackRate(rate) {
    set({ playbackRate: rate });
  },

  setBufferedRanges(ranges) {
    set({ bufferedRanges: ranges });
  },

  setIsBuffering(buffering) {
    set({ isBuffering: buffering });
  },

  setShowControls(show) {
    set({ showControls: show });
  },

  setCurrentQuality(quality) {
    set({ currentQuality: quality });
  },

  reset() {
    set({ ...initialState, volume: readStoredVolume() });
  },
}));
