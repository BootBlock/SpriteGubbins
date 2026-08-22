import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TOAST_DURATION_MS, TOAST_EXIT_MS } from '../../constants/ui.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { Toast } from './Toast.tsx';

/**
 * The confirmation surface. Two things matter and neither is visual: the live region has to exist
 * before the message does, or nothing is announced; and the toast has to be dismissible, because a
 * notification that can only be waited out is a notification in the way.
 */
function liveRegion(): HTMLElement {
  // Queried by attribute because a live region has no role of its own — being announced is the whole
  // of what it is.
  const region = document.querySelector('[aria-live="polite"]');
  if (!(region instanceof HTMLElement)) throw new Error('the toast live region should be rendered.');
  return region;
}

beforeEach(() => {
  useUIStore.getState().dismissToast();
});

afterEach(() => {
  useUIStore.getState().dismissToast();
});

describe('Toast', () => {
  it('renders its live region even with nothing to say', () => {
    render(<Toast />);

    // Present but empty. A region created at the same moment as its text is not reliably announced.
    expect(liveRegion()).toBeInTheDocument();
    expect(liveRegion()).toBeEmptyDOMElement();
  });

  it('shows a message raised through the store', () => {
    render(<Toast />);

    act(() => {
      useUIStore.getState().showToast('Prompt copied to the clipboard');
    });

    expect(liveRegion()).toHaveTextContent('Prompt copied to the clipboard');
  });

  it('holds its region open for a message addressed to another surface', () => {
    render(<Toast />);

    act(() => {
      useUIStore.getState().showToast('Downloaded sheet-quantised.png', 'detached');
    });

    // The quantiser's detached preview has a `Toast` of its own, and the store holds one message —
    // so this one showing it too would announce every download twice, once on a surface the reader
    // is not looking at. The region still stands, because a region that appears with its text is
    // not reliably announced and this document may be given something of its own a moment later.
    expect(liveRegion()).toBeInTheDocument();
    expect(liveRegion()).toBeEmptyDOMElement();
  });

  it('shows a message addressed to the surface it was mounted for', () => {
    render(<Toast target="detached" />);

    act(() => {
      useUIStore.getState().showToast('Downloaded sheet-quantised.png', 'detached');
    });

    expect(liveRegion()).toHaveTextContent('Downloaded sheet-quantised.png');
  });

  it('can be dismissed before its time is up', async () => {
    const user = userEvent.setup();
    render(<Toast />);

    act(() => {
      useUIStore.getState().showToast('Saved custom preset');
    });
    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));

    expect(liveRegion()).toBeEmptyDOMElement();
  });

  it('empties itself once the store times the message out', () => {
    vi.useFakeTimers();
    try {
      render(<Toast />);
      act(() => {
        useUIStore.getState().showToast('Downloaded sprite-prompt.md');
      });
      expect(liveRegion()).toHaveTextContent('Downloaded sprite-prompt.md');

      act(() => {
        vi.advanceTimersByTime(TOAST_DURATION_MS + TOAST_EXIT_MS);
      });

      expect(liveRegion()).toBeEmptyDOMElement();
    } finally {
      vi.useRealTimers();
    }
  });

  it('fades off the screen inert, rather than disappearing between two frames', () => {
    vi.useFakeTimers();
    try {
      render(<Toast />);
      act(() => {
        useUIStore.getState().showToast('Copied atlas JSON');
      });

      act(() => {
        vi.advanceTimersByTime(TOAST_DURATION_MS);
      });

      // Still mounted, because a surface that has been removed has nothing left to animate — and
      // the exit's length is read from the constant the store's own timer uses, not written twice.
      const card = screen.getByText('Copied atlas JSON').parentElement;
      expect(card).not.toBeNull();
      expect(card).toHaveStyle({ animationDuration: `${TOAST_EXIT_MS}ms` });

      // Inert for the whole of the fade. A transparent card left interactive would swallow clicks
      // meant for the page beneath it, which under `prefers-reduced-motion` is the entire window —
      // the animation collapses to nothing there while this timer still runs its full length.
      expect(card).toHaveAttribute('inert');
    } finally {
      vi.useRealTimers();
    }
  });
});
