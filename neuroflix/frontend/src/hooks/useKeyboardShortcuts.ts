import { useEffect, type RefObject } from 'react';
import useVideoControls, { VALID_PLAYBACK_RATES } from './useVideoControls';
import { usePlayerStore } from '../store/playerStore';

const SEEK_STEP_SHORT = 5;
const SEEK_STEP_LONG = 10;
const VOLUME_STEP = 0.1;

const PLAYER_KEYS = new Set<string>([
  ' ',
  'Spacebar',
  'k',
  'K',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'm',
  'M',
  'f',
  'F',
  'j',
  'J',
  'l',
  'L',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '<',
  '>',
  ',',
  '.',
]);

/**
 * Global keyboard shortcuts for the player. Mirrors the YouTube key
 * map, which is what most viewers already have in muscle memory:
 *
 * | Key             | Action                            |
 * | --------------- | --------------------------------- |
 * | `Space` / `K`   | Toggle play/pause                 |
 * | `←`             | Seek back 5 seconds               |
 * | `→`             | Seek forward 5 seconds            |
 * | `J`             | Seek back 10 seconds              |
 * | `L`             | Seek forward 10 seconds           |
 * | `↑`             | Volume +10%                       |
 * | `↓`             | Volume −10%                       |
 * | `M`             | Toggle mute                       |
 * | `F`             | Toggle fullscreen                 |
 * | `0` – `9`       | Seek to 0% – 90% of duration      |
 * | `<` (Shift + ,) | Decrease playback speed one step  |
 * | `>` (Shift + .) | Increase playback speed one step  |
 *
 * The handler is attached to `document` so the shortcuts work anywhere
 * on the page (not just when the video is focused). To avoid hijacking
 * typing in forms, key events whose target is an `<input>`,
 * `<textarea>`, `<select>`, or any `contenteditable` element are
 * passed through untouched — otherwise pressing Space while filling a
 * comment box would scrub playback, and Arrow keys would jump the
 * playhead instead of moving the caret.
 *
 * `useVideoControls` is consumed with `enableKeyboardShortcuts: false`
 * so this hook owns the single global listener — otherwise Space would
 * fire `togglePlay` twice.
 *
 * @example
 * ```tsx
 * const videoRef = useRef<HTMLVideoElement>(null);
 * useKeyboardShortcuts(videoRef);
 * // Disable shortcuts while a modal is open:
 * useKeyboardShortcuts(videoRef, !modalOpen);
 * ```
 */
/**
 * When provided, forward-seek keyboard actions (→, L, 0–9) are routed
 * through this callback instead of the raw `seek` from useVideoControls.
 * Use this to wire in the checkpoint seek-guard so keyboard scrubbing
 * obeys the same forward-seek restrictions as the timeline.
 */
function useKeyboardShortcuts(
  videoRef: RefObject<HTMLVideoElement>,
  enabled: boolean = true,
  onSeek?: (time: number) => void
): void {
  const {
    togglePlay,
    seek,
    setVolumeLevel,
    toggleMute,
    toggleFullscreen,
    setPlaybackRate,
  } = useVideoControls({ videoRef, enableKeyboardShortcuts: false });

  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (event: KeyboardEvent): void => {
      // Don't fight forms for keys. If the focused element is something
      // the user types into, every shortcut would clash with normal
      // editing — Space inserts a space, arrows move the caret, etc.
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target.isContentEditable
        ) {
          return;
        }
      }

      // Modifier-bearing combos (Ctrl/Meta/Alt) are reserved for the
      // browser and OS — Cmd+L, Ctrl+F, etc. Don't preventDefault them.
      // Shift is allowed because `<`/`>` are Shift-produced characters.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (!PLAYER_KEYS.has(event.key)) return;

      const { currentTime, duration, volume, playbackRate } =
        usePlayerStore.getState();

      event.preventDefault();

      switch (event.key) {
        case ' ':
        case 'Spacebar':
        case 'k':
        case 'K':
          togglePlay();
          break;
        case 'ArrowLeft':
          seek(currentTime - SEEK_STEP_SHORT);
          break;
        case 'ArrowRight':
          (onSeek ?? seek)(currentTime + SEEK_STEP_SHORT);
          break;
        case 'ArrowUp':
          setVolumeLevel(volume + VOLUME_STEP);
          break;
        case 'ArrowDown':
          setVolumeLevel(volume - VOLUME_STEP);
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'j':
        case 'J':
          seek(currentTime - SEEK_STEP_LONG);
          break;
        case 'l':
        case 'L':
          (onSeek ?? seek)(currentTime + SEEK_STEP_LONG);
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9': {
          if (!Number.isFinite(duration) || duration <= 0) break;
          const fraction = Number.parseInt(event.key, 10) / 10;
          (onSeek ?? seek)(duration * fraction);
          break;
        }
        case '<':
        case ',': {
          // `<` is Shift+`,` on US layouts; some browsers report the
          // unshifted key for held-modifier combos, so accept both.
          if (!event.shiftKey && event.key === ',') break;
          const idx = VALID_PLAYBACK_RATES.indexOf(
            playbackRate as (typeof VALID_PLAYBACK_RATES)[number]
          );
          const nextIdx = idx <= 0 ? 0 : idx - 1;
          setPlaybackRate(VALID_PLAYBACK_RATES[nextIdx]);
          break;
        }
        case '>':
        case '.': {
          if (!event.shiftKey && event.key === '.') break;
          const idx = VALID_PLAYBACK_RATES.indexOf(
            playbackRate as (typeof VALID_PLAYBACK_RATES)[number]
          );
          const nextIdx =
            idx === -1
              ? VALID_PLAYBACK_RATES.indexOf(1)
              : Math.min(idx + 1, VALID_PLAYBACK_RATES.length - 1);
          setPlaybackRate(VALID_PLAYBACK_RATES[nextIdx]);
          break;
        }
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [
    enabled,
    onSeek,
    togglePlay,
    seek,
    setVolumeLevel,
    toggleMute,
    toggleFullscreen,
    setPlaybackRate,
  ]);
}

export default useKeyboardShortcuts;
