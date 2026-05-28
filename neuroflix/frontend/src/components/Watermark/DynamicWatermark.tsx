import { FC } from 'react';
import useWatermark from '../../hooks/useWatermark';

export interface DynamicWatermarkProps {
  email: string;
  organization: string;
  className?: string;
}

/**
 * Forensic overlay that stamps the viewer's identity onto the playback
 * surface so any screen recording or re-upload carries traceable
 * provenance back to the leaking account.
 *
 * The mark is intentionally non-interactive (`pointer-events: none`,
 * `user-select: none`) and semi-transparent so it doesn't disrupt
 * viewing, but is opaque enough — with a dark backing chip and text
 * shadow — to survive recompression and contrast adjustment.
 *
 * Position is supplied by {@link useWatermark}, which rotates the mark
 * through six anchor points every 60 seconds. The 1s CSS transition
 * makes the shift visually smooth rather than jarring, while the slow
 * cadence still defeats static-mask and single-frame-crop recapture
 * tactics (see `useWatermark` for the threat model).
 */
const DynamicWatermark: FC<DynamicWatermarkProps> = ({ email, organization, className }) => {
  const { position } = useWatermark();

  return (
    <div
        className={`
        absolute z-10
        pointer-events-none select-none
        transition-all duration-1000 ease-in-out
        ${className || ''}
      `}
      style={{
        ...position,
        opacity: 0.5,
        fontSize: '14px',
        color: 'white',
        textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)',
        fontFamily: 'monospace',
      }}
    >
      <div className="bg-black/30 px-2 py-1 rounded">
        <div className="font-medium">{email}</div>
        <div className="text-xs opacity-80">{organization}</div>
      </div>
    </div>
  );
};

export default DynamicWatermark;
