import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { createImage } from '../../utils/imageData.ts';
import type { QuantiseResult, SheetScale } from '../../types/quantiser.ts';
import { ImageComparison } from './ImageComparison.tsx';

/**
 * The comparison's one structural promise: **both panes cover the same extent of the same artwork**.
 *
 * The result is one pixel per grid cell, so drawing it at `zoom` — as this did — showed it `grid`
 * times smaller than the sheet beside it, and no amount of linking the two scroll positions could
 * have made that a comparison. The canvases' CSS sizes, the windows clipping them, and the inset a
 * measured grid offset pulls the result back by are where that is decided, and they are what these
 * tests read.
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

/**
 * A result as `quantiseImage` returns one: one pixel per cell of the lattice `cellStarts` places —
 * `⌈w / grid⌉` a side at the corner, one more where a non-zero offset opens a leading partial cell.
 */
function resultFor(grid: number, colors = 32, offset = { x: 0, y: 0 }): QuantiseResult {
  const lead = (along: number) => (along > 0 ? 1 : 0);
  const side = (along: number) => lead(along) + Math.ceil((SOURCE_SIDE - along) / grid);
  return { image: createImage(side(offset.x), side(offset.y)), colors, keyedShare: 0, offset };
}

function show(
  grid: number | null,
  colors?: number,
  busy = false,
  scale: SheetScale | null = null,
  inForce: number | null = grid,
) {
  const source = createImage(SOURCE_SIDE, SOURCE_SIDE);
  render(
    <ImageComparison
      sourceName="sheet.png"
      source={source}
      sourceColors={200}
      scale={scale}
      grid={inForce}
      quantised={grid === null ? null : { result: resultFor(grid, colors), grid }}
      busy={busy}
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
      // in must not, or one screen pixel means a different amount of sheet on each side. The windows
      // around them carry the same guarantee to `useLinkedPanes`, which measures the first child.
      expect(quantised).toHaveAttribute('width', String(SOURCE_SIDE / grid));
      expect(arrived.style.width).toBe(`${String(SOURCE_SIDE)}px`);
      expect(quantised?.style.width).toBe(`${String(SOURCE_SIDE)}px`);
      expect(arrived.parentElement?.style.width).toBe(`${String(SOURCE_SIDE)}px`);
      expect(quantised?.parentElement?.style.width).toBe(`${String(SOURCE_SIDE)}px`);
    });
  }

  it('pulls an offset result back by its leading cell’s deficit, inside the source’s window', () => {
    // A measured offset of {3, 3} at a grid of 8 opens a leading partial cell: the result is 17 a
    // side, its canvas 136px at 1× — and drawn as-is, every cell after the first would sit 5px off
    // the source pixels it covers, which on linked panes reads as the transform having moved the
    // art. The canvas is pulled back by exactly that deficit and the window clips it to the source's
    // own extent, so the two panes still measure — and mean — the same artwork.
    const source = createImage(SOURCE_SIDE, SOURCE_SIDE);
    render(
      <ImageComparison
        sourceName="sheet.png"
        source={source}
        sourceColors={200}
        scale={null}
        grid={8}
        quantised={{ result: resultFor(8, 32, { x: 3, y: 3 }), grid: 8 }}
        busy={false}
      />,
    );
    const quantised = screen.getByRole('img', {
      name: 'The sheet after grid alignment and palette reduction',
    });

    expect(quantised).toHaveAttribute('width', '17');
    expect(quantised.style.width).toBe('136px');
    expect(quantised.style.marginLeft).toBe('-5px');
    expect(quantised.style.marginTop).toBe('-5px');
    expect(quantised.parentElement?.style.width).toBe(`${String(SOURCE_SIDE)}px`);
    expect(quantised.parentElement?.style.height).toBe(`${String(SOURCE_SIDE)}px`);
  });

  it('keeps the two matched after the magnification changes', () => {
    const { arrived, quantised } = show(8);

    // Scoped to the zoom row: the Save At row offers the same rungs, and an unscoped query finds
    // both of each.
    const zoomRow = screen.getByRole('group', { name: 'Preview magnification' });
    fireEvent.click(within(zoomRow).getByRole('button', { name: '8×' }));

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
    expect(screen.getByText(/No pixel scale was measured/)).toBeInTheDocument();
    expect(arrived.style.width).toBe(`${String(SOURCE_SIDE)}px`);
  });

  it('asks for a click, not a number, when a scale was estimated and left unapplied', () => {
    // The empty states are told apart by what the reader has to *do*, and only one of them wants a
    // number typed. An estimate is offered above and waiting to be clicked, so the "type one"
    // wording would send a reader looking for something the panel had already handed them — and
    // reads as the estimate having failed.
    show(null, undefined, false, { grid: 8, measurement: 'ESTIMATED' }, null);

    expect(screen.getByText(/Click it above to align the sheet to it/)).toBeInTheDocument();
    expect(screen.queryByText(/No pixel scale was measured/)).toBeNull();
  });

  it('points at the error, rather than asking for a scale, when one is already in force', () => {
    // The third cause of an empty pane, and the one where every instruction about *choosing* a scale
    // is wrong: 8 is in the box and the transform still produced nothing, which only a failure
    // explains — and the tab renders that failure directly above. Saying "type one in the box above"
    // here tells the reader to do the thing they have just done.
    show(null, undefined, false, { grid: 8, measurement: 'EXACT' }, 8);

    expect(screen.getByText(/could not be quantised at the scale in force/)).toBeInTheDocument();
    expect(screen.queryByText(/No pixel scale was measured/)).toBeNull();
  });

  it('says it is working, over the previous result rather than instead of it', () => {
    // The transform runs on a worker, so a settings change is answered a few hundred milliseconds
    // later. Blanking the pane for that long would throw away what the tab exists to show — and take
    // the reader's pan position with it, since the pane collapses to a placeholder and the scroll
    // offset is clamped to nothing. So the last result stays up and the chip says a newer one is due.
    const { quantised } = show(8, 32, true);

    expect(quantised).not.toBeNull();
    expect(screen.getByText('Quantising…')).toBeInTheDocument();
    expect(screen.getByText(/· updating…$/)).toBeInTheDocument();
  });

  it('repaints when the pixels change and not merely when the panel renders', () => {
    // `quantised` is built fresh by `useQuantiseWork` on every render, so an effect keyed on that
    // wrapper repainted both canvases whenever anything in the tab re-rendered — two `putImageData`
    // calls of up to 67 megabytes each, on the main thread, for a keystroke that changed no pixel.
    // Counting `getContext` counts paints, because `paint` reaches for one every time it draws.
    const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    const source = createImage(SOURCE_SIDE, SOURCE_SIDE);
    const quantised = { result: resultFor(8), grid: 8 };
    const panel = (shown: typeof quantised, busy: boolean) => (
      <ImageComparison
        sourceName="sheet.png"
        source={source}
        sourceColors={200}
        scale={{ grid: shown.grid, measurement: 'EXACT' }}
        grid={shown.grid}
        quantised={shown}
        busy={busy}
      />
    );

    const { rerender } = render(panel(quantised, false));
    const onMount = context.mock.calls.length;
    expect(onMount).toBeGreaterThan(0);

    // The same pixels in a new wrapper, which is what every render of the tab hands this panel.
    rerender(panel({ ...quantised }, true));
    expect(context.mock.calls).toHaveLength(onMount);

    // A genuinely different result, which is the only thing there is anything to redraw for.
    rerender(panel({ result: resultFor(4), grid: 4 }, false));
    expect(context.mock.calls.length).toBeGreaterThan(onMount);

    context.mockRestore();
  });

  it('says nothing about working when it is not', () => {
    show(8);

    expect(screen.queryByText('Quantising…')).toBeNull();
    expect(screen.queryByText(/updating…/)).toBeNull();
  });
});
