import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TOAST_DURATION_MS, TOAST_EXIT_MS } from '../../constants/ui.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { Modal } from './Modal.tsx';
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

/**
 * The boundary the app's one toast is carried across, with the lazy chunk taken out.
 *
 * `AppOverlays` is this shape: a `Modal` — which renders the toast inside its `<dialog>`, because a
 * modal dialog paints above the whole document and makes the rest of it inert — or a bare `Toast`
 * when no overlay is open. The two are mutually exclusive, so opening or closing an overlay unmounts
 * one and mounts the other, and every animation that belonged to the old mount is gone.
 */
function Boundary({ overlayOpen }: { readonly overlayOpen: boolean }) {
  if (!overlayOpen) return <Toast />;
  return (
    <Modal title="Prompt History" icon="🕓" onClose={() => {}} panelClassName="max-w-md">
      <p>Contents</p>
    </Modal>
  );
}

function countdownBar(card: HTMLElement | null): HTMLElement {
  const bar = card?.querySelector('.animate-toast-timer');
  if (!(bar instanceof HTMLElement)) throw new Error('the toast should draw a countdown bar.');
  return bar;
}

function cardFor(message: string): HTMLElement {
  const card = screen.getByText(message).parentElement;
  if (!(card instanceof HTMLElement)) throw new Error('the toast message should sit on a card.');
  return card;
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
  it('resumes its countdown when an overlay opens over it', () => {
    // The defect this holds shut: the toast is mounted in one of two mutually exclusive places, so
    // crossing between them unmounted the card and mounted a fresh one — which replayed the entrance
    // and started the countdown again while the store went on removing the message on the original
    // schedule. It then vanished with the bar about a third drained.
    vi.useFakeTimers();
    try {
      const { rerender } = render(<Boundary overlayOpen={false} />);
      act(() => {
        useUIStore.getState().showToast('Prompt copied to the clipboard');
      });

      // Nothing to make up on the first mount: the raise and the mount are the same moment.
      expect(cardFor('Prompt copied to the clipboard')).toHaveStyle({ animationDelay: '0ms' });

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      rerender(<Boundary overlayOpen />);

      // A different DOM node, two seconds of the dwell already spent. Both animations are handed
      // that as a negative delay, so each picks up where the old mount left it: the bar has 1000ms
      // of its 3000ms left, and the 624ms entrance is long finished rather than sliding in again.
      const card = cardFor('Prompt copied to the clipboard');
      expect(card).toHaveStyle({ animationDelay: '-2000ms' });
      expect(countdownBar(card)).toHaveStyle({
        animationDelay: '-2000ms',
        animationDuration: `${TOAST_DURATION_MS}ms`,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not start its fade over when an overlay closes part-way through it', () => {
    // The same defect wearing its other face. A card mounted during the exit would otherwise snap
    // back to full opacity and fade again, over a message the store removes part-way through.
    vi.useFakeTimers();
    try {
      const { rerender } = render(<Boundary overlayOpen />);
      act(() => {
        useUIStore.getState().showToast('Copied atlas JSON');
      });

      act(() => {
        vi.advanceTimersByTime(TOAST_DURATION_MS + 800);
      });
      rerender(<Boundary overlayOpen={false} />);

      const card = cardFor('Copied atlas JSON');
      expect(card).toHaveAttribute('inert');
      expect(card).toHaveStyle({
        animationDelay: '-800ms',
        animationDuration: `${TOAST_EXIT_MS}ms`,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives each new message its own anchor rather than the one before it', () => {
    // The offset is frozen as the card mounts, and the card is keyed by the toast's id — so a second
    // notification raised over a stale first one starts at the beginning of its own countdown.
    vi.useFakeTimers();
    try {
      render(<Toast />);
      act(() => {
        useUIStore.getState().showToast('Saved custom preset');
      });
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      act(() => {
        useUIStore.getState().showToast('Saved a second custom preset');
      });

      const card = cardFor('Saved a second custom preset');
      expect(card).toHaveStyle({ animationDelay: '0ms' });
      expect(countdownBar(card)).toHaveStyle({ animationDelay: '0ms' });
    } finally {
      vi.useRealTimers();
    }
  });
});
