import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useFileDropGuard } from './useFileDropGuard.ts';
import { useImageDrop } from './useImageDrop.ts';

/**
 * The shell's guard and the tab's page-wide accept, which is the arrangement this hook has to be
 * right inside.
 *
 * Both are real rather than mimed, and the guard is registered *first* on purpose: that is the order
 * every navigation to the Quantise tab produces, and it is the order in which the guard gets to
 * refuse the drag before the accept is heard from. What has to come out of that is a copy cursor and
 * a delivered file, and a stand-in for either half would prove nothing about the composition that
 * produces them.
 */
function Harness({ acceptFile }: { readonly acceptFile: (file: File | null | undefined) => void }) {
  useFileDropGuard(window);
  const isFileOver = useImageDrop(acceptFile);
  return <div data-testid="tab" data-over={isFileOver} />;
}

/** The three members of `DataTransfer` the guard and this hook between them read. */
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
 * happy-dom's approximation — the same choice, for the same reason, as `useFileDropGuard.test.tsx`.
 */
function dragEvent(
  type: 'dragenter' | 'dragover' | 'dragleave' | 'drop',
  types: readonly string[],
  file: File | null = null,
) {
  const event = new DragEvent(type, { bubbles: true, cancelable: true });
  const transfer: TransferStub = { types, dropEffect: 'copy', files: { item: () => file } };
  Object.defineProperty(event, 'dataTransfer', { value: transfer });
  return { event, transfer };
}

/** Render the harness and hand back the spy a dropped file is reported to. */
function harness() {
  const acceptFile = vi.fn<(file: File | null | undefined) => void>();
  const rendered = render(<Harness acceptFile={acceptFile} />);
  return { acceptFile, tab: screen.getByTestId('tab'), ...rendered };
}

/** Dispatch inside `act`, so the state the hook sets has been flushed before anything is asserted. */
function dispatch(run: () => void) {
  act(() => {
    run();
  });
}

/** Let the deferred clear run — the hook releases on a frame, not on the `dragleave` itself. */
async function nextFrame() {
  await act(async () => {
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        resolve(null);
      });
    });
  });
}

const SHEET = new File([new Uint8Array([1])], 'sheet.png', { type: 'image/png' });

describe('useImageDrop', () => {
  it('accepts a file dropped anywhere on the page, not only on a panel', async () => {
    const { acceptFile } = harness();

    dispatch(() => {
      fireEvent(document.body, dragEvent('dragover', ['Files'], SHEET).event);
      fireEvent(document.body, dragEvent('drop', ['Files'], SHEET).event);
    });

    expect(acceptFile).toHaveBeenCalledWith(SHEET);
  });

  it('cancels the drag, so the browser never navigates to the file', async () => {
    harness();
    const over = dragEvent('dragover', ['Files']);
    const drop = dragEvent('drop', ['Files']);

    dispatch(() => {
      fireEvent(document.body, over.event);
      fireEvent(document.body, drop.event);
    });

    expect(over.event.defaultPrevented).toBe(true);
    expect(drop.event.defaultPrevented).toBe(true);
  });

  it('draws a copy cursor where the guard alone would have drawn a refusal', async () => {
    harness();
    const { event, transfer } = dragEvent('dragover', ['Files']);

    dispatch(() => {
      fireEvent(document.body, event);
    });

    // The guard is registered first in this harness, as it is on every navigation to the tab, and it
    // refuses a file drag the page has not claimed. This hook's capture-phase listener runs ahead of
    // it, so the guard sees the cancellation and stands aside rather than writing `'none'` over the
    // copy cursor.
    expect(transfer.dropEffect).toBe('copy');
  });

  it('reports a file over the window while one is in the air', async () => {
    const { tab } = harness();

    dispatch(() => {
      fireEvent(document.body, dragEvent('dragenter', ['Files']).event);
    });

    expect(tab).toHaveAttribute('data-over', 'true');
  });

  it('stops reporting one once the drag leaves the window', async () => {
    const { tab } = harness();

    dispatch(() => {
      fireEvent(document.body, dragEvent('dragenter', ['Files']).event);
    });
    dispatch(() => {
      fireEvent(document.body, dragEvent('dragleave', ['Files']).event);
    });
    await nextFrame();

    // A drag that has genuinely left re-claims nothing, so the deferred clear runs. *When* it runs
    // is not asserted: `act` drives the environment's own task queue, which is what a frame is here.
    expect(tab).toHaveAttribute('data-over', 'false');
  });

  it('holds on across a drag crossing from one element to the next', async () => {
    const { tab } = harness();

    dispatch(() => {
      fireEvent(document.body, dragEvent('dragenter', ['Files']).event);
      fireEvent(document.body, dragEvent('dragleave', ['Files']).event);
      fireEvent(tab, dragEvent('dragenter', ['Files']).event);
    });
    await nextFrame();

    // The crossing is one `dragleave` and one `dragenter`, in whichever order the engine fires them.
    // Deferring the clear by a frame is what makes both orderings read as *still over the window*.
    expect(tab).toHaveAttribute('data-over', 'true');
  });

  it('stops reporting one as soon as the file lands', async () => {
    const { tab } = harness();

    dispatch(() => {
      fireEvent(document.body, dragEvent('dragenter', ['Files']).event);
    });
    dispatch(() => {
      fireEvent(document.body, dragEvent('drop', ['Files'], SHEET).event);
    });

    expect(tab).toHaveAttribute('data-over', 'false');
  });

  it('leaves a drag carrying no file alone, so text can still be dropped into a field', async () => {
    const { acceptFile, tab } = harness();
    const { event } = dragEvent('dragover', ['text/plain']);

    dispatch(() => {
      fireEvent(document.body, event);
      fireEvent(document.body, dragEvent('drop', ['text/plain'], SHEET).event);
    });

    expect(event.defaultPrevented).toBe(false);
    expect(tab).toHaveAttribute('data-over', 'false');
    expect(acceptFile).not.toHaveBeenCalled();
  });

  it('leaves a drag carrying no transfer at all alone', async () => {
    harness();
    const event = new DragEvent('dragover', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: null });

    dispatch(() => {
      fireEvent(document.body, event);
    });

    expect(event.defaultPrevented).toBe(false);
  });

  it('hands the page back to the guard once the tab unmounts', async () => {
    const acceptFile = vi.fn<(file: File | null | undefined) => void>();
    function Shell({ onQuantise }: { readonly onQuantise: boolean }) {
      useFileDropGuard(window);
      return onQuantise ? <Tab /> : null;
    }
    function Tab() {
      useImageDrop(acceptFile);
      return null;
    }
    const { rerender } = render(<Shell onQuantise />);

    rerender(<Shell onQuantise={false} />);
    const { event, transfer } = dragEvent('dragover', ['Files']);
    dispatch(() => {
      fireEvent(document.body, event);
      fireEvent(document.body, dragEvent('drop', ['Files'], SHEET).event);
    });

    // Navigating away from the Quantise tab puts the page back to refusing a stray file, which is
    // what stops a drop on the studio taking the session with it.
    expect(acceptFile).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
    expect(transfer.dropEffect).toBe('none');
  });
});
