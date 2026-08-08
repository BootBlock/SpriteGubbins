/**
 * Where a scrollport is looking, expressed in the source image's own pixels.
 *
 * Two panes show the same artwork at different resolutions — the second has been reduced by the
 * pixel grid — so neither one's scroll offsets mean anything to the other. A source pixel does: it
 * is the one coordinate both panes are a view of, and converting through it is what lets the pair
 * be compared, linked, and held still while the magnification changes underneath them.
 *
 * Pure, and deliberately knows nothing about elements. The caller reads the six numbers off its own
 * scrollport and hands them over, which is what keeps the arithmetic — the part that is actually
 * easy to get wrong — testable without a layout engine.
 *
 * **`scale` is screen pixels per *source* pixel**, never per drawn pixel. For the pane showing the
 * image as it arrived those are the same thing. For the pane showing the quantised result they are
 * not: one result pixel covers `grid` source pixels, so a result canvas drawn at `zoom * grid`
 * screen pixels per result pixel is at a `scale` of `zoom`, the same as its neighbour. That equality
 * is the whole point — it is what makes the two panes cover the same extent of the same artwork.
 */

/** A point in the source image's own pixels — the space the two panes are compared in. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Scroll offsets, in the units a scrollport reports and accepts them. */
export interface Offsets {
  readonly left: number;
  readonly top: number;
}

/**
 * What a scrollport says about itself, read off the element in one go.
 *
 * There is no padding term because the scrollport carries no padding: content starts at scroll
 * offset zero. That is a property `PanViewport` maintains on purpose — padding inside a scrolling
 * box displaces the content within the scroll coordinate space, which would put a `scale`-dependent
 * error into every conversion below, and engines disagree about whether the trailing edge of it is
 * part of `scrollWidth` at all.
 */
export interface ViewMetrics {
  readonly scrollLeft: number;
  readonly scrollTop: number;
  /**
   * How much content there actually is, in this scrollport's own coordinates.
   *
   * **Measured from the content, never taken from `scrollWidth`.** A scrollport's scrolling area is
   * its padding box or its content, whichever is *larger*, so `scrollWidth` reports the box back at
   * you for anything that fits inside it — and "fits" is precisely the case the two functions below
   * need to tell apart. It answers the travel available correctly either way, which is why
   * `contentWidth - clientWidth` is still the right thing to clamp against.
   */
  readonly contentWidth: number;
  readonly contentHeight: number;
  readonly clientWidth: number;
  readonly clientHeight: number;
}

/**
 * The source-image point in the middle of however much of the artwork is on screen.
 *
 * The middle rather than the top-left corner, because it is what the eye is on and what has to
 * survive a change of magnification. Anchoring the corner instead would hold still the one part of
 * the view the user is least likely to be looking at, and push their subject off the edge.
 *
 * **The middle of the *content*, not of the box**, and the difference only shows when the two are
 * not the same thing. A pane is as wide as its column whatever it is holding, so a sheet narrower
 * than that sits against the left edge with empty space beside it — and the middle of the box is
 * then a point in that emptiness, past the end of the image. Anchoring to it would send the next
 * zoom to an offset no scrollport can honour, which clamps, which lands the user at the far right
 * edge of their own artwork. Taking the middle of what is actually visible costs nothing in the
 * ordinary case — a full box *is* the visible region — and is the whole answer in this one.
 */
export function viewCentre(view: ViewMetrics, scale: number): Point {
  return {
    x: visibleMiddle(view.scrollLeft, view.clientWidth, view.contentWidth) / scale,
    y: visibleMiddle(view.scrollTop, view.clientHeight, view.contentHeight) / scale,
  };
}

/** The midpoint of the content on screen along one axis, in that scrollport's own coordinates. */
function visibleMiddle(offset: number, box: number, content: number): number {
  return (Math.max(offset, 0) + Math.min(offset + box, content)) / 2;
}

/**
 * The offsets that put `centre` back in the middle of the viewport, at whatever scale it is now.
 *
 * The inverse of {@link viewCentre}, clamped — so a centre near an edge, or one belonging to a pane
 * with more overflow than this one, resolves to the closest view that actually exists rather than
 * to an offset the scrollport would silently refuse.
 */
export function scrollForCentre(centre: Point, view: ViewMetrics, scale: number): Offsets {
  return {
    left: clampOffset(centre.x * scale - view.clientWidth / 2, view.contentWidth - view.clientWidth),
    top: clampOffset(centre.y * scale - view.clientHeight / 2, view.contentHeight - view.clientHeight),
  };
}

/**
 * Hold an offset inside a left-to-right scrollport's range, which runs from zero to its overflow.
 *
 * `Math.max(overflow, 0)` is not defensive tidying: a box larger than its content reports a negative
 * overflow, and an unguarded clamp would return that negative upper bound as the answer.
 *
 * The offsets assume a left-to-right scrollport; this app has no other kind, and this is the line an
 * RTL one would have to change.
 */
export function clampOffset(offset: number, overflow: number): number {
  return Math.min(Math.max(offset, 0), Math.max(overflow, 0));
}
