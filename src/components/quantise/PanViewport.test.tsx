import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PanViewport } from './PanViewport.tsx';

/**
 * What the viewport promises about itself: a cursor, a tab stop, a name and a `touch-action`, each
 * of which is only honest while there is somewhere to scroll. The drag those affordances advertise
 * is `useDragPan`'s, and is tested beside it.
 *
 * happy-dom performs no layout, so the two things the component takes from the environment are
 * stubbed: a `ResizeObserver` that reports on demand, and the scroll metrics it reads in response.
 */
let deliverObservation: () => void = () => undefined;

/**
 * The stub records what it was pointed at and whether it was let go of, because both are promises the
 * component makes and neither is visible in the DOM. The effect has no dependency array, so a fresh
 * observer replaces this one after every commit — `latest` is therefore the live one, and the only one
 * whose observations are still in force.
 */
class StubResizeObserver {
  static latest: StubResizeObserver | null = null;
  readonly observed: Element[] = [];
  isDisconnected = false;

  constructor(private readonly callback: ResizeObserverCallback) {
    StubResizeObserver.latest = this;
    deliverObservation = () => {
      this.callback([], this);
    };
  }
  observe(target: Element) {
    this.observed.push(target);
  }
  unobserve() {}
  disconnect() {
    this.isDisconnected = true;
  }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', StubResizeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  deliverObservation = () => undefined;
  StubResizeObserver.latest = null;
});

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
    <PanViewport label="Pan the sheet as it arrived">
      <canvas role="img" aria-label="The sheet as it arrived" />
    </PanViewport>,
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

  it('claims both axes from the browser when both overflow, leaving it the pinch', () => {
    expect(viewport().style.touchAction).toBe('pinch-zoom');
  });

  it('leaves a finger free to scroll the page down through a pane that only overflows sideways', () => {
    expect(viewport({ content: { x: 400, y: 100 } }).style.touchAction).toBe('pan-y pinch-zoom');
  });

  it('leaves a finger free to swipe across a pane that only overflows downwards', () => {
    expect(viewport({ content: { x: 100, y: 400 } }).style.touchAction).toBe('pan-x pinch-zoom');
  });

  it('leaves the browser everything where there is nothing to pan', () => {
    expect(viewport({ content: { x: 100, y: 100 } }).style.touchAction).toBe('');
  });

  it('watches the content as well as the box, and lets go of both when it unmounts', () => {
    const { unmount } = render(
      <PanViewport label="Pan the sheet as it arrived">
        <canvas role="img" aria-label="The sheet as it arrived" />
      </PanViewport>,
    );
    const canvas = screen.getByRole('img', { name: 'The sheet as it arrived' });

    // The box alone would not do: it is capped at `max-h-96` and never changes size, so a canvas
    // growing inside it at a new zoom is a resize only the child ever reports.
    const observer = StubResizeObserver.latest;
    expect(observer?.observed).toEqual([canvas.parentElement, canvas]);

    // An observer outlives the element it watches, so an effect that registered one and never
    // disconnected it would hold the whole subtree for as long as the page is open.
    unmount();
    expect(observer?.isDisconnected).toBe(true);
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
    // A finger has no cursor, so the border is what tells a touch user the drag was registered.
    expect(element).toHaveClass('cursor-grabbing', 'select-none', 'border-neon');

    fireEvent.pointerUp(element, { pointerId: 1 });
    expect(element).toHaveClass('cursor-grab', 'border-foundry-700');
  });
});
