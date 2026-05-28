import { useState, type FC, type RefObject } from 'react';
import useVideoControls from '../../hooks/useVideoControls';
import { usePlayerStore } from '../../store/playerStore';

/**
 * Props for {@link VolumeControl}.
 *
 * Like {@link import('./PlayPauseButton').default}, this leaf needs
 * a ref to the real `<video>` element so {@link useVideoControls}
 * can mutate `video.volume` / `video.muted` directly.
 */
export interface VolumeControlProps {
  /** Ref to the `<video>` element owned by `VideoElement`. */
  videoRef: RefObject<HTMLVideoElement>;
}

/** Muted speaker icon — used when `isMuted` is true or `volume === 0`. */
const MutedIcon: FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
  </svg>
);

/** Speaker-only icon — used for low volume (0 < volume < 0.5). */
const LowVolumeIcon: FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 9v6h4l5 5V4l-5 5H7z" />
  </svg>
);

/** Speaker with one wave — used for high volume (volume ≥ 0.5). */
const HighVolumeIcon: FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
  </svg>
);

/**
 * Mute/unmute button + horizontal volume slider.
 *
 * **Desktop (≥ md / 768px):** the slider expands horizontally from
 * width-0 to width-20 (Tailwind `w-20` = 5rem) when the user hovers
 * the cluster, providing a fine-grained volume control next to the
 * mute toggle.
 *
 * **Mobile (< md):** the slider stays hidden. Mobile browsers gate
 * `<video>.volume` to the OS volume slider anyway (iOS hard-blocks
 * it entirely), so the most we can offer reliably is a mute toggle —
 * the user adjusts system volume via the hardware buttons.
 *
 * Volume persistence and the volume→unmute coupling (dragging the
 * slider up off zero also clears the mute flag) live in the
 * `useVideoControls` hook and the player store; this component is
 * purely presentational.
 */
const VolumeControl: FC<VolumeControlProps> = ({ videoRef }) => {
  const [showSlider, setShowSlider] = useState(false);

  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);

  // Disable in-hook keyboard shortcuts — the parent VideoPlayer owns
  // global key routing; otherwise every button mount re-registers it.
  const { setVolumeLevel, toggleMute } = useVideoControls({
    videoRef,
    enableKeyboardShortcuts: false,
  });

  // Effective volume drives both the icon choice and the slider knob —
  // muted should look and behave like 0 even if the stored volume is
  // higher so the user can "unmute" by dragging up.
  const effectiveVolume = isMuted ? 0 : volume;

  const VolumeIcon =
    effectiveVolume === 0
      ? MutedIcon
      : effectiveVolume < 0.5
        ? LowVolumeIcon
        : HighVolumeIcon;

  return (
    <div
      className="flex items-center gap-2"
      onMouseEnter={() => setShowSlider(true)}
      onMouseLeave={() => setShowSlider(false)}
    >
      <button
        type="button"
        onClick={toggleMute}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        aria-pressed={isMuted}
        className="
          w-11 h-11
          flex items-center justify-center
          rounded-full
          text-white hover:bg-white/20
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-white/50
        "
      >
        <VolumeIcon />
      </button>

      {/* Volume slider — desktop only, animated in on hover. */}
      <div
        className={`
          hidden md:block
          transition-all duration-200
          ${showSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'}
          overflow-hidden
        `}
      >
      <input
  type="range"
  min={0}
  max={1}
  step={0.01}
  value={effectiveVolume}
  onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
  aria-label="Volume"
  className="
    w-20 h-1
    appearance-none rounded-full
    cursor-pointer
    [&::-webkit-slider-thumb]:appearance-none
    [&::-webkit-slider-thumb]:w-3
    [&::-webkit-slider-thumb]:h-3
    [&::-webkit-slider-thumb]:rounded-full
    [&::-webkit-slider-thumb]:bg-white
    [&::-webkit-slider-thumb]:cursor-pointer
  "
  style={{
    background: `linear-gradient(to right, #ffffff ${effectiveVolume * 100}%, rgba(255,255,255,0.2) ${effectiveVolume * 100}%)`,
  }}
/>
      </div>
    </div>
  );
};

export default VolumeControl;
