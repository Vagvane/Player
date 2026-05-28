import { useEffect, useState } from 'react';
import { PLAYER_CONFIG } from '../utils/constants';

/**
 * CSS positioning offsets for a watermark overlay.
 *
 * Mirrors the corner/edge inset model used by `position: absolute` —
 * each field maps directly to the same-named CSS property and accepts
 * either a number (treated as pixels by the consumer) or any valid CSS
 * length string (e.g. `'50%'`, `'2rem'`).
 */
export interface WatermarkPosition {
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
}

export interface UseWatermarkResult {
  position: WatermarkPosition;
}

/**
 * Pre-defined positions the watermark cycles through. Six anchors —
 * two corners along each of the top/middle/bottom rails — give enough
 * spatial coverage that a static screen-capture crop or overlay can't
 * reliably hide the mark for more than one shift cycle.
 *
 * Frozen so a consumer mutating the returned object cannot poison the
 * shared rotation for other hook instances.
 */
const POSITIONS: readonly WatermarkPosition[] = Object.freeze([
  { top: 20, left: 20 },
  { top: 20, right: 20 },
  { bottom: 80, left: 20 },
  { bottom: 80, right: 20 },
  { top: '50%', left: 20 },
  { top: '50%', right: 20 },
]);

/**
 * Rotate a forensic watermark through a fixed set of anchor positions.
 *
 * The watermark moves on a {@link PLAYER_CONFIG.watermarkShiftInterval}
 * cadence (60 seconds by default). Shifting on a slow timer — rather
 * than every frame — defeats two specific recapture tactics:
 *
 *   1. **Static overlay masks.** An attacker who clips an opaque shape
 *      over one corner of the screen can hide a stationary watermark
 *      indefinitely. Cycling through six anchors guarantees the mark
 *      reappears outside any single-region mask within at most
 *      `5 * interval` (5 minutes) of viewing.
 *   2. **Single-frame crops.** Re-uploads built from a small number of
 *      sampled frames are unlikely to catch a mark that lives in a
 *      different region every minute.
 *
 * The rotation is deterministic (a simple round-robin) so that the
 * mark's trajectory can be reconstructed from a session's start time
 * if a leaked recording needs to be traced.
 *
 * @example
 * ```tsx
 * const { position } = useWatermark();
 * return (
 *   <div
 *     className="watermark"
 *     style={{ position: 'absolute', ...position }}
 *   >
 *     {userEmail}
 *   </div>
 * );
 * ```
 */
function useWatermark(): UseWatermarkResult {
  const [, setCurrentIndex] = useState<number>(0);
  const [position, setPosition] = useState<WatermarkPosition>(POSITIONS[0]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % POSITIONS.length;
        setPosition(POSITIONS[next]);
        return next;
      });
    }, PLAYER_CONFIG.watermarkShiftInterval);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return { position };
}

export default useWatermark;
