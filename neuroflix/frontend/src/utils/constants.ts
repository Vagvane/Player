/**
 * Application-wide constants for the Neuroflix player.
 *
 * Every export uses `as const` so values are deeply readonly and
 * literal-typed — TypeScript will reject accidental mutation and narrow
 * downstream comparisons (e.g. `QUALITY_LEVELS[0].name` is `'1080p'`,
 * not `string`).
 */

/**
 * Responsive layout breakpoints in CSS pixels.
 *
 * `mobile` is the lower bound rather than a true breakpoint — viewports
 * below `tablet` are treated as mobile. Match these to the corresponding
 * SCSS / Tailwind config so JS and CSS branch in lockstep.
 */
export const BREAKPOINTS = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
  ultrawide: 1920,
} as const;

/**
 * Player runtime tuning knobs.
 *
 * - `maxBufferLength`/`maxMaxBufferLength`: forward-buffer caps (seconds)
 *   used to keep memory bounded on long sessions; matches hls.js naming.
 * - `autoHideControlsDelay`: idle delay (ms) before the control bar
 *   fades during playback.
 * - `seekDebounceDelay`: debounce window (ms) for scrubber drag → seek.
 * - `checkpointThreshold`: timestamp tolerance (seconds) when matching
 *   the current playhead against a checkpoint trigger.
 * - `watermarkShiftInterval`: how often (ms) the forensic watermark
 *   repositions itself to defeat static screen-capture overlays.
 */
export const PLAYER_CONFIG = {
  maxBufferLength: 30,
  maxMaxBufferLength: 60,
  autoHideControlsDelay: 3000,
  seekDebounceDelay: 100,
  checkpointThreshold: 0.5,
  watermarkShiftInterval: 60000,
} as const;

/**
 * hls.js constructor options applied to every player instance.
 *
 * - `startLevel: 2` starts at 480p so the first segment loads quickly.
 *   ABR switches to higher quality within a few seconds once bandwidth is
 *   measured. Using -1 (auto) causes hls.js to pick 1080p on fast local
 *   connections — but our proxy mode adds R2 round-trip latency that ABR
 *   doesn't account for, producing a long buffering spinner.
 * - `abrEwmaDefaultEstimate` seeds the bandwidth estimator at 1 Mbps so
 *   ABR isn't artificially conservative on the first quality switch.
 * - `startFragPrefetch` begins loading the first segment in parallel with
 *   the video element attach — shaves ~200-400 ms off time-to-first-frame.
 * - `enableWorker` offloads MSE appends to a worker thread.
 * - `lowLatencyMode` is off — we serve VOD, not live.
 * - `backBufferLength` keeps a short rewind window without retaining
 *   the entire watched range in memory.
 * - `maxBufferLength` / `maxMaxBufferLength` cap forward buffering so RAM
 *   stays bounded on long sessions.
 */
export const HLS_CONFIG = {
  startLevel: 2,
  abrEwmaDefaultEstimate: 1_000_000,
  startFragPrefetch: true,
  enableWorker: true,
  lowLatencyMode: false,
  backBufferLength: 10,
  maxBufferLength: 30,
  maxMaxBufferLength: 60,
} as const;

/**
 * Advertised quality ladder, ordered highest → lowest.
 *
 * `bandwidth` is the target bitrate in bits per second and should track
 * what the encoder actually produces. The UI uses `name` for the
 * quality menu; ABR uses `height`/`bandwidth` to map a manifest level
 * to a label.
 */
export const QUALITY_LEVELS = [
  { name: '1080p', height: 1080, bandwidth: 5_000_000 },
  { name: '720p', height: 720, bandwidth: 2_500_000 },
  { name: '480p', height: 480, bandwidth: 1_000_000 },
  { name: '360p', height: 360, bandwidth: 500_000 },
] as const;

/**
 * Minimum tappable area for touch UI elements, in CSS pixels.
 *
 * `minimum` is the Apple HIG floor; `preferred` is the Material /
 * accessibility-audit recommended size and is what new controls should
 * target.
 */
export const TOUCH_TARGETS = {
  minimum: 44,
  preferred: 48,
} as const;

/**
 * Backend API route templates.
 *
 * Path segments prefixed with `:` are placeholders to be substituted at
 * call time (e.g. `:id` → a video UUID). Paths are relative to the API
 * base URL configured elsewhere.
 */
export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
  },
  videos: {
    getVideo: '/videos/:id',
    getStream: '/videos/:id/stream',
  },
  checkpoints: {
    submitAnswer: '/checkpoints/:id/answer',
  },
} as const;
