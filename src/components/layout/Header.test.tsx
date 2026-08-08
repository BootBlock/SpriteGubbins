import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { Header } from './Header.tsx';

/**
 * The half of the sticky-header fix that lives in a component.
 *
 * `index.css` reads `--header-height` for `scroll-padding-top`, and a test over the stylesheet can
 * only prove the *reading* end. If nothing ever publishes the value the property falls back to
 * `0px` and the fix silently reverts to the bug — anything Tab or `scrollIntoView` reaches lands
 * underneath the bar again — with every other test still green. This is the writing end.
 *
 * happy-dom performs no layout, so both things the effect depends on are modelled: a
 * `ResizeObserver` that reports on demand, and the height it would have reported.
 */
let deliver: () => void = () => undefined;

class StubResizeObserver {
  static disconnected = false;
  constructor(private readonly callback: ResizeObserverCallback) {
    deliver = () => {
      this.callback([], this);
    };
  }
  observe() {}
  unobserve() {}
  disconnect() {
    StubResizeObserver.disconnected = true;
  }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', StubResizeObserver);
  StubResizeObserver.disconnected = false;
  // Every header this file renders is 78 tall — the figure a 1280-wide viewport actually produces.
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { value: 78, configurable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  deliver = () => undefined;
  document.documentElement.style.removeProperty('--header-height');
});

describe('Header', () => {
  it('publishes its own height, which is what holds a scroll clear of it', () => {
    render(<Header />);
    act(() => {
      deliver();
    });

    // Measured, not written into the stylesheet: the bar wraps, so no single figure is right at
    // every width, and one written down rots the first time its padding or type size moves.
    expect(document.documentElement.style.getPropertyValue('--header-height')).toBe('78px');
  });

  it('lets go of the observer and the property when it unmounts', () => {
    const { unmount } = render(<Header />);
    act(() => {
      deliver();
    });

    unmount();

    // An observer outlives the element it watches, and a property left behind has the page
    // reserving room at the top for a bar that is no longer there.
    expect(StubResizeObserver.disconnected).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--header-height')).toBe('');
  });
});
