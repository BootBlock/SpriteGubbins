import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useScrollableRegion } from './useScrollableRegion.ts';

/**
 * The half of this hook `PanViewport.test.tsx` cannot reach: a box that is not there at mount.
 *
 * `PanViewport` and the compiled prompt's `<pre>` render their scrollport unconditionally, so an
 * observation established once, at mount, finds an element and works. **Two of the hook's four call
 * sites do not** — the quantiser's symmetry and frame-alignment lists exist only once the worker has
 * answered, and the panels around them mount long before it does. Against a mount-time effect the
 * ref is still `null` when it runs, it returns, and nothing re-establishes it: the list arrives
 * unobserved, `overflow` stays false for the life of the panel, and the region is never named or
 * made reachable. Silently, and for exactly half the boxes the change was made for.
 *
 * happy-dom performs no layout, so the two things the hook takes from the environment are stubbed as
 * `PanViewport.test.tsx` stubs them: a `ResizeObserver` that reports on demand, and the scroll
 * metrics it reads in response.
 */
let deliverObservation: () => void = () => undefined;

class StubResizeObserver {
  static constructed = 0;
  static disconnected = 0;
  constructor(private readonly callback: ResizeObserverCallback) {
    StubResizeObserver.constructed += 1;
    deliverObservation = () => {
      this.callback([], this as unknown as ResizeObserver);
    };
  }
  observe() {
    return undefined;
  }
  unobserve() {
    return undefined;
  }
  disconnect() {
    StubResizeObserver.disconnected += 1;
  }
}

beforeEach(() => {
  StubResizeObserver.constructed = 0;
  StubResizeObserver.disconnected = 0;
  vi.stubGlobal('ResizeObserver', StubResizeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  deliverObservation = () => undefined;
});

/** Give an element the scroll metrics a laid-out browser would have; happy-dom reports zeroes. */
function measureAs(element: Element, content: number, box: number): void {
  for (const [property, value] of [
    ['scrollWidth', box],
    ['scrollHeight', content],
    ['clientWidth', box],
    ['clientHeight', box],
  ] as const) {
    Object.defineProperty(element, property, { value, configurable: true });
  }
}

/** A capped box holding one text node, which is the compiled prompt's `<pre>` in miniature. */
function TextBox({ text }: { readonly text: string }) {
  const { attach, regionProps } = useScrollableRegion<HTMLPreElement>('Scroll the compiled prompt');
  return (
    <pre {...regionProps} ref={attach} data-testid="prompt">
      {text}
    </pre>
  );
}

/** A list that arrives late, which is the quantiser's two report panels in miniature. */
function LateList({ showing }: { readonly showing: boolean }) {
  const { attach, regionProps } = useScrollableRegion<HTMLUListElement>('Scroll the readings');
  return (
    <section>
      {showing && (
        <ul {...regionProps} ref={attach} data-testid="readings">
          <li>one</li>
        </ul>
      )}
    </section>
  );
}

describe('useScrollableRegion', () => {
  it('watches a box that was not there when the component mounted', () => {
    const { rerender } = render(<LateList showing={false} />);

    // The mount-time state: nothing to observe, and nothing observed.
    expect(StubResizeObserver.constructed).toBe(0);
    expect(screen.queryByTestId('readings')).not.toBeInTheDocument();

    rerender(<LateList showing />);
    const list = screen.getByTestId('readings');
    measureAs(list, 400, 100);
    act(() => {
      deliverObservation();
    });

    expect(list).toHaveAttribute('tabindex', '0');
    expect(list).toHaveAccessibleName('Scroll the readings');
    expect(list).toHaveAttribute('role', 'group');
  });

  it('lets go of the box when it leaves, and of what it measured about it', () => {
    const { rerender } = render(<LateList showing />);
    const list = screen.getByTestId('readings');
    measureAs(list, 400, 100);
    act(() => {
      deliverObservation();
    });
    expect(list).toHaveAttribute('tabindex', '0');

    // An observer outlives the element it watches, so one left connected here would hold the
    // subtree for as long as the page is open — and the overflow it last reported would still be
    // claimed by the *next* box to arrive.
    rerender(<LateList showing={false} />);
    expect(StubResizeObserver.disconnected).toBe(1);

    rerender(<LateList showing />);
    const second = screen.getByTestId('readings');
    expect(second).not.toHaveAttribute('tabindex');
    expect(second).not.toHaveAttribute('role');
  });

  it('notices text that grows past the box, which no observer of children can see', async () => {
    const { rerender } = render(<TextBox text="short" />);
    const box = screen.getByTestId('prompt');
    measureAs(box, 40, 100);
    act(() => {
      deliverObservation();
    });
    expect(box).not.toHaveAttribute('tabindex');

    // A capped box holding one text node: growing the text adds no child for a child-list observer
    // to see, and changes no border box for the `ResizeObserver` to report. Watching
    // `characterData` and re-pointing the resize observer at `children` would reconcile two empty
    // collections and answer nothing — so the mutation callback measures as well.
    measureAs(box, 4000, 100);
    rerender(<TextBox text="a prompt of twenty-eight thousand characters" />);
    // A `MutationObserver` delivers at microtask time, so the assertion waits one rather than
    // reading straight back.
    await act(async () => {
      await Promise.resolve();
    });

    expect(box).toHaveAttribute('tabindex', '0');
    expect(box).toHaveAccessibleName('Scroll the compiled prompt');
  });

  it('builds one observer for a box that stays, however often the component renders', () => {
    const { rerender } = render(<LateList showing />);
    expect(StubResizeObserver.constructed).toBe(1);

    // Three ordinary re-renders touching nothing about the element. A ref callback fires only when
    // the element or the callback's identity changes, which is what keeps this at one — the same
    // property `PanViewport.test.tsx` pins, and the reason the observation was written to be
    // established once in the first place.
    rerender(<LateList showing />);
    rerender(<LateList showing />);
    rerender(<LateList showing />);

    expect(StubResizeObserver.constructed).toBe(1);
    expect(StubResizeObserver.disconnected).toBe(0);
  });
});
