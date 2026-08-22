import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';

/**
 * How the surface sits under the control it belongs to.
 *
 * `stretch` takes the anchor's width — the combo box's suggestion list, which reads as a
 * continuation of the field it drops out of. `centred` keeps its own width and is centred on the
 * anchor — the tooltip's guidance card, which hangs off a 16px ⓘ button.
 */
export type SurfaceAlignment = 'stretch' | 'centred';

/**
 * How close a surface may come to the edge of the viewport before it is pulled back.
 *
 * A surface in the top layer contributes nothing to any scroll region and is re-pinned to its anchor
 * on every scroll, so anything past an edge is not merely off-screen — it is unreachable. That is
 * what makes clamping a correctness concern here rather than a polish one.
 */
const VIEWPORT_INSET = 8;

/**
 * How close the tooltip caret's *centre* may come to the corner of the card it sits on.
 *
 * The card's corner is a 12px `rounded-xl` curve, and the caret is a 10px square turned 45°, whose
 * outer corner therefore reaches ~7px beyond its centre. Keeping the centre 20px in leaves the whole
 * caret clear of the curve; the 12px radius alone would let its corner sit ~5px from the edge, on
 * the curve rather than beside it.
 */
const CARET_INSET = 20;

/**
 * Float a surface in the browser's **top layer**, under the control it belongs to.
 *
 * This exists because `z-index` cannot solve the problem it looks like it should. Every panel in
 * this app is a `glass-panel`, and `backdrop-filter` makes an element a **stacking context** — so a
 * `z-50` on a dropdown inside one is scoped to that panel, and the next panel down the page paints
 * straight over it. That is not a tuning problem: no value works, because the two are no longer
 * being compared. The same ancestor is also a **containing block for fixed-position descendants**,
 * so `position: fixed` alone doesn't escape it either, and an `overflow` ancestor (the atlas
 * calculator's scrolling panel) clips the surface whatever it is positioned against.
 *
 * `showPopover()` answers all three at once. The top layer paints above the entire document
 * including an open modal `<dialog>`, is not clipped by any ancestor, and — verified in Edge rather
 * than assumed — resolves `position: fixed` against the viewport rather than against the filtered
 * ancestor, which is what lets the coordinates below be plain `getBoundingClientRect()` values.
 * `manual` rather than `auto`: the combo box already owns Escape, Tab and the outside press, and an
 * auto popover's light-dismiss would fight all three.
 *
 * **The lift is an enhancement, and everything it needs is applied from here.** The call site styles
 * its surface the way it always did — positioned inside its own panel — and this adds the attribute,
 * the top layer and the coordinates on top, each of which overrides that. A browser without the
 * popover API (Safari 16, which this app otherwise runs on) therefore keeps the surface it had
 * before: mis-layered under the next panel, but present, positioned and operable. Calling
 * `showPopover()` unguarded there would throw inside React's commit phase instead, and with no error
 * boundary above these components that unmounts the whole app.
 *
 * Positioning is written straight to the node rather than held in state. A surface that re-rendered
 * on every scroll event would be doing React work to produce two numbers nothing else reads.
 */
export function useAnchoredSurface(
  anchorRef: RefObject<HTMLElement | null>,
  surfaceRef: RefObject<HTMLElement | null>,
  /** Whether the surface is currently mounted. */
  isShowing: boolean,
  alignment: SurfaceAlignment,
): void {
  // `useLayoutEffect`, not `useEffect`: this moves the surface, so running it after paint would show
  // one frame of it in its un-lifted place.
  useLayoutEffect(() => {
    // Less a guard than the trigger. A ref being filled in is not a render and cannot re-run an
    // effect by itself, so this is what re-runs it on the pass that mounts the surface.
    if (!isShowing) return;

    const anchor = anchorRef.current;
    const surface = surfaceRef.current;
    if (anchor === null || surface === null) return;
    if (typeof surface.showPopover !== 'function') return;

    // **Every measurement below is against the surface's *own* document, never this module's.** The
    // quantiser's comparison panel can be portalled into a window of its own, and React builds a
    // portalled subtree with the container's `ownerDocument` — so the anchor, the surface and the
    // viewport they have to stay inside are all in a document that is not the one this file's bare
    // `document` refers to. Reading the global there clamps a card in the detached window against
    // the *main* window's viewport and listens for scrolls that will never reach it, which puts the
    // guidance somewhere unreachable in that window and nowhere else. In the page the two are the
    // same object, so nothing changes for every other call site.
    const surfaceDocument = surface.ownerDocument;
    const surfaceWindow = surfaceDocument.defaultView;
    if (surfaceWindow === null) return;

    // The attribute is set here rather than in the markup so that it, the top layer and the
    // viewport coordinates below arrive together or not at all — a `popover` attribute on an
    // element that is never shown is `display: none` in the user-agent stylesheet.
    surface.setAttribute('popover', 'manual');
    surface.showPopover();
    surface.style.position = 'fixed';
    // The user-agent stylesheet gives a popover `inset: 0`; left alone, that fights the two offsets
    // `place` sets and over-constrains the box.
    surface.style.inset = 'auto';

    // The gap between anchor and surface stays the call site's own `mt-*` class, so it remains a
    // spacing token and stays correct in the un-lifted fallback — where the class is all there is.
    // The browser adds it on top of whatever `top` says, which is why `place` takes it back off.
    // Read once, outside `place`: it is set by a class and never changes, and re-reading it would
    // force a style recalculation on every scroll event.
    const gap = Number.parseFloat(surfaceWindow.getComputedStyle(surface).marginTop) || 0;

    // An arrow assigned to a `const`, not a `function` declaration: a hoisted declaration could be
    // called before the null checks above, so TypeScript declines to narrow `anchor`/`surface`
    // inside one and the two locals go back to being possibly-null.
    const place = () => {
      const box = anchor.getBoundingClientRect();
      const { offsetHeight: height, offsetWidth: width } = surface;
      // `documentElement.client*`, not `window.inner*`: the latter counts a classic scrollbar's
      // width, and every other number here — the anchor's rect, and the box a fixed-position
      // surface resolves `top`/`left` against — excludes it. Clamping to `innerWidth` leaves the
      // last ~15px of a surface underneath the scrollbar on Windows, which is unreachable rather
      // than merely off-centre. It costs nothing where scrollbars are overlays and the two agree.
      const viewportHeight = surfaceDocument.documentElement.clientHeight;
      const viewportWidth = surfaceDocument.documentElement.clientWidth;

      // Downwards by preference — that is where the form continues, and it is what both surfaces
      // read as. Upwards only where the surface genuinely does not fit below *and* there is more
      // room above, so a near-miss at the bottom of a long page doesn't send it flying over the
      // field. The clamp then covers the case where neither side has room for it at all.
      const roomBelow = viewportHeight - box.bottom - gap - VIEWPORT_INSET;
      const roomAbove = box.top - gap - VIEWPORT_INSET;
      const isAbove = height > roomBelow && roomAbove > roomBelow;
      const wantedTop = isAbove ? box.top - gap - height : box.bottom + gap;
      const top = Math.max(VIEWPORT_INSET, Math.min(wantedTop, viewportHeight - VIEWPORT_INSET - height));

      surface.style.top = `${top - gap}px`;
      // Read by the tooltip's caret, which has to point back the other way once the card is above.
      // Taken from where the surface *landed* rather than from `isAbove`, which is only where it
      // was aimed: the clamp above can overrule the choice, and a caret pointing at the side the
      // decision preferred rather than the side the card is on would be pointing at nothing.
      surface.dataset.placement = top + height <= box.top ? 'above' : 'below';

      if (alignment === 'stretch') {
        surface.style.left = `${box.left}px`;
        surface.style.width = `${box.width}px`;
        return;
      }

      // Centred on the anchor, pulled back where that would run the surface off an edge. `left` is
      // the *centre* — the call site's `-translate-x-1/2` takes off half the surface's own width,
      // which is why the clamp has to work in halves here.
      const anchorCentre = box.left + box.width / 2;
      const half = width / 2;
      const centre = Math.max(
        VIEWPORT_INSET + half,
        Math.min(anchorCentre, viewportWidth - VIEWPORT_INSET - half),
      );
      surface.style.left = `${centre}px`;
      // Once the card has been pulled back, a caret centred on the *card* points at nothing. This
      // keeps it over the anchor instead, short of the card's own rounded corners.
      const shift = Math.min(Math.max(anchorCentre - centre, CARET_INSET - half), half - CARET_INSET);
      surface.style.setProperty('--caret-shift', `${shift}px`);
    };

    place();

    // Capture phase, and on the document rather than the window: `scroll` does not bubble, and the
    // anchor may sit inside a scrolling panel — the atlas calculator's — rather than in the page.
    // A surface in the top layer is positioned against the viewport, so nothing moves it but this.
    surfaceDocument.addEventListener('scroll', place, { capture: true, passive: true });
    surfaceWindow.addEventListener('resize', place);

    return () => {
      surfaceDocument.removeEventListener('scroll', place, { capture: true });
      surfaceWindow.removeEventListener('resize', place);
      // Symmetric teardown, not crash avoidance: on a surface that carries the attribute — which
      // this one does, from the lift above — `hidePopover()` returns silently whether it is showing,
      // never shown, or already removed from the document. It matters only where the node outlives
      // the effect, which is what Strict Mode does on mount.
      surface.hidePopover();
    };
  }, [anchorRef, surfaceRef, isShowing, alignment]);
}
