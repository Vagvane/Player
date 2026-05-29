import { type FC } from 'react';
import type { Checkpoint } from '../../types/checkpoint';
import { formatTime } from '../../utils/formatTime';

interface SeekGuardDialogProps {
  /** The timestamp (seconds) the viewer tried to seek to. */
  targetTime: number;
  /** Checkpoints in the skipped range that have NOT been answered. */
  unansweredCheckpoints: Checkpoint[];
  /** Checkpoints in the skipped range that ARE already answered. */
  answeredCheckpoints: Checkpoint[];
  /** Called when the viewer chooses to stay at their current position. */
  onContinueWatching: () => void;
  /** Called when the viewer agrees to answer the first unanswered checkpoint. */
  onAnswerCheckpoints: () => void;
  visible: boolean;
}

const SeekGuardDialog: FC<SeekGuardDialogProps> = ({
  targetTime,
  unansweredCheckpoints,
  answeredCheckpoints,
  onContinueWatching,
  onAnswerCheckpoints,
  visible,
}) => {
  const total = unansweredCheckpoints.length + answeredCheckpoints.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Checkpoints required before skipping"
      className={`
        absolute inset-0 z-50
        flex items-center justify-center
        bg-black/80 backdrop-blur-sm
        transition-opacity duration-300
        ${visible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      <div className="
        bg-white border border-gray-200 rounded-xl
        p-6 md:p-8
        max-w-lg w-full mx-4
        shadow-2xl
      ">

        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-amber-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 leading-tight">
              Checkpoints required before skipping
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              You tried to jump to <span className="font-mono font-medium text-gray-700">{formatTime(targetTime)}</span>
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{total}</p>
            <p className="text-xs text-gray-500 mt-0.5">In range</p>
          </div>
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{answeredCheckpoints.length}</p>
            <p className="text-xs text-green-600 mt-0.5">Answered</p>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{unansweredCheckpoints.length}</p>
            <p className="text-xs text-amber-600 mt-0.5">Unanswered</p>
          </div>
        </div>

        {/* Unanswered checkpoint list */}
        {unansweredCheckpoints.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Unanswered checkpoints
            </p>
            <ul className="space-y-2">
              {unansweredCheckpoints.map((cp) => (
                <li
                  key={cp.id}
                  className="flex items-start gap-2.5 text-sm"
                >
                  <span className="
                    flex-shrink-0 mt-0.5
                    w-5 h-5 rounded-full
                    bg-amber-100
                    flex items-center justify-center
                  ">
                    <svg className="w-3 h-3 text-amber-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/>
                    </svg>
                  </span>
                  <span className="font-mono text-xs text-gray-400 w-11 flex-shrink-0 pt-px">
                    {formatTime(cp.timestamp)}
                  </span>
                  <span className="text-gray-700 leading-snug line-clamp-2">
                    {cp.question}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onContinueWatching}
            className="
              flex-1 rounded-lg border border-gray-300 bg-white
              px-4 py-2.5 text-sm font-medium text-gray-700
              hover:bg-gray-50
              focus:outline-none focus:ring-2 focus:ring-gray-400
              transition-colors
            "
          >
            Continue watching
          </button>
          <button
            type="button"
            onClick={onAnswerCheckpoints}
            className="
              flex-1 rounded-lg bg-blue-600
              px-4 py-2.5 text-sm font-medium text-white
              hover:bg-blue-700
              focus:outline-none focus:ring-2 focus:ring-blue-500
              transition-colors
            "
          >
            Answer {unansweredCheckpoints.length === 1 ? 'checkpoint' : 'checkpoints'} →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeekGuardDialog;
