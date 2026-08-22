import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { flatDifference } from '../../test/images.ts';
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
 * A result as `quantiseImage` returns one: one pixel per mesh cell — `⌈w / grid⌉` a side for a
 * corner-anchored regular mesh, one more where a non-zero offset opens a leading partial cell.
 */
function resultFor(grid: number, colors = 32, offset = { x: 0, y: 0 }, distance = 0): QuantiseResult {
  const lead = (along: number) => (along > 0 ? 1 : 0);
  const side = (along: number) => lead(along) + Math.ceil((SOURCE_SIDE - along) / grid);
  const image = createImage(side(offset.x), side(offset.y));
  return {
    image,
    difference: flatDifference(image.width, image.height, distance),
    colors,
    keyedShare: 0,
    sprites: { kind: 'SEGMENTED', boxes: [], specks: 0 },
    symmetry: null,
    duplicates: [],
    snapped: false,
    strips: null,
    offset,
  };
}

/** The heatmap's pane, which stands where the result's does and says so in its own name. */
const HEATMAP = 'How far each drawn pixel sits from the patch of the sheet it stands for';

/** Switch the preview to one of the five layouts, by the name on its pill. */
function choose(layout: string) {
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Preview layout' })).getByRole('button', {
      name: layout,
    }),
  );
}

function show(
  grid: number | null,
  colors?: number,
  busy = false,
  scale: SheetScale | null = null,
  inForce: number | null = grid,
  distance = 0,
) {
  const source = createImage(SOURCE_SIDE, SOURCE_SIDE);
  render(
    <ImageComparison
      sourceName="sheet.png"
      source={source}
      sourceColors={200}
      scale={scale}
      grid={inForce}
      quantised={grid === null ? null : { result: resultFor(grid, colors, { x: 0, y: 0 }, distance), grid }}
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
    // number typed. An estimate is already offered and waiting to be clicked, so the "type one"
    // wording would send a reader looking for something the grid panel had already handed them —
    // and reads as the estimate having failed.
    show(null, undefined, false, { grid: 8, measurement: 'ESTIMATED' }, null);

    expect(screen.getByText(/Click it to align the sheet to it/)).toBeInTheDocument();
    expect(screen.queryByText(/No pixel scale was measured/)).toBeNull();
  });

  it('points at the error, rather than asking for a scale, when one is already in force', () => {
    // The third cause of an empty pane, and the one where every instruction about *choosing* a scale
    // is wrong: 8 is in the box and the transform still produced nothing, which only a failure
    // explains — and the tab renders that failure at the head of the controls. Saying "type one into
    // the Pixel grid box" here tells the reader to do the thing they have just done.
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

/**
 * The five ways of reading one result.
 *
 * Two of them exist because the pair of frames cannot answer their question. Side by side says what
 * the sheet *became*; the wipe puts the same screen pixels before and after so a change of one shade
 * is findable at all; and the difference mode says what the reduction *cost*, which is the reading
 * two separate reports of a working dial "doing nothing" turned out to need.
 */
describe('ImageComparison’s preview modes', () => {
  it('opens on the pair, which is the reading that needs no explaining', () => {
    show(8);

    expect(screen.getByRole('img', { name: /after grid alignment/ })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: HEATMAP })).toBeNull();
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('puts the heatmap where the result was, so the sheet stays put across the switch', () => {
    // The left frame is deliberately unchanged by the switch: it is what the reader is comparing
    // against, and `useLinkedPanes` is holding a pan position on it. Replacing the *pair* would
    // move the artwork out from under them to show them a measurement of it.
    const { arrived } = show(8);
    choose('Difference');

    expect(screen.getByRole('img', { name: 'The sheet as it arrived' })).toBe(arrived);
    expect(screen.getByRole('img', { name: HEATMAP })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /after grid alignment/ })).toBeNull();
  });

  it('draws the heatmap at the result’s size, on the result’s own footprint', () => {
    // The map is one mark per drawn pixel, so it inherits the whole placement — the magnification
    // that makes one screen pixel mean the same amount of sheet in both frames, and the window that
    // holds the two extents equal. A heatmap drawn at any other size would point at the wrong
    // artwork while looking entirely correct.
    show(8);
    choose('Difference');
    const heatmap = screen.getByRole('img', { name: HEATMAP });

    expect(heatmap).toHaveAttribute('width', String(SOURCE_SIDE / 8));
    expect(heatmap.style.width).toBe(`${String(SOURCE_SIDE)}px`);
    expect(heatmap.parentElement?.style.width).toBe(`${String(SOURCE_SIDE)}px`);
  });

  it('states the two figures the map cannot show, and only where they mean something', () => {
    // The map says *where* something was lost; these say how much. The pair is what a reader
    // compares across a change of dial — and the colour count the other modes state is not a fact
    // about a heatmap, so it goes.
    show(8, 32, false, null, 8, 12.5);
    choose('Difference');

    expect(screen.getByText('Difference · mean 12.50 · peak 12.5')).toBeInTheDocument();
    expect(screen.queryByText(/32 colours/)).toBeNull();
  });

  it('offers the scale only while there is a ramp for it to be the top of', () => {
    show(8);
    expect(screen.queryByRole('group', { name: 'Difference scale' })).toBeNull();

    choose('Difference');
    expect(screen.getByRole('group', { name: 'Difference scale' })).toBeInTheDocument();

    choose('Wipe');
    expect(screen.queryByRole('group', { name: 'Difference scale' })).toBeNull();
  });

  it('repaints the heatmap when the scale changes, because that is all the control does', () => {
    // The scale is applied where the map is painted rather than where it is measured, so a rung is
    // one pass over an image the size of the result. Nothing else about the result moves — which is
    // also why a stale repaint here would be invisible rather than obviously wrong.
    const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    show(8, 32, false, null, 8, 20);
    choose('Difference');
    const painted = context.mock.calls.length;

    const scale = screen.getByRole('group', { name: 'Difference scale' });
    fireEvent.click(within(scale).getByRole('button', { name: '4' }));

    expect(context.mock.calls.length).toBeGreaterThan(painted);
    context.mockRestore();
  });

  it('lays both frames over one another under a divider, in the wipe', () => {
    show(8);
    choose('Wipe');

    // Both pictures are still there — that is what makes it a comparison rather than a toggle — and
    // the divider is the control that says which of them is showing where.
    expect(screen.getByRole('img', { name: 'The sheet as it arrived' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /after grid alignment/ })).toBeInTheDocument();
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '50');
  });

  it('clips the upper frame at the divider, from the one value both of them read', () => {
    // The handle's offset and the clip are one fact with two consumers. Published as a custom
    // property on the frame, they cannot disagree; computed separately, the divider would draw in
    // one place and cut in another, which reads as the panes being misaligned.
    show(8);
    choose('Wipe');
    const clipped = document.querySelector<HTMLElement>('[style*="clip-path"]');

    expect(clipped?.style.clipPath).toBe('inset(0 0 0 var(--wipe))');
    expect(clipped?.parentElement?.style.getPropertyValue('--wipe')).toBe('50%');

    fireEvent.keyDown(screen.getByRole('slider'), { key: 'End' });
    expect(clipped?.parentElement?.style.getPropertyValue('--wipe')).toBe('100%');
  });

  it('repaints when a layout change hands it two fresh canvases', () => {
    // The pair and the wipe are different trees, so choosing one unmounts both canvases and mounts
    // two more — blank, because a canvas's backing store is created empty. The image on them has not
    // changed, so an effect keyed on the image alone never fired and the whole preview went to two
    // empty frames. Driven in Edge, that is exactly what it did.
    const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    show(8);
    const paired = context.mock.calls.length;
    expect(paired).toBeGreaterThan(0);

    choose('Wipe');
    expect(context.mock.calls.length).toBeGreaterThan(paired);

    const overlaid = context.mock.calls.length;
    choose('Side by side');
    expect(context.mock.calls.length).toBeGreaterThan(overlaid);

    context.mockRestore();
  });

  it('says the alignment pass is off rather than drawing a stack of nothing', () => {
    // The onion mode is made *of* the alignment reading, so with the control off there is nothing to
    // stack — and the frame beside it is showing the plain result. Saying so in the caption is what
    // stops a reader looking for a comparison that was never asked for.
    show(8);
    choose('Onion skin');

    expect(screen.getByText(/Onion skin · frame alignment is off/)).toBeInTheDocument();
  });

  it('names the reason there is nothing to stack, and does not blame the rows for the keying', () => {
    // Two different empties. `resultFor` segments to no boxes at all, which is a fact about the
    // keying — the alignment panel says so, and a caption complaining about row lengths beside it
    // would send the reader to the wrong control.
    const source = createImage(SOURCE_SIDE, SOURCE_SIDE);
    const result = resultFor(8);
    render(
      <ImageComparison
        sourceName="sheet.png"
        source={source}
        sourceColors={200}
        scale={null}
        grid={8}
        quantised={{ result: { ...result, strips: [], sprites: { kind: 'SOLID' } }, grid: 8 }}
        busy={false}
      />,
    );
    choose('Onion skin');

    expect(screen.getByText(/Onion skin · no sprite to gather into rows/)).toBeInTheDocument();
  });

  it('names the frame after the picture, not the pill, where there is no stack to draw', () => {
    // With the alignment pass off the canvas holds the ordinary result, so announcing it as a stack
    // of frames would tell a screen-reader user the image contains something it does not — and would
    // contradict the caption beside it, which says the pass is off.
    show(8);
    choose('Onion skin');

    expect(screen.getByRole('img', { name: /after grid alignment/ })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /laid over the first frame/ })).toBeNull();
  });

  it('blames the row lengths where the sheet did separate into sprites', () => {
    const source = createImage(SOURCE_SIDE, SOURCE_SIDE);
    const result = resultFor(8);
    render(
      <ImageComparison
        sourceName="sheet.png"
        source={source}
        sourceColors={200}
        scale={null}
        grid={8}
        quantised={{
          result: {
            ...result,
            strips: [],
            sprites: {
              kind: 'SEGMENTED',
              boxes: [{ left: 0, top: 0, width: 4, height: 4, pixels: 16 }],
              specks: 0,
            },
          },
          grid: 8,
        }}
        busy={false}
      />,
    );
    choose('Onion skin');

    expect(screen.getByText(/Onion skin · no row holds enough frames/)).toBeInTheDocument();
  });

  it('stacks each strip where the result was, and counts them in the caption', () => {
    const source = createImage(SOURCE_SIDE, SOURCE_SIDE);
    const result = resultFor(8);
    const box = { left: 0, top: 0, width: 4, height: 4, pixels: 16 };
    const frame = (left: number) => ({
      box: { ...box, left },
      drift: { x: 0, y: 0 },
      slot: { x: left, y: 0 },
      snapped: false,
    });
    render(
      <ImageComparison
        sourceName="sheet.png"
        source={source}
        sourceColors={200}
        scale={null}
        grid={8}
        quantised={{
          result: {
            ...result,
            strips: [{ frames: [frame(0), frame(5), frame(10)], pitch: { x: 5, y: 0 } }],
          },
          grid: 8,
        }}
        busy={false}
      />,
    );
    choose('Onion skin');

    expect(screen.getByText(/Onion skin · 1 strip stacked/)).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'The quantised sheet, with every frame of each row of sprites laid over the first frame of that row',
      }),
    ).toBeInTheDocument();
  });

  it('falls back to the pair when there is no result, rather than wiping against nothing', () => {
    // Both of the other modes need something to compare with. Derived rather than corrected in
    // state, which is the call the toolbar already makes about a download rung a result has
    // outgrown: what the pills show is what the panel is actually doing.
    show(null);
    choose('Wipe');

    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.getByText(/No pixel scale was measured/)).toBeInTheDocument();
    const pills = screen.getByRole('group', { name: 'Preview layout' });
    expect(within(pills).getByRole('button', { name: 'Side by side' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

/**
 * Moving the whole panel into a window of its own, and back.
 *
 * The claim under test is that this is a change of *where* the preview is, and of nothing else: the
 * same subtree, carrying the same zoom, the same layout and the same wipe position, built in another
 * document. So each of these looks for the panel in the detached window and for the way back in the
 * page — and the last of them holds the preview's state across the round trip.
 */
describe('ImageComparison, detached', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Press the toolbar's control, wherever the toolbar currently is. */
  function press(name: string, inside: HTMLElement = document.body) {
    fireEvent.click(within(inside).getByRole('button', { name }));
  }

  /**
   * Keep hold of the window the panel is opened into, which the test otherwise has no handle on.
   *
   * happy-dom opens a real second `Window`, so this passes the call straight through rather than
   * standing in for it: what the tests below then query is the document the portal actually built
   * its elements in.
   */
  function watchOpen(): { last: Window | null } {
    const seen: { last: Window | null } = { last: null };
    const open = window.open.bind(window);
    vi.spyOn(window, 'open').mockImplementation((...args) => {
      seen.last = open(...args);
      return seen.last;
    });
    return seen;
  }

  /** Where the panel has gone, or a failure naming the reason the rest of the test would not. */
  function bodyOf(opened: { last: Window | null }): HTMLElement {
    if (opened.last === null) throw new Error('No window was opened.');
    return opened.last.document.body;
  }

  it('moves the panel out of the page and leaves the way back behind', () => {
    const opened = watchOpen();
    show(8);

    press('Detach preview');

    // Gone from the page — both panes and the toolbar with them…
    expect(screen.queryByRole('img', { name: 'The sheet as it arrived' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Preview magnification' })).toBeNull();
    // …and standing in the other document, whole.
    const detached = bodyOf(opened);
    expect(within(detached).getByRole('img', { name: 'The sheet as it arrived' })).toBeInTheDocument();
    expect(within(detached).getByRole('group', { name: 'Preview magnification' })).toBeInTheDocument();
    // The page says where it went rather than simply losing a panel.
    expect(screen.getByRole('heading', { name: 'The preview is in its own window' })).toBeInTheDocument();
  });

  it('brings the panel back from the notice left in its place', () => {
    const opened = watchOpen();
    show(8);
    press('Detach preview');
    const view = opened.last;

    press('Bring the preview back');

    expect(screen.getByRole('img', { name: 'The sheet as it arrived' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'The preview is in its own window' })).toBeNull();
    expect(view?.closed).toBe(true);
  });

  it('brings the panel back from the control that travelled with it', () => {
    const opened = watchOpen();
    show(8);
    press('Detach preview');

    press('Return to the page', bodyOf(opened));

    expect(screen.getByRole('img', { name: 'The sheet as it arrived' })).toBeInTheDocument();
  });

  it('brings the panel back when the reader closes the window themselves', () => {
    const opened = watchOpen();
    show(8);
    press('Detach preview');

    fireEvent(bodyOf(opened).ownerDocument.defaultView as Window, new Event('pagehide'));

    expect(screen.getByRole('img', { name: 'The sheet as it arrived' })).toBeInTheDocument();
  });

  it('puts the focus on the way back, which the press that detached took with it', () => {
    watchOpen();
    show(8);

    press('Detach preview');

    expect(document.activeElement).toHaveAccessibleName('Bring the preview back');
  });

  it('says so when the browser refuses, rather than leaving a control that does nothing', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    show(8);

    press('Detach preview');

    expect(screen.getByRole('alert')).toHaveTextContent(/would not open a window/);
    // Still here, still working — the refusal costs the reader the window and nothing else.
    expect(screen.getByRole('img', { name: 'The sheet as it arrived' })).toBeInTheDocument();
  });

  it('keeps the zoom and the layout the reader chose across the move', () => {
    const opened = watchOpen();
    show(8);
    choose('Difference');
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Preview magnification' })).getByRole('button', {
        name: '4×',
      }),
    );

    press('Detach preview');

    // The state lives in a component that never unmounted; only the elements were built elsewhere.
    const detached = bodyOf(opened);
    expect(within(detached).getByRole('img', { name: HEATMAP })).toBeInTheDocument();
    expect(
      within(within(detached).getByRole('group', { name: 'Preview magnification' })).getByRole('button', {
        name: '4×',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
