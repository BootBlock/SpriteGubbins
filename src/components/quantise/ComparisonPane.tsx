import type { ReactNode, RefObject } from 'react';
import { PanViewport } from './PanViewport.tsx';

/**
 * What a pane is showing, and how large to draw it — a pane has both or it has neither.
 *
 * One field would do if the magnification were the same everywhere, and it is not: `zoom` for the
 * sheet as it arrived, `zoom * grid` for the quantised one, whose pixels are `grid` times larger.
 * Deliberately not the `scale` `panGeometry` works in, which is per *source* pixel and is the same
 * number for both panes. This is the other side of that identity — the two differ by exactly the
 * factor that makes the two canvases cover the same extent of the same artwork.
 */
interface PaneContent {
  readonly image: ImageData;
  readonly magnification: number;
}

interface ComparisonPaneProps {
  /** What this pane is showing and how big it is — the line above the frame. */
  readonly caption: ReactNode;
  /**
   * Names the scrolling *region*, not the picture.
   *
   * The canvas already carries the picture's name in {@link alt}, and repeating it would have a
   * screen reader say the same words twice while explaining neither the tab stop nor what it is for.
   * It stops at naming — an instruction belongs in the tooltip beside the zoom control, which the
   * sighted keyboard user can actually reach.
   */
  readonly label: string;
  readonly viewportRef: RefObject<HTMLDivElement | null>;
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  /** `null` where there is nothing to draw yet, which is when {@link placeholder} takes its place. */
  readonly content: PaneContent | null;
  readonly alt: string;
  readonly placeholder: ReactNode;
}

/**
 * One side of the comparison: a caption, and a frame the image is looked at through.
 *
 * The zoom is applied as a CSS size over a backing store that stays at the image's own dimensions, so
 * magnifying costs nothing and never resamples: one drawn pixel becomes a square of screen pixels
 * rather than an interpolation of its neighbours. `pixelated` is what holds that true at the last
 * step — a smoothed preview of a nearest-neighbour result would blur exactly the edges the user is
 * here to judge, and would make a failed transform look like a successful one.
 */
export function ComparisonPane({
  caption,
  label,
  viewportRef,
  canvasRef,
  content,
  alt,
  placeholder,
}: ComparisonPaneProps) {
  return (
    <figure className="space-y-2">
      <figcaption className="font-mono text-[10px] text-ink-faint">{caption}</figcaption>
      <PanViewport label={label} viewportRef={viewportRef}>
        {content === null ? (
          placeholder
        ) : (
          <canvas
            ref={canvasRef}
            width={content.image.width}
            height={content.image.height}
            role="img"
            aria-label={alt}
            // A magnification is a step, not a journey — and this one is load-bearing. `useLinkedPanes`
            // re-anchors the view in the same commit that resizes this canvas, which means it reads the
            // new size back out of the DOM before the browser paints. A transition on `width` makes that
            // read return the *old* size, and the scroll offset it computes is then clamped to the old
            // extent, so the view lands somewhere arbitrary instead of where it was.
            //
            // Nothing here asks for that transition. `transition-property` initialises to `all`, and the
            // reduced-motion catch-all at the bottom of `index.css` gives every element in the document a
            // non-zero `transition-duration` — so for a user who has asked their OS for less motion, this
            // canvas silently animates its own size and the anchoring breaks for them and nobody else.
            className="transition-none"
            style={{
              width: content.image.width * content.magnification,
              height: content.image.height * content.magnification,
              imageRendering: 'pixelated',
            }}
          />
        )}
      </PanViewport>
    </figure>
  );
}
