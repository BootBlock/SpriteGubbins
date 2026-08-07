import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TOAST_DURATION_MS } from '../../constants/ui.ts';
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
        vi.advanceTimersByTime(TOAST_DURATION_MS);
      });

      expect(liveRegion()).toBeEmptyDOMElement();
    } finally {
      vi.useRealTimers();
    }
  });
});
