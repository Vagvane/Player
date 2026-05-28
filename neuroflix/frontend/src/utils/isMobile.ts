/**
 * Device-detection helpers used by the player to pick gesture sets,
 * control layouts, and capability fallbacks (e.g. native HLS on iOS).
 *
 * All checks are user-agent / capability sniffs at call time — they are
 * intentionally not cached, so behavior follows DevTools device-mode
 * changes during development without a reload.
 *
 * Each function is SSR-safe: when `window` or `navigator` is absent
 * (server render, unit tests without jsdom), they return `false` /
 * `'desktop'` rather than throwing.
 */

const MOBILE_UA_RE = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
const IOS_UA_RE = /iPad|iPhone|iPod/;
const ANDROID_UA_RE = /Android/;

/** Tablet/mobile breakpoint in CSS pixels — anything narrower is a phone. */
const TABLET_MIN_WIDTH = 768;

/** Safely read `navigator.userAgent`, returning `''` when unavailable. */
function getUserAgent(): string {
  return typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string'
    ? navigator.userAgent
    : '';
}

/**
 * `true` when the user agent advertises a known mobile-OS token.
 *
 * Catches Android, iPhone/iPad/iPod, BlackBerry, Windows Phone
 * (IEMobile), and Opera Mini. Note: iPadOS 13+ reports a desktop UA by
 * default, so this returns `false` for those iPads — use
 * {@link isTouchDevice} together with this to catch them.
 */
export function isMobile(): boolean {
  return MOBILE_UA_RE.test(getUserAgent());
}

/**
 * `true` when the runtime exposes a touch input surface.
 *
 * Uses two complementary signals: the legacy `ontouchstart` event hook
 * and `navigator.maxTouchPoints` (which is the modern, more reliable
 * indicator and is how iPadOS-as-desktop-UA still reveals itself).
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const maxPoints =
    typeof navigator !== 'undefined' && typeof navigator.maxTouchPoints === 'number'
      ? navigator.maxTouchPoints
      : 0;
  return 'ontouchstart' in window || maxPoints > 0;
}

/**
 * `true` when the user agent matches an iOS device (iPhone / iPad / iPod).
 *
 * Caveat: iPadOS 13+ defaults to a desktop UA string, so newer iPads
 * may return `false` here. Combine with {@link isTouchDevice} if you
 * need to catch those as well.
 */
export function isIOS(): boolean {
  return IOS_UA_RE.test(getUserAgent());
}

/** `true` when the user agent matches an Android device. */
export function isAndroid(): boolean {
  return ANDROID_UA_RE.test(getUserAgent());
}

/**
 * Classify the current device into one of three coarse buckets.
 *
 * Combines UA sniffing with viewport width:
 *   - mobile UA + viewport `< 768px` → `'mobile'`
 *   - mobile UA + viewport `>= 768px` → `'tablet'`
 *   - everything else → `'desktop'`
 *
 * Width is read from `window.innerWidth` at call time, so the
 * classification reflects the current viewport (responsive resize,
 * device rotation, DevTools device mode).
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (!isMobile()) return 'desktop';
  const width = typeof window !== 'undefined' ? window.innerWidth : 0;
  return width < TABLET_MIN_WIDTH ? 'mobile' : 'tablet';
}
