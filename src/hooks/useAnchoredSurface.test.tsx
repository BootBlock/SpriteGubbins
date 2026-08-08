import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAnchoredSurface } from './useAnchoredSurface.ts';
import type { SurfaceAlignment } from './useAnchoredSurface.ts';

/**
 * What a DOM test can see of this hook, and what has to be stood in for.
 *
 * happy-dom does no layout, so left alone every rect is zeroes and every coordinate written out is
 * `0px`. The *lift* is observable as it stands — the attribute, the `showPopover()` call and the
 * switch to viewport positioning, all three of which have to land together or the surface is either
 * still trapped in its panel's stacking context or `display: none` — as is the effect's cleanup,
 * the one thing CLAUDE.md flags as not machine-enforced.
 *
 * The flip-and-clamp arithmetic is the part most worth pinning down and the part happy-dom cannot
 * produce, so {@link measured} supplies the geometry the browser would have: an anchor rect, the
 * surface's own box, and a viewport. What is under test is then the hook's reasoning about those
 * numbers, which is exactly where it can be wrong. The rendering of it is verified by driving the
 * real app (the `verify` skill).
 *
 * The gap between anchor and surface is the one piece of real styling these tests need. It comes
 * from the call site's `mt-*` class, and no stylesheet renders here — so it is passed as an inline
 * margin instead, which `getComputedStyle` resolves just the same. Without it every case would run
 * at `gap === 0`, where the hook's `- gap` compensation and both of its `± gap` room calculations
 * are indistinguishable from not being there at all.
 */
function Surface({
  isShowing,
  alignment = 'centred',
  gap = 0,
}: {
  readonly isShowing: boolean;
  readonly alignment?: SurfaceAlignment;
  readonly gap?: number;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  useAnchoredSurface(anchorRef, surfaceRef, isShowing, alignment);

  return (
    <>
      <button ref={anchorRef} type="button">
        anchor
      </button>
      {isShowing && (
        <div ref={surfaceRef} style={{ marginTop: `${gap}px` }} data-testid="surface">
          surface
        </div>
      )}
    </>
  );
}

/**
 * Give the hook the geometry a browser would have, then let it re-place against it. `resize` rather
 * than a re-render, because that is the listener the hook itself binds for this.
 */
function measured({
  anchor,
  surface: { width, height },
  viewport,
}: {
  readonly anchor: DOMRect;
  readonly surface: { readonly width: number; readonly height: number };
  readonly viewport: { readonly width: number; readonly height: number };
}) {
  const surfaceElement = screen.getByTestId('surface');
  const anchorElement = screen.getByRole('button', { name: 'anchor' });

  vi.spyOn(anchorElement, 'getBoundingClientRect').mockReturnValue(anchor);
  Object.defineProperty(surfaceElement, 'offsetWidth', { value: width, configurable: true });
  Object.defineProperty(surfaceElement, 'offsetHeight', { value: height, configurable: true });
  // The root element's client box, not `window.inner*` — that is the pair the hook reads, because
  // it is the one a classic scrollbar is already subtracted from.
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(viewport.width);
  vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(viewport.height);

  window.dispatchEvent(new Event('resize'));
  return surfaceElement;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAnchoredSurface', () => {
  it('lifts the surface into the top layer and positions it against the viewport', () => {
    const showPopover = vi.spyOn(HTMLElement.prototype, 'showPopover');

    render(<Surface isShowing />);
    const surface = screen.getByTestId('surface');

    // The attribute without the call leaves the surface `display: none`; the call without the
    // attribute throws `NotSupportedError`; and neither is any use while the surface is still
    // positioned against a panel that is its containing block.
    expect(surface).toHaveAttribute('popover', 'manual');
    expect(showPopover).toHaveBeenCalledTimes(1);
    expect(surface.style.position).toBe('fixed');
    expect(surface.style.inset).toBe('auto');
  });

  it('drops below the anchor while there is room for it there', () => {
    render(<Surface isShowing />);

    // Room to spare: 600 − 120 = 480 for a 200px surface.
    const surface = measured({
      anchor: new DOMRect(50, 100, 16, 20),
      surface: { width: 288, height: 200 },
      viewport: { width: 400, height: 600 },
    });

    expect(surface.dataset.placement).toBe('below');
    expect(surface.style.top).toBe('120px');
  });

  it('flips above the anchor when the viewport leaves no room below', () => {
    render(<Surface isShowing />);

    // 600 − 520 = 80 below for a 200px surface, against 520 above.
    const surface = measured({
      anchor: new DOMRect(50, 500, 16, 20),
      surface: { width: 288, height: 200 },
      viewport: { width: 400, height: 600 },
    });

    // Not merely "somewhere above" — its bottom edge has to land on the anchor's top edge.
    expect(surface.dataset.placement).toBe('above');
    expect(surface.style.top).toBe('300px');
  });

  it('holds a surface inside the viewport where neither side has room', () => {
    render(<Surface isShowing />);

    // A 300px surface in a 320px viewport, with 142px of room on either side of the anchor: it
    // fits neither above nor below, so the preference for below stands and the clamp takes over.
    const surface = measured({
      anchor: new DOMRect(50, 150, 16, 20),
      surface: { width: 288, height: 300 },
      viewport: { width: 400, height: 320 },
    });

    // Pushed up until its bottom edge rests on the inset (320 − 8 − 300), rather than hanging off
    // an edge it could never be scrolled back from. It overlaps its anchor, which is the honest
    // outcome when the viewport is smaller than the thing being shown.
    expect(surface.style.top).toBe('12px');
    expect(surface.dataset.placement).toBe('below');
  });

  it('counts the gap when judging whether it fits below', () => {
    render(<Surface isShowing gap={10} />);

    // 190px of surface against 192px of bare space below the anchor — it fits, until the 10px gap
    // and the 8px inset are taken out of that space and leave 182. A room calculation that forgot
    // the gap would drop this list below the fold by two pixels and call it a fit.
    const surface = measured({
      anchor: new DOMRect(50, 380, 16, 20),
      surface: { width: 288, height: 190 },
      viewport: { width: 400, height: 600 },
    });

    expect(surface.dataset.placement).toBe('above');
    expect(surface.style.top).toBe('170px');
  });

  it('counts the gap on the upward side of the decision too', () => {
    render(<Surface isShowing gap={10} />);

    // The two sides are within the gap of each other here: 187px below, 182px above once the gap
    // and the inset come out of both. Forget the gap on the upward side alone and above looks like
    // the roomier one by five pixels, the surface flips, and it needs −10px to start at — so the
    // top clamp catches it and it ends up at the inset, covering the field it belongs to.
    const surface = measured({
      anchor: new DOMRect(50, 200, 16, 20),
      surface: { width: 288, height: 200 },
      viewport: { width: 400, height: 425 },
    });

    expect(surface.dataset.placement).toBe('below');
    expect(surface.style.top).toBe('207px');
  });

  it('reports the side it landed on, not the side it aimed for', () => {
    render(<Surface isShowing />);

    // Aimed above — 200px does not fit in the 122px below — but above needs to start at −50, so
    // the clamp brings it back to the top inset and it ends up covering the anchor instead.
    const surface = measured({
      anchor: new DOMRect(50, 150, 16, 20),
      surface: { width: 288, height: 200 },
      viewport: { width: 400, height: 300 },
    });

    expect(surface.style.top).toBe('8px');
    // `above` here would put the tooltip caret on the card's bottom edge, pointing down and away
    // from a trigger the card is sitting on top of.
    expect(surface.dataset.placement).toBe('below');
  });

  it('pulls a centred surface back off the right edge as well as the left', () => {
    render(<Surface isShowing />);

    // Mirror of the case below: a trigger 2px from the right edge of a 400px viewport.
    const surface = measured({
      anchor: new DOMRect(382, 100, 16, 20),
      surface: { width: 288, height: 120 },
      viewport: { width: 400, height: 600 },
    });

    expect(surface.style.left).toBe('248px');
    expect(surface.style.getPropertyValue('--caret-shift')).toBe('124px');
  });

  it('pulls a centred surface back off the edge, and leaves the caret over the anchor', () => {
    render(<Surface isShowing />);

    // A 288px card centred on a trigger 8px from the left edge would start at −136.
    const surface = measured({
      anchor: new DOMRect(0, 100, 16, 20),
      surface: { width: 288, height: 120 },
      viewport: { width: 400, height: 600 },
    });

    // `left` is the centre, so the inset plus half the card is as far left as it may sit.
    expect(surface.style.left).toBe('152px');
    // And the caret gives that displacement straight back — stopping short of the rounded corner.
    expect(surface.style.getPropertyValue('--caret-shift')).toBe('-124px');
  });

  it('leaves the gap below the anchor when it drops, and above it when it flips', () => {
    // The gap is a margin the browser adds on top of whatever `top` says, so the hook has to take
    // it back off — and by twice as much going up as coming down. Both arms are asserted here
    // because getting one right and the other wrong is invisible at the default `gap` of 0.
    const { unmount } = render(<Surface isShowing gap={10} />);

    const below = measured({
      anchor: new DOMRect(50, 100, 16, 20),
      surface: { width: 288, height: 200 },
      viewport: { width: 400, height: 600 },
    });
    // Rendered edge at 130 — the anchor's bottom plus the gap — so `top` is that less the margin.
    expect(below.style.top).toBe('120px');
    expect(below.dataset.placement).toBe('below');

    unmount();
    render(<Surface isShowing gap={10} />);

    const above = measured({
      anchor: new DOMRect(50, 500, 16, 20),
      surface: { width: 288, height: 200 },
      viewport: { width: 400, height: 600 },
    });
    // Rendered edge at 290, putting its bottom 10px clear of the anchor's top at 500.
    expect(above.style.top).toBe('280px');
    expect(above.dataset.placement).toBe('above');
  });

  it('matches the anchor edge for edge when it stretches', () => {
    render(<Surface isShowing alignment="stretch" />);

    const surface = measured({
      anchor: new DOMRect(50, 100, 240, 20),
      surface: { width: 240, height: 100 },
      viewport: { width: 400, height: 600 },
    });

    expect(surface.style.left).toBe('50px');
    expect(surface.style.width).toBe('240px');
    // A stretched surface takes no caret: it has no edge to be pulled back from.
    expect(surface.style.getPropertyValue('--caret-shift')).toBe('');
  });

  it('leaves the surface alone where the browser has no popover API', () => {
    // Safari 16 runs this app and has no popover API. Reaching for `showPopover()` there throws
    // inside React's commit phase, and with no error boundary above `ComboBox`/`Tooltip` that
    // unmounts the whole root — a blank page the first time anyone hovers an ⓘ. `Reflect` rather
    // than `delete`, which TypeScript rejects on a non-optional property.
    const original = HTMLElement.prototype.showPopover;
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover');

    try {
      expect(() => {
        render(<Surface isShowing />);
      }).not.toThrow();

      // Un-lifted, and therefore left to the positioning its call site already gives it — rather
      // than carrying a `popover` attribute it can never be shown under, which is `display: none`.
      const surface = screen.getByTestId('surface');
      expect(surface).not.toHaveAttribute('popover');
      expect(surface.style.position).toBe('');
    } finally {
      HTMLElement.prototype.showPopover = original;
    }
  });

  it('takes its reposition listeners back off on unmount', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');

    const { unmount } = render(<Surface isShowing />);
    expect(add.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(1);

    unmount();

    // A scroll listener left on the document outlives the surface it was moving, and goes on
    // writing coordinates to a detached node on every scroll for the life of the page.
    expect(remove.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(1);
  });
});
