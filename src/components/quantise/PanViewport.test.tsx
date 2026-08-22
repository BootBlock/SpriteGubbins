import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PanViewport } from './PanViewport.tsx';

/**
 * What the viewport promises about itself: a cursor, a tab stop and a name, each of which is only
 * honest while there is somewhere to scroll — plus the two things the geometry rests on, that it
 * claims no gesture from the browser and carries no padding. The drag those affordances advertise is
 * `useDragPan`'s, and is tested beside it.
 *
 * happy-dom performs no layout, so the two things the component takes from the environment are
 * stubbed: a `ResizeObserver` that reports on demand, and the scroll metrics it reads in response.
 */
let deliverObservation: () => void = () => undefined;

/**
 * The stub records what it was pointed at, what it was let go of, and how many of it were built — all
 * three are promises the component makes, and none of them is visible in the DOM.
 *
 * The count is the one worth explaining. The effect that establishes the observation sits on the
 * pane's hot path: the component renders under a drag, under every dial the reader moves, and under
 * the observer's own callback. So the effect holds an empty dependency array and points a single
 * observer at whatever the children become, and `constructed` is what holds it to that.
 */
class StubResizeObserver {
  static latest: StubResizeObserver | null = null;
  static constructed = 0;
  readonly observed: Element[] = [];
  readonly released: Element[] = [];
  isDisconnected = false;

  constructor(private readonly callback: ResizeObserverCallback) {
    StubResizeObserver.latest = this;
    StubResizeObserver.constructed += 1;
    deliverObservation = () => {
      this.callback([], this);
    };
  }
  observe(target: Element) {
    this.observed.push(target);
  }
  unobserve(target: Element) {
    this.released.push(target);
  }
  disconnect() {
    this.isDisconnected = true;
  }
}

beforeEach(() => {
  StubResizeObserver.constructed = 0;
  vi.stubGlobal('ResizeObserver', StubResizeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  deliverObservation = () => undefined;
  StubResizeObserver.latest = null;
});

/** The scrollport is the caller's, so the tests own one too rather than reaching for the DOM parent. */
function Harness({ children }: { readonly children: ReactNode }) {
  const viewportRef = useCallback(() => undefined, []);
  return (
    <PanViewport label="Pan the sheet as it arrived" viewportRef={viewportRef}>
      {children}
    </PanViewport>
  );
}

/** Give an element the scroll metrics a laid-out browser would have, since happy-dom reports zeroes. */
function measureAs(element: Element, content: { x: number; y: number }, box: number): void {
  for (const [property, value] of [
    ['scrollWidth', content.x],
    ['scrollHeight', content.y],
    ['clientWidth', box],
    ['clientHeight', box],
  ] as const) {
    Object.defineProperty(element, property, { value, configurable: true });
  }
}

/**
 * A 400 × 400 image in a 100 × 100 box, unless a test asks otherwise — four times wider and taller
 * than what is showing, which is the case the whole component exists for.
 */
function viewport({ content = { x: 400, y: 400 }, box = 100 } = {}): HTMLElement {
  render(
    <Harness>
      <canvas role="img" aria-label="The sheet as it arrived" />
    </Harness>,
  );
  const element = screen.getByRole('img', { name: 'The sheet as it arrived' }).parentElement;
  if (element === null) throw new Error('the viewport did not render');
  measureAs(element, content, box);
  // The real observer delivers its first entry from inside the browser's own frame; here the call is
  // ours, so it needs `act` to be the render pass React commits before the assertions read the DOM.
  act(() => {
    deliverObservation();
  });
  return element;
}

describe('PanViewport', () => {
  it('offers the grab cursor only while there is something to grab', () => {
    const element = viewport({ content: { x: 100, y: 100 } });

    // Nothing overflows, so there is no region to announce, no tab stop that would do anything, and
    // no cursor promising a drag that could not move anything.
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(element).not.toHaveClass('cursor-grab');
    expect(element).not.toHaveAttribute('tabindex');
  });

  it('becomes reachable by keyboard, and named for what it does, once the image overflows', () => {
    const element = viewport();

    expect(element).toHaveAttribute('tabindex', '0');
    expect(element).toHaveAccessibleName('Pan the sheet as it arrived');
    expect(element).toHaveClass('cursor-grab');
  });

  it('keeps a focused region reachable after its overflow goes, rather than dropping focus', () => {
    const element = viewport();
    act(() => {
      element.focus();
    });

    measureAs(element, { x: 100, y: 100 }, 100);
    act(() => {
      deliverObservation();
    });

    // Removing `tabindex` from the focused element blurs it to `<body>`, and the next Tab restarts
    // at the top of the page with nothing said about why.
    expect(element).toHaveAttribute('tabindex', '0');
    expect(element).toHaveFocus();

    act(() => {
      element.blur();
    });
    expect(element).not.toHaveAttribute('tabindex');
  });

  it('claims no gesture from the browser, even with both axes overflowing', () => {
    // The pane is full-width below `lg` and 24rem tall, twice over, so claiming the vertical swipe
    // would leave a finger no way to scroll the page past it — and the browser's own pan has momentum
    // and chains out to the page, which no handler here reproduces.
    expect(viewport().style.touchAction).toBe('');
  });

  it('carries no padding, which is what puts the content at scroll offset zero', () => {
    // `src/utils/panGeometry.ts` converts offsets to source pixels with no term for a content origin.
    // Padding inside a scrolling box displaces the content within the scroll coordinate space, so a
    // `p-*` here would put a scale-dependent error into every one of those conversions.
    expect(viewport().className).not.toMatch(/(?:^|\s)p-\d/);
  });

  it('watches the content as well as the box, and lets go of both when it unmounts', () => {
    const { unmount } = render(
      <Harness>
        <canvas role="img" aria-label="The sheet as it arrived" />
      </Harness>,
    );
    const canvas = screen.getByRole('img', { name: 'The sheet as it arrived' });

    // The box alone would not do: it is a frame sized by the page rather than by the artwork, so a
    // canvas growing inside it at a new zoom is a resize only the child reports.
    const observer = StubResizeObserver.latest;
    expect(observer?.observed).toEqual([canvas.parentElement, canvas]);

    // An observer outlives the element it watches, so an effect that registered one and never
    // disconnected it would hold the whole subtree for as long as the page is open.
    unmount();
    expect(observer?.isDisconnected).toBe(true);
  });

  it('builds one observer for the life of the pane, however often it renders', () => {
    const element = viewport();
    expect(StubResizeObserver.constructed).toBe(1);

    // Three ordinary renders of the pane, none of them touching the children: the focus the drag
    // takes, the focus it gives back, and the overflow the observer itself reports. An observation
    // re-established on each of these costs a disconnect, an allocation and a forced synchronous
    // layout — per pane, per render, and twice per drag.
    act(() => {
      element.focus();
    });
    act(() => {
      element.blur();
    });
    measureAs(element, { x: 100, y: 100 }, 100);
    act(() => {
      deliverObservation();
    });

    expect(StubResizeObserver.constructed).toBe(1);
    expect(StubResizeObserver.latest?.isDisconnected).toBe(false);
  });

  it('follows the content when it is replaced, without rebuilding the observer', async () => {
    const { rerender } = render(
      <Harness>
        <p>Quantise a sheet to see it here.</p>
      </Harness>,
    );
    const placeholder = screen.getByText('Quantise a sheet to see it here.');
    const box = placeholder.parentElement;
    const observer = StubResizeObserver.latest;
    expect(observer?.observed).toEqual([box, placeholder]);

    // The case the empty dependency array has to keep covering: `ImageComparison` swaps the
    // placeholder for the canvas a result brings, and the child is *replaced* rather than resized. A
    // `MutationObserver` is what notices, so the assertions wait a microtask for it rather than reading straight back.
    rerender(
      <Harness>
        <canvas role="img" aria-label="The sheet as it arrived" />
      </Harness>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    const canvas = screen.getByRole('img', { name: 'The sheet as it arrived' });

    expect(StubResizeObserver.constructed).toBe(1);
    expect(observer?.observed).toEqual([box, placeholder, canvas]);
    // The departed child is let go of rather than held: an observation on a detached element keeps
    // the whole subtree alive for as long as the pane is mounted.
    expect(observer?.released).toEqual([placeholder]);
  });

  it('takes the focus its arrow keys need, and cancels the press that would select the image', () => {
    const element = viewport();

    // A press left uncancelled starts a text selection and a drag image over the canvas, and it is
    // the synthesised `mousedown` underneath it that would have moved focus — so the hook suppresses
    // the one and does the other itself, which is what makes the tooltip's keyboard hand-off true.
    const dispatched = fireEvent.pointerDown(element, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
      isPrimary: true,
      clientX: 200,
      clientY: 200,
    });

    expect(dispatched).toBe(false);
    expect(element).toHaveFocus();
  });

  it('shows the closed hand while dragging, and suppresses selection with it', () => {
    const element = viewport();

    fireEvent.pointerDown(element, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
      clientX: 200,
      clientY: 200,
    });
    // Cyan marks the drag as live, and outlives the cursor: the pointer can leave the box entirely
    // while the capture holds, and the border is what still says the pane is the one being moved.
    expect(element).toHaveClass('cursor-grabbing', 'select-none', 'border-neon');

    fireEvent.pointerUp(element, { pointerId: 1 });
    expect(element).toHaveClass('cursor-grab', 'border-foundry-700');
  });
});
