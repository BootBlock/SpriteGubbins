import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useFileDropGuard } from './useFileDropGuard.ts';
import { useFileDropTarget } from './useFileDropTarget.ts';

/**
 * The shell and one drop target, which is the arrangement the guard has to be right inside.
 *
 * The target is real rather than mimed, because the property that keeps the two from fighting is a
 * propagation order — React delegates `onDragOver` to the root container, and the guard listens on
 * the window above it — and a stand-in that called `preventDefault()` itself would prove nothing
 * about where React actually attaches.
 */
function Harness() {
  useFileDropGuard();
  const { isDraggedOver, dropHandlers } = useFileDropTarget(() => undefined);
  return <div aria-label="zone" role="group" data-over={isDraggedOver} {...dropHandlers} />;
}

/**
 * A drag event carrying a transfer, built by hand.
 *
 * happy-dom implements `DragEvent` and `DataTransfer`, and neither is faithful in the two respects
 * this hook reads: its `DragEvent` constructor drops `dataTransfer` from the init dictionary, and
 * its `DataTransfer.types` reports a file's MIME type where a browser reports the literal `Files`.
 * So the transfer is modelled to the platform's contract rather than to happy-dom's approximation —
 * the same choice, for the same reason, as the popover stubs in `src/test/setup.ts`.
 */
function dragEvent(type: 'dragover' | 'drop', types: readonly string[]) {
  const event = new DragEvent(type, { bubbles: true, cancelable: true });
  const transfer = { types, dropEffect: 'copy', files: { item: () => null } };
  Object.defineProperty(event, 'dataTransfer', { value: transfer });
  return { event, transfer };
}

describe('useFileDropGuard', () => {
  it('refuses a file dragged over anywhere the app draws no target', () => {
    render(<Harness />);
    const { event, transfer } = dragEvent('dragover', ['Files']);

    fireEvent(document.body, event);

    expect(event.defaultPrevented).toBe(true);
    expect(transfer.dropEffect).toBe('none');
  });

  it('cancels a stray drop as well, so a delivered one still navigates nowhere', () => {
    render(<Harness />);
    const { event } = dragEvent('drop', ['Files']);

    fireEvent(document.body, event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('stands aside for a drop target, which has already cancelled the event itself', () => {
    render(<Harness />);
    const zone = screen.getByRole('group', { name: 'zone' });
    const { event, transfer } = dragEvent('dragover', ['Files']);

    fireEvent(zone, event);

    // Cancelled by the zone rather than by the guard, which is the difference `dropEffect` shows:
    // the zone accepts the file, so the cursor must not say the page refuses it.
    expect(zone).toHaveAttribute('data-over', 'true');
    expect(transfer.dropEffect).toBe('copy');
  });

  it('leaves a drag carrying no file alone, so text can still be dropped into a field', () => {
    render(<Harness />);
    const { event } = dragEvent('dragover', ['text/plain']);

    fireEvent(document.body, event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('stops guarding once the shell unmounts', () => {
    const { unmount } = render(<Harness />);
    unmount();
    const { event } = dragEvent('dragover', ['Files']);

    fireEvent(document.body, event);

    expect(event.defaultPrevented).toBe(false);
  });
});
