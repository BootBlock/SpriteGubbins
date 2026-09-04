import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useFileDropGuard } from './useFileDropGuard.ts';
import { useFileDropTarget } from './useFileDropTarget.ts';

/**
 * The shell, a drop target, a text field, a read-only field and a slider — every place a drag lands.
 *
 * The target is real rather than mimed, because the property that keeps the two from fighting is a
 * propagation order — React delegates `onDragOver` to the root container, and the guard listens on
 * the window above it — and a stand-in that called `preventDefault()` itself would prove nothing
 * about where React actually attaches. The three inputs are plain `<input>`s for the opposite
 * reason: nothing about them is the app's, and what the guard reads is each control's own kind.
 */
function Harness({ acceptFile }: { readonly acceptFile: (file: File | null | undefined) => void }) {
  useFileDropGuard(window);
  const { isDraggedOver, dropHandlers } = useFileDropTarget(acceptFile);
  return (
    <>
      <div aria-label="zone" role="group" data-over={isDraggedOver} {...dropHandlers} />
      <input aria-label="field" />
      <input aria-label="dial" type="range" />
      <input aria-label="locked" readOnly value="" onChange={() => undefined} />
    </>
  );
}

/** The three members of `DataTransfer` the guard and the drop target between them read. */
interface TransferStub {
  readonly types: readonly string[];
  dropEffect: string;
  readonly files: { readonly item: (index: number) => File | null };
}

/**
 * A drag event carrying a transfer, built by hand.
 *
 * happy-dom implements neither of the two things this hook reads. `DragEvent` is an alias of `Event`
 * (`BrowserWindow.js` assigns `DragEvent = Event`), so there is no constructor for a `dataTransfer`
 * init member to reach; and its `DataTransfer.types` reports a file item's MIME type where a browser
 * reports the literal `Files`. So the transfer is modelled to the platform's contract rather than to
 * happy-dom's approximation — the same choice, for the same reason, as the popover stubs in
 * `src/test/setup.ts`.
 */
function dragEvent(type: 'dragover' | 'drop', types: readonly string[], file: File | null = null) {
  const event = new DragEvent(type, { bubbles: true, cancelable: true });
  const transfer: TransferStub = { types, dropEffect: 'copy', files: { item: () => file } };
  Object.defineProperty(event, 'dataTransfer', { value: transfer });
  return { event, transfer };
}

/** Render the harness and hand back the spy the drop target reports a file to. */
function harness() {
  const acceptFile = vi.fn<(file: File | null | undefined) => void>();
  const rendered = render(<Harness acceptFile={acceptFile} />);
  return { acceptFile, ...rendered };
}

describe('useFileDropGuard', () => {
  it('refuses a file dragged over anywhere the app draws no target', () => {
    harness();
    const { event, transfer } = dragEvent('dragover', ['Files']);

    fireEvent(document.body, event);

    expect(event.defaultPrevented).toBe(true);
    expect(transfer.dropEffect).toBe('none');
  });

  it('cancels a stray drop as well, so a delivered one still navigates nowhere', () => {
    harness();
    const { event, transfer } = dragEvent('drop', ['Files']);

    fireEvent(document.body, event);

    // Set on the drop too: the model reads it back as what the drag source is told happened, and
    // the inherited `'copy'` would report a copy nothing performed.
    expect(event.defaultPrevented).toBe(true);
    expect(transfer.dropEffect).toBe('none');
  });

  it('stands aside for a drop target, which has already cancelled the event itself', () => {
    harness();
    const zone = screen.getByRole('group', { name: 'zone' });
    const { event, transfer } = dragEvent('dragover', ['Files']);

    fireEvent(zone, event);

    // The zone's own handler ran, and the guard wrote nothing over it — `'copy'` is the value the
    // drag arrived with, which is what the cursor over an accepting target is drawn from.
    expect(zone).toHaveAttribute('data-over', 'true');
    expect(event.defaultPrevented).toBe(true);
    expect(transfer.dropEffect).toBe('copy');
  });

  it('lets a drop target keep the file it was given', () => {
    const { acceptFile } = harness();
    const zone = screen.getByRole('group', { name: 'zone' });
    const sheet = new File([new Uint8Array([1])], 'sheet.png', { type: 'image/png' });

    fireEvent(zone, dragEvent('dragover', ['Files'], sheet).event);
    fireEvent(zone, dragEvent('drop', ['Files'], sheet).event);

    expect(acceptFile).toHaveBeenCalledWith(sheet);
  });

  it('leaves a drag carrying no file alone where it lands in a field', () => {
    harness();
    const field = screen.getByRole('textbox', { name: 'field' });
    const { event, transfer } = dragEvent('dragover', ['text/plain']);

    fireEvent(field, event);

    // Dropping selected text or a link into a box that edits text is what the default action is
    // for, and `'copy'` is left as it arrived so the cursor still says the field will take it.
    expect(event.defaultPrevented).toBe(false);
    expect(transfer.dropEffect).toBe('copy');
  });

  it('refuses a link dragged onto anything that cannot use it, which would navigate the page away', () => {
    harness();
    const { event, transfer } = dragEvent('dragover', ['text/uri-list', 'text/plain']);

    fireEvent(document.body, event);

    expect(event.defaultPrevented).toBe(true);
    expect(transfer.dropEffect).toBe('none');
  });

  it('cancels a link drop as well, so a delivered one navigates nowhere', () => {
    harness();
    const { event, transfer } = dragEvent('drop', ['text/uri-list']);

    fireEvent(document.body, event);

    expect(event.defaultPrevented).toBe(true);
    expect(transfer.dropEffect).toBe('none');
  });

  it('refuses a file dragged into a field, which navigates just as it does anywhere else', () => {
    harness();
    const field = screen.getByRole('textbox', { name: 'field' });
    const sheet = new File([new Uint8Array([1])], 'sheet.png', { type: 'image/png' });
    const { event, transfer } = dragEvent('dragover', ['Files'], sheet);

    fireEvent(field, event);

    expect(event.defaultPrevented).toBe(true);
    expect(transfer.dropEffect).toBe('none');
  });

  it('refuses a link dragged onto a read-only field, which will not take it either', () => {
    harness();
    const locked = screen.getByRole('textbox', { name: 'locked' });
    const { event, transfer } = dragEvent('dragover', ['text/uri-list']);

    fireEvent(locked, event);

    // `NumberField` renders its unavailable state as `readOnly` and keeps the control in the tab
    // order, so this is a box the Quantise tab really shows and a drag can really land on.
    expect(event.defaultPrevented).toBe(true);
    expect(transfer.dropEffect).toBe('none');
  });

  it('refuses a link dragged onto a slider, which is a control with nowhere to put it', () => {
    harness();
    const dial = screen.getByRole('slider', { name: 'dial' });
    const { event, transfer } = dragEvent('dragover', ['text/uri-list']);

    fireEvent(dial, event);

    expect(event.defaultPrevented).toBe(true);
    expect(transfer.dropEffect).toBe('none');
  });

  it('leaves a drag carrying no transfer at all alone', () => {
    harness();
    const event = new DragEvent('dragover', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: null });

    fireEvent(document.body, event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('stops guarding once the shell unmounts', () => {
    const { unmount } = harness();
    unmount();
    const { event } = dragEvent('dragover', ['Files']);

    fireEvent(document.body, event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('guards nothing while it is handed no window, which is a closed detached preview', () => {
    function Detached() {
      useFileDropGuard(null);
      return null;
    }
    render(<Detached />);
    const { event } = dragEvent('dragover', ['Files']);

    fireEvent(document.body, event);

    expect(event.defaultPrevented).toBe(false);
  });
});
