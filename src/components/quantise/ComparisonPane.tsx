import type { ReactNode, RefObject } from 'react';
import { Badge } from '../common/Badge.tsx';
import { PanViewport } from './PanViewport.tsx';

/**
 * What a pane is showing, how large to draw it, and the window it is placed in — a pane has all of
 * it or none.
 *
 * `magnification` is not one number for both panes: `zoom` for the sheet as it arrived, and
 * `zoom * grid` for the quantised one, whose pixels are `grid` times larger. Deliberately not the
 * `scale` `panGeometry` works in, which is per *source* pixel and is the same number for both
 * panes. This is the other side of that identity — the two differ by exactly the factor that makes
 * the two canvases cover the same extent of the same artwork.
 *
 * **`window` and `inset` are what hold that identity once the grid has an offset.** The lattice is
 * measured from the art rather than the corner, so the quantised image's first pixel on an axis can
 * be a *leading partial cell* — one pixel standing for only `offset` source pixels — and a canvas
 * drawn at a uniform magnification renders it a full cell wide, displacing everything after it by
 * the deficit. The pane therefore draws the canvas pulled back by exactly that deficit (`inset`)
 * inside a clipping `window` sized to the source's own extent, so every full cell lands on the
 * source pixels it actually covers and the partial cells show at the width they truly have. Both
 * panes carry the same window, which is also what `useLinkedPanes` measures — two contents of
 * identical extent, exact to convert between. The source pane's inset is zero and its window is its
 * own size; the structure is shared so neither pane is a special case.
 */
interface PaneContent {
  readonly image: ImageData;
  readonly magnification: number;
  /** The content extent in screen pixels — the source's size at the shared per-source-pixel scale. */
  readonly window: { readonly width: number; readonly height: number };
  /** How far the canvas is pulled up and left, in screen pixels, to land its cells on the source. */
  readonly inset: { readonly x: number; readonly y: number };
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
  /**
   * Whether what this pane is showing is about to be replaced.
   *
   * Optional because only one of the two panes can ever be waiting on anything: the sheet as it
   * arrived is already here, and it is the transform of it that takes a second.
   */
  readonly busy?: boolean;
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
  busy = false,
}: ComparisonPaneProps) {
  return (
    <figure className="space-y-2">
      <figcaption className="font-mono text-2xs text-ink-faint">{caption}</figcaption>
      {/* The positioning context the working overlay resolves against. `PanViewport` cannot be it: it
          is the scrollport, so anything absolutely positioned inside it would be pinned to the top-left
          of a *scrolled* sheet and slide away as the user pans. */}
      <div className="relative">
        {busy && (
          <>
            {/* A sheen crossing the frame, and a chip saying what it means. `pointer-events-none`
                throughout, because the pane below stays pannable while the next result is computed —
                the whole point of the transform having left the main thread is that nothing here
                stops working while it runs. */}
            <span
              aria-hidden="true"
              className="shimmer-surface animate-shimmer pointer-events-none absolute inset-0 z-10 rounded-xl"
            />
            {/* `Badge` says "live" for the third time in this change, and the wrapper is the only
                thing it cannot say for itself: where to sit, and what to sit *on*. The dark ground is
                the wrapper's because this chip lands on the user's image rather than on the app's own
                panel, where the badge's own translucent fill has nothing dependable behind it. */}
            <span className="pointer-events-none absolute top-2 right-2 z-10 rounded-full bg-foundry-950/80">
              <Badge tone="live">Quantising…</Badge>
            </span>
          </>
        )}
        <PanViewport label={label} viewportRef={viewportRef}>
          {content === null ? (
            placeholder
          ) : (
            // The clipping window `PaneContent` describes. It is the first child of the scrollport, so
            // it is also what `useLinkedPanes` measures as the content — which is the point: both
            // panes report the same extent, whatever their canvases overhang by.
            <div
              className="overflow-hidden"
              style={{ width: content.window.width, height: content.window.height }}
            >
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
                //
                // The board is what a transparent pixel shows, and it is on both panes rather than only the
                // keyed one: an imported PNG can arrive with alpha of its own, and an opaque sheet covers the
                // board completely, so it costs nothing where there is nothing to reveal.
                //
                // `block`, because an inline canvas sits on the text baseline and the window above would
                // clip the descender gap into a sliver of the artwork's last row.
                className="bg-checkerboard block transition-none"
                style={{
                  width: content.image.width * content.magnification,
                  height: content.image.height * content.magnification,
                  marginLeft: -content.inset.x,
                  marginTop: -content.inset.y,
                  imageRendering: 'pixelated',
                }}
              />
            </div>
          )}
        </PanViewport>
      </div>
    </figure>
  );
}
