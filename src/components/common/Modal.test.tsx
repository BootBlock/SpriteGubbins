import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal.tsx';

/**
 * The frame all four overlays open in, built on a native `<dialog>`.
 *
 * The platform supplies the top layer, the inert background, Escape and the focus restore, so what is
 * this component's to get right is how it asks for them. It opens modally the moment it mounts; it
 * routes Escape through the caller, because a dialog that closed itself would leave the store believing
 * the overlay is still open; it carries the app's toast inside itself, since an open modal dialog paints
 * over everything outside it; and it closes while it is still in the document, which is the one ordering
 * the platform's focus restore depends on.
 */
function renderModal() {
  const onClose = vi.fn();
  const view = render(
    <Modal title="Settings" icon="⚙" onClose={onClose} panelClassName="max-w-md">
      <p>Contents</p>
    </Modal>,
  );
  const dialog = view.container.querySelector('dialog');
  if (dialog === null) throw new Error('the frame should be a native dialog.');
  return { onClose, dialog, view };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Modal', () => {
  it('opens as a modal dialog the moment it mounts, named by its title', () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    const { dialog } = renderModal();

    expect(showModal).toHaveBeenCalledOnce();
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAccessibleName('Settings');
    expect(screen.getByText('Contents')).toBeInTheDocument();
  });

  it('closes through the caller from its labelled button', async () => {
    const { onClose } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Close Settings' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('routes Escape through the caller instead of closing behind the app’s back', () => {
    const { onClose, dialog } = renderModal();
    // Escape on an open modal dialog fires a cancelable `cancel`, whose default is to close it.
    const cancel = new Event('cancel', { cancelable: true });

    fireEvent(dialog, cancel);

    expect(onClose).toHaveBeenCalledOnce();
    expect(cancel.defaultPrevented).toBe(true);
    expect(dialog).toHaveAttribute('open');
  });

  it('carries the toast inside the dialog, where the top layer leaves it visible', () => {
    const { dialog } = renderModal();

    expect(dialog.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  /**
   * **The assertion is the ordering, not the focus.** happy-dom performs no focus restore of its own,
   * so reading `document.activeElement` here would assert the stub rather than the platform — the four
   * overlays were driven in Edge instead, and every one returns the keyboard to its opener. What is
   * checked is the thing that made the platform refuse: `close()` reaching a detached node. A passive
   * effect is exactly that case, because React runs a deleted subtree's passive destroy functions after
   * the mutation phase has detached its host nodes; a layout destroy runs while the element is still
   * connected. The prototype is patched rather than the source read, which is how the defect was
   * measured in the browser.
   */
  it('closes the dialog while it is still in the document, so the platform restores focus', () => {
    const connectedAtClose: boolean[] = [];
    const close = HTMLDialogElement.prototype.close;
    vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
      this: HTMLDialogElement,
      returnValue?: string,
    ) {
      connectedAtClose.push(this.isConnected);
      close.call(this, returnValue);
    });
    const { view } = renderModal();

    view.unmount();

    // At least one call, and every one of them on a connected element; a call with `isConnected` false
    // is the defect itself.
    expect(connectedAtClose.length).toBeGreaterThan(0);
    expect(connectedAtClose).not.toContain(false);
  });
});
