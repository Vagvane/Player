/**
 * Format a duration in seconds as a zero-padded clock string.
 *
 * Output is `MM:SS` for durations under one hour and `HH:MM:SS` for
 * one hour or longer. Invalid input (NaN, `undefined`, negative numbers,
 * `±Infinity`) collapses to `"00:00"` so the player UI never renders
 * `"NaN:NaN"` or jumps to a negative timer.
 *
 * Fractional seconds are floored — partial seconds never round up to the
 * next tick, matching how playhead time is displayed in most players.
 *
 * @param seconds - Duration in seconds. May be `undefined` to tolerate
 *   uninitialized media-element readouts.
 * @returns Zero-padded clock string.
 *
 * @example
 * formatTime(0)      // "00:00"
 * formatTime(65)     // "01:05"
 * formatTime(3661)   // "01:01:01"
 * formatTime(-5)     // "00:00"
 * formatTime(NaN)    // "00:00"
 * formatTime(undefined) // "00:00"
 *
 * // Unit-test cases:
 * //   expect(formatTime(0)).toBe('00:00');
 * //   expect(formatTime(9)).toBe('00:09');
 * //   expect(formatTime(60)).toBe('01:00');
 * //   expect(formatTime(65)).toBe('01:05');
 * //   expect(formatTime(599)).toBe('09:59');
 * //   expect(formatTime(3599)).toBe('59:59');
 * //   expect(formatTime(3600)).toBe('01:00:00');
 * //   expect(formatTime(3661)).toBe('01:01:01');
 * //   expect(formatTime(36000)).toBe('10:00:00');
 * //   expect(formatTime(-5)).toBe('00:00');
 * //   expect(formatTime(NaN)).toBe('00:00');
 * //   expect(formatTime(undefined)).toBe('00:00');
 * //   expect(formatTime(Infinity)).toBe('00:00');
 * //   expect(formatTime(65.9)).toBe('01:05'); // floors fractional seconds
 */
export function formatTime(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return '00:00';
  }

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const pad = (n: number): string => n.toString().padStart(2, '0');

  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
    : `${pad(minutes)}:${pad(secs)}`;
}
