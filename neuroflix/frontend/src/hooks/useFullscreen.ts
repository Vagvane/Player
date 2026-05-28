import { useCallback, useEffect, useState, type RefObject } from 'react';

/**
 * Vendor-prefixed surface area of the Fullscreen API. The standard DOM
 * lib only types the unprefixed members, so we widen the element and
 * document types here to silence TS without sprinkling `as any` at the
 * call sites.
 */
interface FullscreenCapableElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
  /** iOS Safari uses this on `<video>` specifically. */
  webkitEnterFullscreen?: () => void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
}

interface FullscreenCapableDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
}

const CHANGE_EVENTS = [
  'fullscreenchange',
  'webkitfullscreenchange',
  'mozfullscreenchange',
  'MSFullscreenChange',
] as const;

/**
 * `true` if the current document is in fullscreen, checked across every
 * vendor-prefixed property. Reading these once per change event is cheap
 * and avoids storing two sources of truth.
 */
function readFullscreenElement(): Element | null {
  const doc = document as FullscreenCapableDocument;
  return (
    doc.fullscreenElement ??
    doc.webkitFullscreenElement ??
    doc.mozFullScreenElement ??
    doc.msFullscreenElement ??
    null
  );
}

export interface UseFullscreenResult {
  isFullscreen: boolean;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  toggleFullscreen: () => void;
  /** `true` if the browser exposes any flavor of `requestFullscreen`. */
  isSupported: boolean;
}

/**
 * Manage fullscreen for a single element with vendor-prefix fallbacks.
 *
 * Browser compatibility:
 * - Chrome, Edge, Opera ≥ recent: unprefixed `requestFullscreen` /
 *   `exitFullscreen` / `fullscreenchange`.
 * - Safari (desktop): `webkitRequestFullscreen` /
 *   `webkitExitFullscreen` / `webkitfullscreenchange`.
 * - Safari (iOS): only supports fullscreen on `<video>` elements via
 *   `webkitEnterFullscreen`; arbitrary `<div>` containers cannot enter
 *   fullscreen at all. The hook reports `isSupported: true` in that
 *   environment but `enterFullscreen` is effectively a no-op for non-
 *   video targets — callers wanting iOS support should pass a video ref.
 * - Firefox (older): `mozRequestFullScreen` / `mozCancelFullScreen` /
 *   `mozfullscreenchange`. Modern Firefox accepts the unprefixed names.
 * - IE 11: `msRequestFullscreen` / `msExitFullscreen` / `MSFullscreenChange`.
 *
 * The change-event listener is the source of truth for `isFullscreen`:
 * the user can leave fullscreen with `Esc` without going through our
 * `exitFullscreen` method, so reacting to the event is the only way to
 * stay in sync.
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen(containerRef);
 *
 * return (
 *   <div ref={containerRef}>
 *     {isSupported && (
 *       <button onClick={toggleFullscreen}>
 *         {isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
 *       </button>
 *     )}
 *   </div>
 * );
 * ```
 */
function useFullscreen(elementRef: RefObject<HTMLElement>): UseFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const isSupported =
    typeof document !== 'undefined' &&
    (typeof document.documentElement.requestFullscreen === 'function' ||
      typeof (document.documentElement as FullscreenCapableElement)
        .webkitRequestFullscreen === 'function' ||
      typeof (document.documentElement as FullscreenCapableElement)
        .mozRequestFullScreen === 'function' ||
      typeof (document.documentElement as FullscreenCapableElement)
        .msRequestFullscreen === 'function');

  const enterFullscreen = useCallback(() => {
    const element = elementRef.current as FullscreenCapableElement | null;
    if (!element) return;

    const request =
      element.requestFullscreen?.bind(element) ??
      element.webkitRequestFullscreen?.bind(element) ??
      element.webkitEnterFullscreen?.bind(element) ??
      element.mozRequestFullScreen?.bind(element) ??
      element.msRequestFullscreen?.bind(element);

    if (!request) {
      console.warn('useFullscreen: requestFullscreen is not supported on this element');
      return;
    }

    try {
      const result = request();
      if (result && typeof (result as Promise<void>).then === 'function') {
        (result as Promise<void>).catch((err) => {
          // Common cause: not in a user-gesture handler, or the element
          // is detached. The change event won't fire, so isFullscreen
          // stays false — nothing else to reconcile.
          console.error('useFullscreen: enterFullscreen failed', err);
        });
      }
    } catch (err) {
      console.error('useFullscreen: enterFullscreen threw', err);
    }
  }, [elementRef]);

  const exitFullscreen = useCallback(() => {
    const doc = document as FullscreenCapableDocument;

    const exit =
      doc.exitFullscreen?.bind(doc) ??
      doc.webkitExitFullscreen?.bind(doc) ??
      doc.mozCancelFullScreen?.bind(doc) ??
      doc.msExitFullscreen?.bind(doc);

    if (!exit) {
      console.warn('useFullscreen: exitFullscreen is not supported');
      return;
    }

    try {
      const result = exit();
      if (result && typeof (result as Promise<void>).then === 'function') {
        (result as Promise<void>).catch((err) => {
          console.error('useFullscreen: exitFullscreen failed', err);
        });
      }
    } catch (err) {
      console.error('useFullscreen: exitFullscreen threw', err);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(readFullscreenElement() !== null);
    };

    for (const eventName of CHANGE_EVENTS) {
      document.addEventListener(eventName, handleChange);
    }

    // Reconcile once on mount in case the document was already in
    // fullscreen when the hook attached (e.g. component remounted while
    // the user was already viewing fullscreen).
    handleChange();

    return () => {
      for (const eventName of CHANGE_EVENTS) {
        document.removeEventListener(eventName, handleChange);
      }
    };
  }, []);

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    isSupported,
  };
}

export default useFullscreen;
