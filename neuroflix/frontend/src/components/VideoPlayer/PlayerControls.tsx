import type { FC, RefObject } from 'react';
import PlayPauseButton from './PlayPauseButton';
import SkipButton from './SkipButton';
import VolumeControl from './VolumeControl';
import TimeDisplay from './TimeDisplay';
import FullscreenButton from './FullscreenButton';
import PlaybackSpeedButton from './PlaybackSpeedButton';
import { usePlayerStore } from '../../store/playerStore';
import { HLSLevel } from '@/hooks/useHLS';
import QualitySelector from './QualitySelector';


/**
 * Props for {@link PlayerControls}.
 */
export interface PlayerControlsProps {
  /**
   * Whether the control bar is currently visible. Driven by the parent
   * (e.g. via `useAutoHideControls`) so a single piece of state can
   * coordinate cursor visibility, overlay z-stacking, and this bar.
   */
  show: boolean;
  /**
   * Ref to the underlying `<video>` element, forwarded to the leaf
   * control buttons so they can drive playback via `useVideoControls`.
   */
  videoRef: RefObject<HTMLVideoElement>;
  /**
   * Ref to the outer player container (the element that should enter
   * fullscreen). Forwarded to {@link FullscreenButton}; overlays and
   * captions need to live inside this container to scale with the
   * video instead of being clipped to the page.
   */
  containerRef: RefObject<HTMLDivElement>;
  qualityLevels: HLSLevel[];
  currentQualityLevel: number;
  onSetLevel: (level: number) => void;
  /** Optional extra Tailwind classes appended to the outer container. */
  className?: string;
  }

/**
 * Bottom-anchored control bar for the video player.
 *
 * Layout (left → right):
 *  - **Left cluster:** play/pause, volume, current/total time
 *  - **Flex spacer**
 *  - **Right cluster:** fullscreen toggle
 *
 * The bar is absolutely positioned over the `<video>` element and
 * fades in/out via the `show` prop. Each child control is a leaf
 * component that subscribes to {@link usePlayerStore} directly, so
 * this component owns only layout — not playback state.
 *
 * Responsive behavior:
 *  - **≥1024px (desktop):** full row, all controls visible.
 *  - **768–1023px (tablet):** same row, tighter gaps.
 *  - **<768px (mobile):** larger touch targets (≥44px) inside each
 *    child button; padding stays comfortable for thumbs.
 *
 * Accessibility:
 *  - When `show` is `false`, the bar gets `pointer-events-none` so
 *    hidden controls cannot receive clicks or steal focus.
 *  - All buttons rendered inside are expected to provide their own
 *    `aria-label` and full keyboard support.
 */
const PlayerControls: FC<PlayerControlsProps> = ({
  show,
  videoRef,
  containerRef,
  qualityLevels,
  currentQualityLevel,
  onSetLevel,
  className,
}) => {
  // Only the values rendered directly here are pulled from the store;
  // child controls subscribe to the slices they need themselves to
  // avoid re-rendering this whole bar on every tick.
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);

  return (
    <div
      className={`
        absolute bottom-0 left-0 right-0
        bg-gradient-to-t from-black via-black/70 to-transparent
        px-4 pb-4 pt-8
        transition-opacity duration-300
        ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        ${className || ''}
      `}
    >
      {/* Controls row — single flex row on all breakpoints. */}
      <div className="flex items-center gap-2 md:gap-3">

        {/* Left cluster: play/pause · skip-back · skip-fwd · volume · time */}
        <div className="flex items-center gap-1 md:gap-2">
          <PlayPauseButton videoRef={videoRef} />
          <SkipButton videoRef={videoRef} direction="back" seconds={10} />
          <SkipButton videoRef={videoRef} direction="forward" seconds={10} />
          <VolumeControl videoRef={videoRef} />
          <TimeDisplay current={currentTime} total={duration} />
        </div>

        {/* Flexible spacer pushes right-side controls to the edge. */}
        <div className="flex-1" />

        {/* Right cluster: speed · quality · fullscreen */}
        <div className="flex items-center gap-2 md:gap-3">
          <PlaybackSpeedButton videoRef={videoRef} />
          <QualitySelector
            levels={qualityLevels}
            currentLevel={currentQualityLevel}
            onSetLevel={onSetLevel}
          />
          <FullscreenButton containerRef={containerRef} />
        </div>

      </div>
    </div>
  );
};

export default PlayerControls;
