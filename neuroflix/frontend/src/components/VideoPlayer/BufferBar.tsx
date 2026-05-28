import { useMemo, type FC } from 'react';

/**
 * Props for {@link BufferBar}.
 */
export interface BufferBarProps {
  /**
   * The `<video>` element's `buffered` property — a `TimeRanges`
   * snapshot of every contiguous span of media currently in the MSE
   * source buffer. `null` before the element is mounted or when the
   * source has been torn down.
   */
  bufferedRanges: TimeRanges | null;
  /** Total media duration, in seconds. `0` while metadata is loading. */
  duration: number;
  /** Optional Tailwind class override appended to each range fill. */
  className?: string;
}

/**
 * Renders the gray fill that shows which portions of the media are
 * already downloaded and decodable.
 *
 * `TimeRanges` is a live, array-like DOM object — index lookups go
 * through `.start(i)` and `.end(i)` rather than `[i]`, and the count
 * lives on `.length`. The browser keeps the spans normalized (sorted,
 * non-overlapping), so a single pass is enough to translate them into
 * positioned `<div>` slices.
 *
 * Multiple ranges are normal after a seek: the original sequential
 * buffer remains, and a second span builds up around the new playhead
 * position. We render one slice per span so both stay visible to the
 * viewer (and reflect the underlying network state honestly).
 *
 * Layered below {@link ProgressBar} via render order — both are
 * absolutely-positioned, and the progress fill paints on top.
 */
const BufferBar: FC<BufferBarProps> = ({
  bufferedRanges,
  duration,
  className,
}) => {
  // Recompute only when the TimeRanges reference or duration changes —
  // the parent's `progress` handler reads `video.buffered` and pushes a
  // fresh snapshot, so reference equality is the right invalidation key.
  const ranges = useMemo<Array<{ start: number; end: number }>>(() => {
    if (!bufferedRanges || duration <= 0) return [];

    const out: Array<{ start: number; end: number }> = [];
    for (let i = 0; i < bufferedRanges.length; i += 1) {
      const start = (bufferedRanges.start(i) / duration) * 100;
      const end = (bufferedRanges.end(i) / duration) * 100;
      out.push({ start, end });
    }
    return out;
  }, [bufferedRanges, duration]);

  return (
    <>
      {ranges.map((range, index) => (
        <div
          // Index is a safe key here — the browser keeps TimeRanges in
          // sorted order, so element identity tracks position naturally.
          key={index}
          className={`
            absolute top-0 h-full
            bg-white/25
            rounded-full
            pointer-events-none
            ${className || ''}
          `}
          style={{
            left: `${range.start}%`,
            width: `${range.end - range.start}%`,
          }}
        />
      ))}
    </>
  );
};

export default BufferBar;
