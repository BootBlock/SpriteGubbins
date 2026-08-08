import { describe, expect, it } from 'vitest';
import { clampOffset, scrollForCentre, viewCentre } from './panGeometry.ts';
import type { Offsets, ViewMetrics } from './panGeometry.ts';

/**
 * The arithmetic that holds a view still while the magnification moves under it, and that lets one
 * pane say where it is looking in terms the other can act on.
 *
 * Everything here is expressed the way the browser would report it: a scrollport with no padding, so
 * content starts at offset zero, and a content size that is the source extent times the scale.
 */

/** A scrollport showing `content` source pixels at `scale`, in a `box` of screen pixels. */
function metrics(
  content: { x: number; y: number },
  box: { x: number; y: number },
  scale: number,
  offsets: Offsets = { left: 0, top: 0 },
): ViewMetrics {
  return {
    scrollLeft: offsets.left,
    scrollTop: offsets.top,
    // The content's own size, which is what the caller measures off the child element. Deliberately
    // not `scrollWidth`: that never reports less than the box, so it cannot express the case where
    // the artwork fits inside its frame — the case two of the tests below exist for.
    contentWidth: content.x * scale,
    contentHeight: content.y * scale,
    clientWidth: box.x,
    clientHeight: box.y,
  };
}

/** A square 400-source-pixel image in a square 100-screen-pixel box, the case the panes exist for. */
function square(scale: number, offsets?: Offsets): ViewMetrics {
  return metrics({ x: 400, y: 400 }, { x: 100, y: 100 }, scale, offsets);
}

describe('viewCentre', () => {
  it('reports the middle of the box, converted into the source image own pixels', () => {
    // Scrolled 200 screen pixels into a 2× view, so the left edge is source pixel 100 and the box
    // spans 50 more; the middle of it is 125.
    expect(viewCentre(square(2, { left: 200, top: 200 }), 2)).toEqual({ x: 125, y: 125 });
  });

  it('reads the two axes independently, so a non-square box does not borrow one for the other', () => {
    const view = metrics({ x: 400, y: 400 }, { x: 100, y: 40 }, 2, { left: 200, top: 100 });

    expect(viewCentre(view, 2)).toEqual({ x: 125, y: 60 });
  });

  it('takes the middle of the image, not of the box, when the image does not fill it', () => {
    // A 20-pixel image in a 100-pixel box sits against the left edge, so the middle of the *box* is
    // a point in the empty space past its end. Anchoring there sends the next zoom to an offset the
    // scrollport cannot honour, and the clamp then lands the user at the far edge of their artwork.
    expect(viewCentre(metrics({ x: 20, y: 20 }, { x: 100, y: 100 }, 1), 1)).toEqual({ x: 10, y: 10 });
  });

  it('zooms into the middle of a sheet narrower than its frame, not off the end of it', () => {
    // The case the fix above exists for, end to end: a 128-pixel sheet in a 550-pixel column at 1×,
    // magnified to 8×. Anchoring on the box would ask for offset 1922, clamp to the 474 maximum, and
    // show the right-hand edge; anchoring on the image asks for 462 and keeps the subject centred.
    const fits = metrics({ x: 128, y: 128 }, { x: 550, y: 550 }, 1);
    const centre = viewCentre(fits, 1);

    expect(centre).toEqual({ x: 64, y: 64 });
    expect(scrollForCentre(centre, metrics({ x: 128, y: 128 }, { x: 550, y: 550 }, 8), 8)).toEqual({
      left: 237,
      top: 237,
    });
  });
});

describe('scrollForCentre', () => {
  it('puts the asked-for source pixel back in the middle of the box', () => {
    expect(scrollForCentre({ x: 125, y: 125 }, square(2), 2)).toEqual({ left: 200, top: 200 });
  });

  it('holds the centre across every step of a zoom in and back out again', () => {
    // The property the whole feature rests on: the detail under the middle of the pane is still
    // under the middle of the pane after the magnification changes, whichever way it went.
    const start = square(1, { left: 150, top: 150 });
    const centre = viewCentre(start, 1);

    let carried = centre;
    for (const scale of [2, 8, 4, 1]) {
      const offsets = scrollForCentre(carried, square(scale), scale);
      // Read back through the same conversion the next step would use, so an error that cancelled
      // itself within one hop would still show up by the end of the chain.
      carried = viewCentre(square(scale, offsets), scale);
      expect(carried).toEqual(centre);
    }

    expect(carried).toEqual({ x: 200, y: 200 });
  });

  it('clamps to the near edge rather than scrolling past the start of the image', () => {
    // Source pixel 5 cannot sit in the middle of the box — that would need a negative offset — so the
    // closest view that exists is the one pinned to the top-left.
    expect(scrollForCentre({ x: 5, y: 5 }, square(2), 2)).toEqual({ left: 0, top: 0 });
  });

  it('clamps to the far edge rather than scrolling past the end of the image', () => {
    // 400 source pixels at 2× is 800 screen pixels in a 100-pixel box, so the last offset is 700.
    expect(scrollForCentre({ x: 395, y: 395 }, square(2), 2)).toEqual({ left: 700, top: 700 });
  });

  it('clamps each axis on its own, so an overflow one way is not lost to a fit the other', () => {
    // Wide but short: the horizontal axis has 700 pixels of travel and the vertical has none, so the
    // centre is honoured across and the clamp answers down.
    const view = metrics({ x: 400, y: 50 }, { x: 100, y: 100 }, 2);

    expect(scrollForCentre({ x: 200, y: 25 }, view, 2)).toEqual({ left: 350, top: 0 });
  });

  it('returns the start of a box larger than its content, not the negative overflow it reports', () => {
    // A 20-pixel image in a 100-pixel box has an overflow of −80. Clamping to that upper bound is the
    // bug this case exists to catch: it would scroll the content out of the box entirely.
    expect(scrollForCentre({ x: 10, y: 10 }, metrics({ x: 20, y: 20 }, { x: 100, y: 100 }, 1), 1)).toEqual({
      left: 0,
      top: 0,
    });
  });

  it('lands a pane whose overflow disappeared at the new scale back at the start', () => {
    // Zoomed from 8× down to 1×, where 60 source pixels no longer fill the 100-pixel box.
    const zoomedIn = metrics({ x: 60, y: 60 }, { x: 100, y: 100 }, 8, { left: 200, top: 200 });
    const centre = viewCentre(zoomedIn, 8);

    expect(scrollForCentre(centre, metrics({ x: 60, y: 60 }, { x: 100, y: 100 }, 1), 1)).toEqual({
      left: 0,
      top: 0,
    });
  });
});

describe('the two panes seen through the same centre', () => {
  /**
   * The result pane holds `⌈w / grid⌉` pixels drawn `grid` times larger, so it covers the same extent
   * of the same artwork — give or take the partial cell the ceiling keeps — and stands at the same
   * `scale`. Equal offsets are therefore a *consequence* of the conversion, never the mechanism:
   * copying one pane's offsets to the other is exactly what this indirection exists to avoid.
   */
  function resultPane(sourceWidth: number, grid: number, zoom: number, box: number): ViewMetrics {
    const covered = Math.ceil(sourceWidth / grid) * grid;
    return metrics({ x: covered, y: covered }, { x: box, y: box }, zoom);
  }

  for (const grid of [1, 8, 3]) {
    it(`shows the same source region in both panes at a grid of ${String(grid)}`, () => {
      const source = metrics({ x: 384, y: 384 }, { x: 100, y: 100 }, 4, { left: 300, top: 300 });
      const centre = viewCentre(source, 4);

      // 384 is a whole multiple of all three grids, so the two panes cover exactly the same extent
      // and the offsets coincide — which is the check that the scales were matched at all.
      expect(scrollForCentre(centre, resultPane(384, grid, 4, 100), 4)).toEqual({ left: 300, top: 300 });
    });
  }

  it('still agrees where the grid does not divide the image, which is where the extents differ', () => {
    // 100 source pixels at a grid of 8 is 13 result pixels covering 104 — four more than exist. The
    // centre still maps to the same place; only the far clamp knows about the difference.
    const source = metrics({ x: 100, y: 100 }, { x: 40, y: 40 }, 4, { left: 120, top: 120 });
    const centre = viewCentre(source, 4);

    expect(scrollForCentre(centre, resultPane(100, 8, 4, 40), 4)).toEqual({ left: 120, top: 120 });
  });
});

describe('clampOffset', () => {
  it('passes an offset already inside the range straight through', () => {
    expect(clampOffset(120, 300)).toBe(120);
  });

  it('holds a negative offset at the start of the range', () => {
    expect(clampOffset(-40, 300)).toBe(0);
  });

  it('holds an offset past the end at the overflow', () => {
    expect(clampOffset(900, 300)).toBe(300);
  });

  it('answers zero where there is no overflow to travel through', () => {
    expect(clampOffset(50, 0)).toBe(0);
  });

  it('answers zero where the box is larger than its content and the overflow is negative', () => {
    expect(clampOffset(50, -80)).toBe(0);
  });
});
