import { useState, type FC, type RefObject } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import useVideoControls, { VALID_PLAYBACK_RATES } from '../../hooks/useVideoControls';

interface PlaybackSpeedButtonProps {
  videoRef: RefObject<HTMLVideoElement>;
}

const PlaybackSpeedButton: FC<PlaybackSpeedButtonProps> = ({ videoRef }) => {
  const [open, setOpen] = useState(false);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const { setPlaybackRate } = useVideoControls({ videoRef, enableKeyboardShortcuts: false });

  const label = playbackRate === 1 ? '1×' : `${playbackRate}×`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="
          px-2 py-1 text-xs font-semibold text-white
          rounded border border-white/30
          hover:bg-white/20 transition-colors
          focus:outline-none focus:ring-2 focus:ring-white/50
        "
        aria-label="Playback speed"
      >
        {label}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="
            absolute bottom-9 right-0 z-50
            bg-gray-900 border border-gray-700 rounded shadow-2xl
            min-w-[80px] py-1 overflow-hidden
          ">
            {VALID_PLAYBACK_RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => { setPlaybackRate(rate); setOpen(false); }}
                className={`
                  w-full text-left px-3 py-2 text-xs transition-colors hover:bg-gray-700
                  ${playbackRate === rate ? 'text-red-400 font-semibold' : 'text-white'}
                `}
              >
                {rate === 1 ? '1× Normal' : `${rate}×`}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PlaybackSpeedButton;
