import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createImage } from '../../utils/imageData.ts';
import type { QuantiseResult } from '../../types/quantiser.ts';
import { ImageComparison } from './ImageComparison.tsx';

/**
 * The comparison's one structural promise: **both panes cover the same extent of the same artwork**.
 *
 * The result is `⌈w / grid⌉` pixels wide, so drawing it at `zoom` — as this did — showed it `grid`
 * times smaller than the sheet beside it, and no amount of linking the two scroll positions could
 * have made that a comparison. The canvases' CSS sizes are where that is decided, and they are what
 * these tests read.
 */
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', NoopResizeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const SOURCE_SIDE = 128;

/** A result as `quantiseImage` returns one: `⌈w / grid⌉` a side, per `downscaleNearest`. */
function resultFor(grid: number, colorsAfter = 32): QuantiseResult {
  const side = Math.ceil(SOURCE_SIDE / grid);
  return { image: createImage(side, side), colorsBefore: 200, colorsAfter, keyedShare: 0 };
}

function show(grid: number | null, colorsAfter?: number) {
  const source = createImage(SOURCE_SIDE, SOURCE_SIDE);
  render(
    <ImageComparison
      sourceName="sheet.png"
      source={source}
      quantised={grid === null ? null : { result: resultFor(grid, colorsAfter), grid }}
    />,
  );
  return {
    arrived: screen.getByRole('img', { name: 'The sheet as it arrived' }),
    quantised: screen.queryByRole('img', {
      name: 'The sheet after grid alignment and palette reduction',
    }),
  };
}

describe('ImageComparison', () => {
  for (const grid of [1, 2, 8]) {
    it(`draws both panes over the same width of artwork at a grid of ${String(grid)}`, () => {
      const { arrived, quantised } = show(grid);

      // The backing stores differ by the grid — that is the transform — but the boxes they are drawn
      // in must not, or one screen pixel means a different amount of sheet on each side.
      expect(quantised).toHaveAttribute('width', String(SOURCE_SIDE / grid));
      expect(arrived.style.width).toBe(`${String(SOURCE_SIDE)}px`);
      expect(quantised?.style.width).toBe(`${String(SOURCE_SIDE)}px`);
    });
  }

  it('keeps the two matched after the magnification changes', () => {
    const { arrived, quantised } = show(8);

    fireEvent.click(screen.getByRole('button', { name: '8×' }));

    // Both panes grow by the same factor, so the match survives — and both genuinely grew, which is
    // what separates this from two canvases that happen to agree at the zoom the control starts on.
    expect(arrived.style.width).toBe(`${String(SOURCE_SIDE * 8)}px`);
    expect(quantised?.style.width).toBe(`${String(SOURCE_SIDE * 8)}px`);
    expect(arrived.style.height).toBe(quantised?.style.height);
  });

  it('lets neither canvas animate its own size', () => {
    const { arrived, quantised } = show(8);

    // Not a style preference — the anchoring depends on it. `useLinkedPanes` reads the new size back
    // out of the DOM in the same commit that sets it, and a transition on `width` makes that read
    // return the old size, so the scroll offset it computes is clamped to the old extent.
    //
    // Nothing asks for that transition: `transition-property` initialises to `all`, and the
    // reduced-motion catch-all in `index.css` gives every element a non-zero `transition-duration` —
    // so without this the view geometry breaks for reduced-motion users alone, which is the hardest
    // kind of bug to ever hear about.
    expect(arrived).toHaveClass('transition-none');
    expect(quantised).toHaveClass('transition-none');
  });

  it('renders neither preview smoothed, whatever the magnification', () => {
    const { arrived, quantised } = show(8);

    // A smoothed preview of a nearest-neighbour result blurs exactly the edges the user is judging,
    // and would make a failed transform look like a successful one.
    expect(arrived.style.imageRendering).toBe('pixelated');
    expect(quantised?.style.imageRendering).toBe('pixelated');
  });

  it('agrees with itself about one colour, which keying made a reachable answer', () => {
    // A sheet reducing to a single colour used to take artwork that was already one colour, because
    // the key field's own colours were counted. Now that the field can be removed it is the ordinary
    // outcome for a simple sheet — and the caption read "1 colours" the first time one was driven.
    show(8, 1);

    expect(screen.getByText(/· 1 colour$/)).toBeInTheDocument();
    expect(screen.queryByText(/1 colours/)).toBeNull();
  });

  it('says why there is nothing to compare yet, and leaves the first pane working', () => {
    const { arrived, quantised } = show(null);

    expect(quantised).toBeNull();
    expect(screen.getByText(/no pixel scale in this image/)).toBeInTheDocument();
    expect(arrived.style.width).toBe(`${String(SOURCE_SIDE)}px`);
  });
});
