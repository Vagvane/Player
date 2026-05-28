import type { ThumbnailCue } from '../types/video';

/**
 * Regex for a single WebVTT cue timing line.
 *
 * Captures:
 *   1: start timestamp ("HH:MM:SS.mmm" or "MM:SS.mmm")
 *   2: end   timestamp (same format)
 *
 * Per the WebVTT spec, the hours component is optional. Any trailing
 * cue settings (e.g. `align:start line:0`) are tolerated but ignored.
 */
const TIMING_RE = /^\s*((?:\d+:)?\d{1,2}:\d{2}\.\d{1,3})\s*-->\s*((?:\d+:)?\d{1,2}:\d{2}\.\d{1,3})(?:\s+.*)?$/;

/**
 * Regex for the cue payload pointing at a sprite region.
 *
 * Matches `<url>#xywh=<x>,<y>,<w>,<h>` with optional whitespace around
 * the numbers. Captures:
 *   1: sprite URL (everything before `#xywh=`)
 *   2..5: x, y, width, height as numeric strings
 */
const PAYLOAD_RE = /^(.+?)#xywh=\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*$/;

/**
 * Parse a single WebVTT timestamp into seconds.
 *
 * Accepts both four-field (`HH:MM:SS.mmm`) and three-field
 * (`MM:SS.mmm`) forms — the hours component is optional per the
 * WebVTT spec. Milliseconds are converted to fractional seconds.
 *
 * Returns `NaN` for any input that does not match the grammar (empty
 * string, missing milliseconds, non-numeric fields). Callers should
 * treat `NaN` as a parse failure and skip the offending cue.
 *
 * @param timestamp - A WebVTT timestamp string.
 * @returns Total seconds as a number, or `NaN` on parse failure.
 *
 * @example
 * parseVTTTimestamp('00:00:02.000') // 2
 * parseVTTTimestamp('01:02:03.500') // 3723.5
 * parseVTTTimestamp('02:03.500')    // 123.5  (no hours)
 * parseVTTTimestamp('garbage')      // NaN
 */
export function parseVTTTimestamp(timestamp: string): number {
  if (typeof timestamp !== 'string') return NaN;

  const parts = timestamp.trim().split(':');
  if (parts.length < 2 || parts.length > 3) return NaN;

  let hours = 0;
  let minutes: number;
  let secondsField: string;

  if (parts.length === 3) {
    hours = Number(parts[0]);
    minutes = Number(parts[1]);
    secondsField = parts[2];
  } else {
    minutes = Number(parts[0]);
    secondsField = parts[1];
  }

  const secMatch = /^(\d{1,2})\.(\d{1,3})$/.exec(secondsField);
  if (!secMatch) return NaN;

  const seconds = Number(secMatch[1]);
  const millis = Number(secMatch[2].padEnd(3, '0'));

  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return NaN;
  }

  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

/**
 * Parse a WebVTT thumbnail-sprite track into structured cues.
 *
 * Expected input format (each cue is two non-blank lines, separated by
 * blank lines, with a `WEBVTT` signature on the first line of the file):
 *
 * ```
 * WEBVTT
 *
 * 00:00:00.000 --> 00:00:02.000
 * sprite.jpg#xywh=0,0,160,90
 *
 * 00:00:02.000 --> 00:00:04.000
 * sprite.jpg#xywh=160,0,160,90
 * ```
 *
 * Behavior:
 *   - Returns `[]` if the input is missing the `WEBVTT` signature.
 *   - Skips cues whose timing line or `#xywh=` payload fails to parse,
 *     logging a `console.warn` for each. Well-formed cues that follow
 *     are still returned — one bad cue does not poison the whole file.
 *   - Optional cue identifiers (a line of text preceding the timing
 *     line within a cue block) are ignored.
 *
 * @param vttContent - Raw contents of a `.vtt` file.
 * @returns Array of {@link ThumbnailCue}, in source order.
 */
export function parseVTT(vttContent: string): ThumbnailCue[] {
  if (typeof vttContent !== 'string' || vttContent.length === 0) {
    return [];
  }

  const normalized = vttContent.replace(/\r\n?/g, '\n').trim();
  if (!/^WEBVTT(\s|$)/.test(normalized)) {
    console.warn('parseVTT: missing WEBVTT signature; returning empty cue list');
    return [];
  }

  const blocks = normalized.split(/\n{2,}/).slice(1);
  const cues: ThumbnailCue[] = [];

  for (const rawBlock of blocks) {
    const lines = rawBlock.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const timingIdx = lines.findIndex((l) => TIMING_RE.test(l));
    if (timingIdx === -1) {
      console.warn('parseVTT: cue block has no timing line, skipping:', rawBlock);
      continue;
    }

    const timingMatch = TIMING_RE.exec(lines[timingIdx])!;
    const startTime = parseVTTTimestamp(timingMatch[1]);
    const endTime = parseVTTTimestamp(timingMatch[2]);

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      console.warn('parseVTT: invalid timestamp in cue, skipping:', lines[timingIdx]);
      continue;
    }

    const payloadLine = lines[timingIdx + 1];
    if (!payloadLine) {
      console.warn('parseVTT: cue missing payload line, skipping:', rawBlock);
      continue;
    }

    const payloadMatch = PAYLOAD_RE.exec(payloadLine);
    if (!payloadMatch) {
      console.warn('parseVTT: cue payload missing #xywh= coordinates, skipping:', payloadLine);
      continue;
    }

    const [, spriteUrl, x, y, width, height] = payloadMatch;
    cues.push({
      startTime,
      endTime,
      spriteUrl,
      x: Number(x),
      y: Number(y),
      width: Number(width),
      height: Number(height),
    });
  }

  return cues;
}
