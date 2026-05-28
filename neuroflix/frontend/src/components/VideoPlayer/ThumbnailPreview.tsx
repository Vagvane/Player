import { useMemo, type CSSProperties, type FC } from 'react';
import type { ThumbnailCue } from '../../types/video';

/**
 * Props for {@link ThumbnailPreview}.
 */
export interface ThumbnailPreviewProps {
  /** Sprite-sheet cue selected for the hover position. */
  thumbnail: ThumbnailCue;
  /**
   * Pointer position in viewport coordinates. `x` is the cursor's
   * `clientX` at the moment of hover; `y` is the top of the timeline
   * strip (the bubble is then positioned *above* this point).
   */
  position: { x: number; y: number };
  /** Pre-formatted clock string (e.g. `"01:23"`) shown beneath the bubble. */
  time: string;
  /** Optional Tailwind class override for the outer positioning wrapper. */
  className?: string;
}

/** Horizontal breathing room from the viewport edge, in pixels. */
const VIEWPORT_PADDING = 10;
/** Vertical gap between the bubble bottom and the top of the timeline, in pixels. */
const TIMELINE_GAP = 14;
/**
 * Approximate height of the label below the sprite (line-height ~20px + margin).
 * Used for vertical clamping so the bubble never renders above the viewport.
 */
const LABEL_HEIGHT_APPROX = 28;

/**
 * The floating scrub-bar preview bubble.
 *
 * Sprite-sheet technique
 * ----------------------
 * Each thumbnail in a WebVTT thumbnail track is a sub-region of one
 * large sprite image — we set the cue's region as a CSS background on
 * a fixed-size box and let `background-position` clip the rest:
 *
 *   width:  cue.width   px
 *   height: cue.height  px
 *   background-image: url(spriteUrl)
 *   background-position: -cue.x px -cue.y px
 *
 * The browser composites the offset on the GPU, so a hover-driven
 * change in `background-position` repaints at compositor cost only —
 * no decode work, no layout, no layer reflow. That's what makes
 * sprite previews feel instant compared with one-image-per-cue.
 *
 * Viewport boundary clamping
 * --------------------------
 * The bubble is centered on the cursor by default
 * (`translate(-50%, -100%)`), so its left edge sits at
 * `position.x - cue.width / 2`. At the extreme ends of the scrub bar
 * that edge spills past the viewport — left of `0` or right of
 * `window.innerWidth`. We clamp the anchor `x` so the bubble stays
 * fully on-screen with a small `VIEWPORT_PADDING` margin, matching
 * native YouTube / Netflix behaviour.
 */
const ThumbnailPreview: FC<ThumbnailPreviewProps> = ({
  thumbnail,
  position,
  time,
  className,
}) => {
  const positionStyle = useMemo<CSSProperties>(() => {
    const half = thumbnail.width / 2;
    let left = position.x;

    // Horizontal clamping: keep bubble fully within the viewport.
    // `window.innerWidth` is safe here: this component never renders
    // server-side (Vite SPA, and the parent gates on `isHovering`
    // which is always set in a browser event handler).
    if (left - half < VIEWPORT_PADDING) {
      left = half + VIEWPORT_PADDING;
    } else if (left + half > window.innerWidth - VIEWPORT_PADDING) {
      left = window.innerWidth - half - VIEWPORT_PADDING;
    }

    // Vertical clamping: the bubble is centred on `position.y` and then
    // shifted up by its full height + TIMELINE_GAP.  If the scrub bar is
    // near the top of the viewport the bubble would clip above y=0, so we
    // clamp `top` so the bubble's top edge stays at least at y=0.
    const totalBubbleHeight = thumbnail.height + LABEL_HEIGHT_APPROX;
    const minTop = totalBubbleHeight + TIMELINE_GAP;
    const top = Math.max(position.y, minTop);

    return {
      left: `${left}px`,
      top: `${top}px`,
      transform: 'translate(-50%, -100%)',
      marginTop: `-${TIMELINE_GAP}px`,
    };
  }, [position.x, position.y, thumbnail.width, thumbnail.height]);

  return (
    <div
      className={`
        fixed z-50 pointer-events-none
        ${className || ''}
      `}
      style={positionStyle}
    >
      {/*
        Two-div structure to avoid border clipping the sprite tile.
        Tailwind's global box-sizing: border-box means that putting
        border-2 on the same div as width/height would shrink the
        content area by 4px on each axis, clipping the background tile.
        Instead the border lives on the outer wrapper and the inner div
        gets the full tile dimensions with no border.
      */}
      <div
        className="border-2 border-white/90 rounded-sm overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.85)] mb-2"
        role="img"
        aria-label={`Preview at ${time}`}
      >
        <div
          style={{
            width: `${thumbnail.width}px`,
            height: `${thumbnail.height}px`,
            backgroundColor: 'black',
            backgroundImage: `url(${thumbnail.spriteUrl})`,
            backgroundPosition: `-${thumbnail.x}px -${thumbnail.y}px`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'auto',
          }}
        />
      </div>

      <div
        className="
          text-white text-sm font-semibold font-mono
          text-center
          drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]
        "
      >
        {time}
      </div>
    </div>
  );
};

export default ThumbnailPreview;
