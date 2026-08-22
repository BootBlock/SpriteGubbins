import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppOverlays } from './AppOverlays.tsx';
import { useUIStore } from '../../stores/useUIStore.ts';

/**
 * The four overlays are each in a chunk of their own, and the frame they open in is deliberately
 * not: `Modal` opens a `<dialog showModal()>` on mount and closes it on unmount, so a frame inside
 * the lazy half would open one dialog for the wait and a second for the contents — the backdrop and
 * the panel's entrance played twice, and focus moved twice, every time a reader pressed the control.
 *
 * These assertions are what would catch that coming back: one dialog, titled before its contents
 * exist, and the contents arriving into the same one.
 */
describe('AppOverlays', () => {
  const overlays = [
    { open: 'isAtlasModalOpen', title: 'Sprite Atlas & Grid Calculator' },
    { open: 'isHistoryModalOpen', title: 'Prompt History' },
    { open: 'isSplitModalOpen', title: 'Split into separate sheets' },
    { open: 'isSettingsModalOpen', title: 'Settings' },
  ] as const;

  for (const { open, title } of overlays) {
    it(`opens one titled dialog for ${title} before its chunk has landed`, async () => {
      useUIStore.setState({
        isAtlasModalOpen: false,
        isHistoryModalOpen: false,
        isSplitModalOpen: false,
        isSettingsModalOpen: false,
        [open]: true,
      });
      render(<AppOverlays />);

      // Synchronously — the frame is in the chunk that is already parsed, so the press is answered
      // in the same commit rather than after a network round trip.
      expect(screen.getAllByRole('dialog', { hidden: true })).toHaveLength(1);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(title);
      expect(screen.getByRole('status')).toHaveTextContent(`Loading ${title}`);

      // …and the contents land in that same dialog rather than a second one.
      // A generous window, and the case that needs it is a cold transform of that overlay's whole
      // import graph under a full suite. It is paired with the timeout on the case itself: a
      // `waitFor` cannot outlive the test around it, so a window wider than Vitest's five-second
      // default buys nothing on its own — it just reports the timeout from the wrong place.
      await waitFor(
        () => {
          expect(screen.queryByText(`Loading ${title}`)).not.toBeInTheDocument();
        },
        { timeout: 20_000 },
      );
      expect(screen.getAllByRole('dialog', { hidden: true })).toHaveLength(1);
    }, 30_000);
  }

  it('shows the notification region instead when no overlay is open', () => {
    useUIStore.setState({
      isAtlasModalOpen: false,
      isHistoryModalOpen: false,
      isSplitModalOpen: false,
      isSettingsModalOpen: false,
    });
    const { container } = render(<AppOverlays />);

    expect(container.querySelector('dialog')).toBeNull();
    // `Toast` renders its live region whether or not a message is showing, which is what lets a
    // message announce at all — a region added at the same moment as its text is not announced.
    expect(container.querySelector('[aria-live]')).not.toBeNull();
  });
});
