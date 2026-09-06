import { useCallback, useEffect, useRef, useState } from 'react';
import type { FocusEventHandler, RefCallback } from 'react';

/** Which way a box holds more than it is showing, which is what every affordance below hangs on. */
export interface Overflow {
  readonly x: boolean;
  readonly y: boolean;
}

const NO_OVERFLOW: Overflow = { x: false, y: false };

/** The three attributes a keyboard-reachable scrolling region needs, plus the pair that latch it. */
interface RegionProps {
  readonly role: 'group' | undefined;
  readonly 'aria-label': string | undefined;
  readonly tabIndex: 0 | undefined;
  readonly onFocus: FocusEventHandler;
  readonly onBlur: FocusEventHandler;
}

/** Everything a component needs to make a scrollport reachable, and to know it has become one. */
export interface ScrollableRegion<E extends HTMLElement> {
  /** Put on the scrollport. Memoised, so React is not re-attaching the ref on every render. */
  readonly attach: RefCallback<E>;
  /** Read by the callers that also *do* something with the overflow — the pan viewport's cursor. */
  readonly overflow: Overflow;
  /** Spread onto the scrollport, before its own `className` and `ref`. */
  readonly regionProps: RegionProps;
}

/**
 * A box that scrolls, named and reachable exactly while it has something to scroll.
 *
 * **A scrolling region is reachable by keyboard only if something makes it focusable, and announced
 * only if something names it — but a box with nothing to scroll is a tab stop that does nothing.**
 * So all three attributes arrive with the overflow and leave with it, which is the rule
 * `PanViewport` wrote down first and the reason this is a hook rather than a paragraph repeated at
 * four call sites. Chromium makes a keyboard-scrollable box focusable **on its own** when it has no
 * focusable descendants, so the app does not get to decide whether these are tab stops; it only gets
 * to decide whether they are named ones. The compiled prompt's `<pre>` was the one that was not —
 * one stop out of 123 in the Studio tab, with 15,077px of scroll, no role and no accessible name.
 *
 * **The overflow is the browser's own answer**, `scrollWidth > clientWidth`, rather than the
 * content's size modelled against the box's: borders and a scrollbar that has appeared are already
 * in it, so there is nothing left to be wrong about where an engine differs. Both sides are
 * integer-rounded, so an overflow of less than a pixel reads as none — which is the answer worth
 * having either way.
 *
 * **Two observers, each established once.** `children` is a `ReactNode` a component cannot depend
 * on, and the element inside can be *replaced* rather than merely resized — `ImageComparison` swaps
 * its placeholder for the `<canvas>` a result brings — so the child list is watched rather than the
 * effect re-run: a `MutationObserver` points the one `ResizeObserver` at whatever the children now
 * are, and a `ResizeObserver` delivers an entry as soon as it starts observing, so pointing it at a
 * new child is also a measure of it. An observation re-established on every commit would put a
 * disconnect, an allocation and a forced synchronous layout into every render — two panes are
 * mounted at once, four in wipe mode, and one of them renders twice per drag.
 *
 * **`holdsFocus` is why the attributes do not simply follow the overflow.** Dropping `tabIndex` from
 * the element that currently has focus blurs it to `<body>`, so the next Tab restarts at the top of
 * the page with nothing said about why — the same loss {@link useConfirmInPlace} exists to stop, from
 * the other direction.
 */
export function useScrollableRegion<E extends HTMLElement>(label: string): ScrollableRegion<E> {
  const [overflow, setOverflow] = useState<Overflow>(NO_OVERFLOW);
  const [holdsFocus, setHoldsFocus] = useState(false);
  const isReachable = overflow.x || overflow.y || holdsFocus;
  /** The pair watching whatever is currently attached, so detaching can let go of exactly them. */
  const watching = useRef<{ sizes: ResizeObserver; childList: MutationObserver } | null>(null);

  /**
   * **The observation is established from the ref callback, not from a mount-time effect**, and that
   * is a correctness requirement rather than a preference.
   *
   * Two of the four call sites render their scrolling box **conditionally** — the quantiser's two
   * report lists exist only once the worker has answered, and the panels around them mount long
   * before it does. An effect with an empty dependency list runs once, at mount, against a ref that
   * is still `null`; it returns, and no later render re-establishes it. The list then arrives and
   * nothing is watching it, so `overflow` stays false for the life of the panel and the three
   * attributes below are never applied — the defect fixed here, silently reintroduced for half the
   * boxes it was fixed for.
   *
   * A ref callback fires when the element *arrives*, whenever that is, and again with `null` when it
   * goes. React invokes it only when the element or the callback's identity changes, so a box that
   * is always mounted still builds exactly one observer for the life of the component — which is the
   * property `PanViewport.test.tsx` pins, and the reason the effect had an empty dependency list in
   * the first place.
   */
  const attach = useCallback((element: E | null) => {
    watching.current?.sizes.disconnect();
    watching.current?.childList.disconnect();
    watching.current = null;

    if (element === null) {
      // The box has gone, so what was measured about it is no longer true of anything. The latch
      // goes with it: an element unmounted while focused fires no blur, and a stale `true` would
      // make the next box a tab stop before it had anything to scroll.
      setOverflow(NO_OVERFLOW);
      setHoldsFocus(false);
      return;
    }

    const measure = () => {
      const x = element.scrollWidth > element.clientWidth;
      const y = element.scrollHeight > element.clientHeight;
      // The same answer must be the same object, or React re-renders for a change nobody made.
      setOverflow((current) => (current.x === x && current.y === y ? current : { x, y }));
    };
    const sizes = new ResizeObserver(measure);
    // The box alone would not do: it is a frame sized by the page rather than by its content, so
    // content growing inside it is a resize only the child reports. The set is which children are
    // observed, so a swap lets go of the one that left rather than holding it detached.
    sizes.observe(element);
    const watched = new Set<Element>();
    const syncChildren = () => {
      for (const child of watched) {
        if (child.parentNode === element) continue;
        sizes.unobserve(child);
        watched.delete(child);
      }
      for (const child of element.children) {
        if (watched.has(child)) continue;
        sizes.observe(child);
        watched.add(child);
      }
    };
    syncChildren();

    // **It measures as well as re-points, and the second half is what a text node needs.** Two of
    // the four call sites scroll *text* rather than elements — the compiled prompt is one text node
    // inside a capped `<pre>` — and text that grows past the box changes neither the child list nor
    // any border box, so the `ResizeObserver` above never fires and re-pointing it at `children`
    // reconciles two empty collections. Watching `characterData` without re-measuring would have
    // been an option that bought nothing, which is worse than not watching it at all: the
    // declaration would read as though the case were covered.
    const childList = new MutationObserver(() => {
      syncChildren();
      measure();
    });
    childList.observe(element, { childList: true, characterData: true, subtree: true });
    watching.current = { sizes, childList };
  }, []);

  // React calls the ref with `null` before it unmounts the element, so the pair above is already
  // disconnected by then in every ordinary case. This is the one it does not cover: a component
  // unmounted while its box is still attached, where an observer left connected would hold the
  // whole subtree for as long as the page is open.
  useEffect(() => {
    return () => {
      watching.current?.sizes.disconnect();
      watching.current?.childList.disconnect();
      watching.current = null;
    };
  }, []);

  return {
    attach,
    overflow,
    regionProps: {
      role: isReachable ? 'group' : undefined,
      'aria-label': isReachable ? label : undefined,
      tabIndex: isReachable ? 0 : undefined,
      onFocus: () => {
        setHoldsFocus(true);
      },
      onBlur: () => {
        setHoldsFocus(false);
      },
    },
  };
}
