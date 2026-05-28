import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Defers loading a CSS background-image URL until the target element
 * enters the viewport.
 *
 * Unlike `<img loading="lazy">`, CSS `background-image` is not natively
 * lazy-loaded by browsers — every card triggers its sprite fetch the
 * moment the component mounts, flooding the proxy with concurrent R2
 * requests even for off-screen cards.
 *
 * This hook attaches an `IntersectionObserver` to `ref` and only sets
 * `bgUrl` (the string to use in `style.backgroundImage`) once the
 * element scrolls within `rootMargin` pixels of the viewport.  The
 * observer is disconnected after the first intersection so the element
 * stays loaded even if the user scrolls away.
 *
 * @param src          - The image URL to load lazily.
 * @param rootMargin   - Viewport expansion (pixels) before triggering.
 *                       Default `200px` pre-loads cards just off-screen
 *                       so there is no visible pop-in during normal scrolling.
 * @returns `{ ref, bgUrl }` — attach `ref` to the element, use `bgUrl`
 *          as the `backgroundImage` value (empty string until visible).
 *
 * @example
 * const { ref, bgUrl } = useLazyBackground(spriteUrl);
 * return <div ref={ref} style={{ backgroundImage: bgUrl ? `url(${bgUrl})` : undefined }} />;
 */
function useLazyBackground(
  src: string,
  rootMargin = '200px',
): { ref: RefObject<HTMLDivElement>; bgUrl: string } {
  const ref = useRef<HTMLDivElement>(null);
  const [bgUrl, setBgUrl] = useState('');

  useEffect(() => {
    if (!src) return;

    // If IntersectionObserver is not supported (very old browsers), load immediately.
    if (typeof IntersectionObserver === 'undefined') {
      setBgUrl(src);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setBgUrl(src);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [src, rootMargin]);

  return { ref, bgUrl };
}

export default useLazyBackground;
