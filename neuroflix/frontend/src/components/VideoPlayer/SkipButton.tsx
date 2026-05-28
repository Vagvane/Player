import type { FC, RefObject } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import useVideoControls from '../../hooks/useVideoControls';

export interface SkipButtonProps {
  videoRef: RefObject<HTMLVideoElement>;
  direction: 'back' | 'forward';
  seconds?: number;
}

const ReplayIcon: FC<{ seconds: number }> = ({ seconds }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    {/* Circular arrow going counter-clockwise */}
    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
    <text
      x="12"
      y="17"
      textAnchor="middle"
      fontSize="6"
      fontWeight="bold"
      fill="currentColor"
      fontFamily="sans-serif"
    >
      {seconds}
    </text>
  </svg>
);

const ForwardIcon: FC<{ seconds: number }> = ({ seconds }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    {/* Circular arrow going clockwise */}
    <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
    <text
      x="12"
      y="17"
      textAnchor="middle"
      fontSize="6"
      fontWeight="bold"
      fill="currentColor"
      fontFamily="sans-serif"
    >
      {seconds}
    </text>
  </svg>
);

const SkipButton: FC<SkipButtonProps> = ({ videoRef, direction, seconds = 10 }) => {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const { seek } = useVideoControls({ videoRef, enableKeyboardShortcuts: false });

  const handleClick = () => {
    const delta = direction === 'back' ? -seconds : seconds;
    seek(currentTime + delta);
  };

  const label = direction === 'back' ? `Replay ${seconds} seconds` : `Skip forward ${seconds} seconds`;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className="
        w-10 h-10 md:w-12 md:h-12
        flex items-center justify-center
        rounded-full
        text-white
        hover:bg-white/20
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-white/50
      "
    >
      {direction === 'back'
        ? <ReplayIcon seconds={seconds} />
        : <ForwardIcon seconds={seconds} />
      }
    </button>
  );
};

export default SkipButton;
