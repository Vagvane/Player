import { useState, type FC } from 'react';
import type { HLSLevel } from '../../hooks/useHLS';

interface QualitySelectorProps {
  levels: HLSLevel[];
  currentLevel: number;
  onSetLevel: (level: number) => void;
}

const QualitySelector: FC<QualitySelectorProps> = ({ levels, currentLevel, onSetLevel }) => {
  const [open, setOpen] = useState(false);

  if (levels.length === 0) return null;

  const label = currentLevel === -1 ? 'Auto' : `${levels[currentLevel]?.height ?? '?'}p`;

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
        aria-label="Video quality"
      >
        {label}
      </button>

      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="
            absolute bottom-9 right-0 z-50
            bg-gray-900 border border-gray-700 rounded shadow-2xl
            min-w-[88px] py-1 overflow-hidden
          ">
            <button
              type="button"
              onClick={() => { onSetLevel(-1); setOpen(false); }}
              className={`
                w-full text-left px-3 py-2 text-xs transition-colors hover:bg-gray-700
                ${currentLevel === -1 ? 'text-red-400 font-semibold' : 'text-white'}
              `}
            >
              Auto
            </button>
            {levels.map((level, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { onSetLevel(i); setOpen(false); }}
                className={`
                  w-full text-left px-3 py-2 text-xs transition-colors hover:bg-gray-700
                  ${currentLevel === i ? 'text-red-400 font-semibold' : 'text-white'}
                `}
              >
                {level.height}p
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default QualitySelector;