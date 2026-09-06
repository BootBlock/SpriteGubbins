import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppOverlays } from './AppOverlays.tsx';
import { useUIStore } from '../../stores/useUIStore.ts';

const CLOSED = {
  isAtlasModalOpen: false,
  isHistoryModalOpen: false,
  isSplitModalOpen: false,
  isSettingsModalOpen: false,
} as const;

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

  /**
   * Closing an overlay has to give the keyboard back, and the platform is what does it.
   *
   * `<dialog>`'s `close()` restores focus to whatever was focused when `showModal()` ran, which is
   * the whole reason `Modal` is built on a native dialog rather than a stack of positioned `<div>`s.
   * Three of the four things that buys — the top layer, the inert background and Escape — arrive on
   * their own. The focus restore is the one that has to be asked for correctly, because HTML's
   * *close the dialog* steps run against a `previouslyFocusedElement` and restore nothing when the
   * dialog itself has already left the document.
   *
   * **The assertion is the ordering, not the focus.** happy-dom performs no focus restore of its
   * own, so a test that read `document.activeElement` here would be asserting the stub rather than
   * the platform — the four overlays were driven in Edge instead, and every one of them returns the
   * keyboard to its opener. What is checked here is the thing that made the platform refuse:
   * `close()` reaching a detached node. A **passive** effect is exactly that case, because React
   * runs a deleted subtree's passive destroy functions after the mutation phase has detached its
   * host nodes; a layout destroy runs while the element is still connected. The prototype is patched
   * rather than the source read, which is how the defect was measured in the browser.
   */
  it('closes the dialog while it is still in the document, so the platform restores focus', async () => {
    const connectedAtClose: boolean[] = [];
    const close = HTMLDialogElement.prototype.close;
    vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
      this: HTMLDialogElement,
      returnValue?: string,
    ) {
      connectedAtClose.push(this.isConnected);
      close.call(this, returnValue);
    });

    useUIStore.setState({ ...CLOSED, isSettingsModalOpen: true });
    const view = render(<AppOverlays />);
    await waitFor(
      () => {
        expect(screen.queryByText('Loading Settings')).not.toBeInTheDocument();
      },
      { timeout: 20_000 },
    );

    view.unmount();

    // At least one call, and every one of them on a connected element. More than one is React 19
    // Strict Mode's cleanup-then-re-run at mount, which is followed by a second `showModal()` and
    // does not bear on the defect; a call with `isConnected` false is the defect itself.
    expect(connectedAtClose.length).toBeGreaterThan(0);
    expect(connectedAtClose).not.toContain(false);
  }, 30_000);
});

afterEach(() => {
  vi.restoreAllMocks();
});
