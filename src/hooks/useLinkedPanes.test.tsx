import { useRef } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useLinkedPanes } from './useLinkedPanes.ts';

/**
 * Two panes held to one view of one artwork.
 *
 * happy-dom performs no layout, so a scrollport is modelled instead — and modelled the way the
 * browser actually behaves, because the parts that matter here are exactly the parts that bite:
 * offsets are stored in whole units, a write is refused past the limit, and the `scroll` event a
 * write provokes arrives *later*, not inside the assignment. That last one is what makes the echo
 * suppression testable at all: {@link settle} plays the browser's rendering opportunities back one
 * round at a time, and a pair that never stops answering each other never settles.
 *
 * The two panes are deliberately given different boxes and different extents — a scrollbar in one,
 * the partial cell `⌈w / grid⌉` keeps in the other. Identical panes would let a wrong implementation
 * pass by symmetry, since copying raw offsets between them happens to be right when they match.
 */
const BOX = { first: 100, second: 97 };
const EXTENT = { first: 400, second: 403 };

interface World {
  scale: number;
  readonly offsets: Map<Element, { left: number; top: number }>;
  readonly pending: Set<Element>;
}

let world: World;

beforeEach(() => {
  world = { scale: 1, offsets: new Map(), pending: new Set() };
});

/**
 * Give an element the scroll behaviour a laid-out browser would have.
 *
 * `scrollWidth` is a getter over the live scale rather than a fixed number, because that is the whole
 * point of the case under test: by the time the hook's layout effect runs, the canvas inside has
 * already been committed at its new size, so the scrollport reports the *new* extent.
 */
function model(element: Element, extent: number, box: number): void {
  if (world.offsets.has(element)) return;
  world.offsets.set(element, { left: 0, top: 0 });

  // The content is measured off the child, not taken from `scrollWidth` — so the child is what the
  // model has to provide. Sized from the live scale, because the canvas is committed at its new size
  // before the hook's layout effect reads it back.
  const child = element.firstElementChild;
  if (child !== null) {
    child.getBoundingClientRect = () => new DOMRect(0, 0, extent * world.scale, extent * world.scale);
  }
  for (const property of ['clientWidth', 'clientHeight'] as const) {
    Object.defineProperty(element, property, { configurable: true, get: () => box });
  }

  for (const [property, axis] of [
    ['scrollLeft', 'left'],
    ['scrollTop', 'top'],
  ] as const) {
    Object.defineProperty(element, property, {
      configurable: true,
      get: () => world.offsets.get(element)?.[axis] ?? 0,
      set: (next: number) => {
        const held = world.offsets.get(element);
        if (held === undefined) return;
        const limit = extent * world.scale - box;
        const settled = Math.round(Math.min(Math.max(next, 0), Math.max(limit, 0)));
        if (settled === held[axis]) return;
        held[axis] = settled;
        // The browser does not deliver this inside the assignment, and neither does the model.
        world.pending.add(element);
      },
    });
  }
}

/**
 * Play back the scroll events the writes so far have earned, until nothing is left owing.
 *
 * Returns how many rounds it took, which is the assertion worth making: one write, one answer, done.
 * A pair that keeps correcting each other by the pixel their rounding disagrees on runs forever, so
 * the cap fails the test rather than hanging it.
 */
function settle(): number {
  let rounds = 0;
  while (world.pending.size > 0) {
    rounds += 1;
    if (rounds > 8) throw new Error('the panes never stopped answering each other');
    const due = [...world.pending];
    world.pending.clear();
    for (const element of due) fireEvent.scroll(element);
  }
  return rounds;
}

function Harness({ scale, grid }: { readonly scale: number; readonly grid: number | null }) {
  const first = useRef<HTMLDivElement>(null);
  const second = useRef<HTMLDivElement>(null);
  useLinkedPanes({
    first,
    second,
    scale,
    grid,
    sourceWidth: EXTENT.first,
    sourceHeight: EXTENT.first,
  });

  return (
    <>
      <div
        data-testid="first"
        ref={(element) => {
          first.current = element;
          if (element !== null) model(element, EXTENT.first, BOX.first);
        }}
      >
        <span />
      </div>
      <div
        data-testid="second"
        ref={(element) => {
          second.current = element;
          if (element !== null) model(element, EXTENT.second, BOX.second);
        }}
      >
        <span />
      </div>
    </>
  );
}

/** Render the pair at a scale, and hand back both scrollports. */
function panes(scale = 1, grid: number | null = 8) {
  world.scale = scale;
  const view = render(<Harness scale={scale} grid={grid} />);
  return { first: screen.getByTestId('first'), second: screen.getByTestId('second'), view };
}

/** Where a pane is looking, in source pixels — the same conversion the hook is built on. */
function centreOf(element: HTMLElement, box: number): number {
  return (element.scrollLeft + box / 2) / world.scale;
}

/**
 * The two agree, to the only precision a scrollport can be held to.
 *
 * Offsets are whole numbers, so an exact answer is not always available to write: half a screen
 * pixel of disagreement is the floor, which is `0.5 / scale` once converted back into source pixels.
 * Asserting equality instead would be asserting something no browser can do.
 */
function expectSameRegion(a: number, b: number): void {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(0.5 / world.scale);
}

describe('useLinkedPanes', () => {
  it('moves the other pane to the same region of the source image', () => {
    const { first, second } = panes();

    first.scrollLeft = 150;
    first.scrollTop = 150;
    settle();

    // Not the same offsets — the panes have different boxes, so the same source pixel sits at a
    // different number in each. Copying `scrollLeft` across would have put 150 here.
    expect(second.scrollLeft).toBe(152);
    expectSameRegion(centreOf(second, BOX.second), centreOf(first, BOX.first));
  });

  it('moves the first pane when the second is the one the user drove', () => {
    const { first, second } = panes();

    // The link is symmetric, and only driving it from both ends says so: with one listener missing
    // every test above still passes, because they all push from the same side.
    second.scrollLeft = 200;
    settle();

    expect(first.scrollLeft).toBe(199);
    expectSameRegion(centreOf(first, BOX.first), centreOf(second, BOX.second));
  });

  it('goes on driving its partner after a re-anchor that moved neither pane', () => {
    const { first, second, view } = panes(1, 8);
    first.scrollLeft = 200;
    settle();
    expect(second.scrollLeft).toBe(202);

    // A new grid at the same zoom: the panes are already showing the held centre, so both writes
    // land on the offsets they are already at and neither scrollport says anything. A write that
    // moved nothing is owed no scroll event, so nothing may be left waiting for one — an echo
    // recorded here would sit armed until the user next stopped on exactly these offsets, and would
    // then eat that scroll and quietly unlink the pair.
    view.rerender(<Harness scale={1} grid={4} />);
    settle();

    first.scrollLeft = 0;
    settle();
    expect(second.scrollLeft).toBe(2);

    first.scrollLeft = 200;
    settle();
    expect(second.scrollLeft).toBe(202);
  });

  it('settles after a single answer instead of correcting each other forever', () => {
    const { first } = panes();

    first.scrollLeft = 150;
    // One round to deliver the move, one to deliver the answer it caused — and the answer is
    // recognised as this hook's own write, so it goes no further. Without that, the half-pixel the
    // two panes' rounding disagrees on is re-sent every round and the pair walks to the far edge.
    expect(settle()).toBe(2);
  });

  it('leaves the pane the user moved exactly where they put it', () => {
    const { first } = panes();

    first.scrollLeft = 150;
    settle();

    expect(first.scrollLeft).toBe(150);
  });

  it('holds the centre of both panes when the magnification changes', () => {
    const { first, second, view } = panes(1);
    first.scrollLeft = 150;
    settle();
    const held = centreOf(first, BOX.first);

    // The canvases are committed at their new size before any effect runs, which is why the model's
    // scale moves with the render rather than after it.
    world.scale = 4;
    view.rerender(<Harness scale={4} grid={8} />);
    settle();

    expectSameRegion(centreOf(first, BOX.first), held);
    expectSameRegion(centreOf(second, BOX.second), held);
    // And it genuinely moved: leaving the offsets numerically untouched is the bug being fixed.
    expect(first.scrollLeft).toBe(750);
  });

  it('holds the centre on the way back down, where the browser clamps the offsets first', () => {
    const { first, view } = panes(4);
    first.scrollLeft = 750;
    settle();
    const held = centreOf(first, BOX.first);

    world.scale = 1;
    view.rerender(<Harness scale={1} grid={8} />);
    settle();

    expectSameRegion(centreOf(first, BOX.first), held);
  });

  it('squares the panes up again when a new grid resizes the quantised canvas', () => {
    const { first, second, view } = panes(2);
    first.scrollLeft = 200;
    settle();
    second.scrollLeft = 0;
    world.pending.clear();

    view.rerender(<Harness scale={2} grid={4} />);
    settle();

    expectSameRegion(centreOf(second, BOX.second), centreOf(first, BOX.first));
  });

  it('stops listening to a pane it no longer holds', () => {
    const { first, second, view } = panes();
    view.unmount();

    first.scrollLeft = 150;
    world.pending.clear();

    // A listener left on a detached element keeps the whole pair alive, and would go on writing to a
    // pane nothing is showing.
    fireEvent.scroll(first);
    expect(second.scrollLeft).toBe(0);
  });
});
