import { useEffect, useLayoutEffect, useRef } from 'react';
import type { PixelGrid } from '../types/quantiser.ts';
import { scrollForCentre, viewCentre } from '../utils/panGeometry.ts';
import type { Offsets, Point, ViewMetrics } from '../utils/panGeometry.ts';

/** The two scrollports to hold together, and everything that changes what they are showing. */
interface LinkedPanes {
  /**
   * The scrollports themselves, `null` until they mount — deliberately **not** refs to them.
   *
   * A `RefObject`'s identity never changes, so an effect that depended on one could not tell that the
   * element inside it had been swapped for a different one. The preview does exactly that: choosing
   * a layout replaces both scrollports, and with refs the listeners below stayed attached to two
   * elements no longer in the document — the panes simply stopped moving together, silently, with
   * nothing in the DOM to show for it. Passing the elements makes the dependency the thing that
   * actually changed, which is what the caller holds them in state for.
   */
  readonly first: HTMLDivElement | null;
  readonly second: HTMLDivElement | null;
  /**
   * Screen pixels per **source** pixel — one number, because both panes stand at the same one.
   *
   * That equality is what the link is built on rather than a coincidence to exploit: see
   * `src/utils/panGeometry.ts`, and the `zoom * grid` the result canvas is drawn at.
   */
  readonly scale: number;
  /** Not read, but changing it resizes the result canvas, so the pair has to be squared up again. */
  readonly grid: PixelGrid | null;
  /** Not read either, and here for the same reason: a new image is a new size in the first pane. */
  readonly sourceWidth: number;
  readonly sourceHeight: number;
}

/**
 * Two views of one artwork, kept on the same spot as the magnification changes under them.
 *
 * Two jobs that cannot be separated, because both are the same conversion. **Linking:** moving either
 * pane moves the other to the equivalent region — in source pixels, never by copying scroll offsets,
 * which mean different places in panes whose content is a different size. **Anchoring:** a change of
 * zoom or grid re-writes both panes so the point that was in the middle is still in the middle,
 * instead of leaving the offsets numerically untouched while the canvas doubles beneath them.
 *
 * A hook rather than lines in `ImageComparison`, because it needs both elements at once and neither
 * component owns the pair; and in `src/hooks/` rather than `src/utils/` because every line of it
 * reads or writes the DOM. It has one call site and is not built to have more — the extraction is
 * what keeps the component it serves inside the file-size rule, not a seam for a future caller.
 *
 * **The centre lives in a ref, updated on every scroll, and it has to.** Reading it back at the
 * moment the scale changes is too late: the browser has already clamped the offsets to the resized
 * content by the time any effect can look, so on the way *out* of a zoom the old position is simply
 * gone. Tracking it as the user moves is the only way to still have it.
 */
export function useLinkedPanes({ first, second, scale, grid, sourceWidth, sourceHeight }: LinkedPanes): void {
  const centre = useRef<Point | null>(null);
  // What each pane was last *told* to show, as the pane itself rounded it. A scroll event reporting
  // exactly this is the echo of that write, and answering it would send the pair round the loop
  // A → B → A for as long as the rounding disagreed. Suppressing the echo is what breaks it; a
  // tolerance on the comparison would only make the loop quieter, and is the fix to reach past.
  const echoed = useRef(new WeakMap<Element, Offsets>());

  // A *layout* effect: the canvases already carry their new CSS size in this commit, so `scrollWidth`
  // is the new one, and writing the offsets before the browser paints is what turns a visible jump
  // into no jump at all. The same work in `useEffect` shows the wrong region for one frame.
  useLayoutEffect(() => {
    if (first === null || second === null) return;

    const held = centre.current;
    // Nothing to restore on the first pass — there is only wherever the panes already are, which is
    // what everything after this is measured against.
    if (held === null) {
      centre.current = viewCentre(metricsOf(first), scale);
      return;
    }
    // Also what puts a freshly mounted pair back where the reader left the last one: a layout change
    // hands over two scrollports at offset zero, and the centre they are owed is the one still held.
    for (const pane of [first, second]) showCentre(pane, held, scale, echoed.current);
  }, [first, second, scale, grid, sourceWidth, sourceHeight]);

  useEffect(() => {
    if (first === null || second === null) return;
    const [a, b] = [first, second];

    const listen = (moved: HTMLDivElement, other: HTMLDivElement) => {
      const onScroll = () => {
        const echo = echoed.current.get(moved);
        if (echo !== undefined && echo.left === moved.scrollLeft && echo.top === moved.scrollTop) {
          echoed.current.delete(moved);
          return;
        }
        const held = viewCentre(metricsOf(moved), scale);
        centre.current = held;
        showCentre(other, held, scale, echoed.current);
      };
      // Passive: nothing here cancels the scroll, and saying so keeps it off the main thread's
      // critical path — which matters, because a drag fires this on every pointer move.
      moved.addEventListener('scroll', onScroll, { passive: true });
      return () => {
        moved.removeEventListener('scroll', onScroll);
      };
    };

    const release = [listen(a, b), listen(b, a)];
    return () => {
      for (const stop of release) stop();
    };
  }, [first, second, scale]);
}

/**
 * The six numbers `panGeometry` works from, read off a real scrollport in one go.
 *
 * The content is measured from the child rather than taken from `scrollWidth`, which reports the box
 * back for anything smaller than it — see {@link ViewMetrics}. The child is the canvas, or the
 * placeholder that stands in for it; the fallback covers neither being there, where the two answers
 * coincide anyway because a scrollport with no content has nothing to scroll.
 */
function metricsOf(element: HTMLDivElement): ViewMetrics {
  const content = element.firstElementChild?.getBoundingClientRect();
  return {
    scrollLeft: element.scrollLeft,
    scrollTop: element.scrollTop,
    contentWidth: content?.width ?? element.scrollWidth,
    contentHeight: content?.height ?? element.scrollHeight,
    clientWidth: element.clientWidth,
    clientHeight: element.clientHeight,
  };
}

/** Move a pane to show `centre`, and remember what it settled on so its own scroll event is known. */
function showCentre(
  element: HTMLDivElement,
  centre: Point,
  scale: number,
  echoed: WeakMap<Element, Offsets>,
): void {
  const from = { left: element.scrollLeft, top: element.scrollTop };
  const offsets = scrollForCentre(centre, metricsOf(element), scale);
  element.scrollLeft = offsets.left;
  element.scrollTop = offsets.top;
  const took = { left: element.scrollLeft, top: element.scrollTop };

  // **Only a write that moved something is owed an event.** A scrollport that was already where it
  // was being sent stays silent, so an echo recorded here would never be matched, never deleted, and
  // would sit waiting to swallow the next genuine scroll that happened to land on those exact
  // offsets — after which that pane stops driving its partner. It is a reachable case, not a
  // theoretical one: the two panes cover slightly different extents, so one reaches its limit first
  // and every further write to it clamps to where it already is.
  if (took.left === from.left && took.top === from.top) return;
  // Read back rather than stored as asked for: offsets are kept in whole units of a grain that is one
  // CSS pixel only at 100% browser zoom, so what the scroll event will report is this, not `offsets`.
  echoed.set(element, took);
}
