import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIBRARY_PACK_ITEMS } from '../../constants/packImport.ts';
import { JsonPackTransfer } from './JsonPackTransfer.tsx';
import type { PackImportConfirmProps } from './PackImportConfirm.tsx';

/**
 * Moving a whole collection in and out as a JSON pack.
 *
 * The question an import asks is `PackImportConfirm`'s, and what a pack holds is the store's. What is
 * this control's is the round trip around them: the export is the collection as it stands at the
 * press; the import button opens a chooser, hands over what was chosen and clears the chooser so the
 * same file can be retried; the question takes the place of both buttons; and once it is answered the
 * keyboard comes back to Import — waited for, because a confirmed replace brings the button back
 * disabled for the length of the write.
 */
const FILENAME = 'sprite-gubbins-library.json';

let saved: Blob | null = null;
let downloadName: string | null = null;

beforeEach(() => {
  saved = null;
  downloadName = null;
  // Both are how a download leaves the page: the object URL is where the file is captured, and the
  // revoke `useFileSave` schedules must find something to call.
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    if (blob instanceof Blob) saved = blob;
    return 'blob:pack';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloadName = this.download;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

interface State {
  readonly pendingImport?: PackImportConfirmProps | null;
  readonly isTransferring?: boolean;
  readonly canExport?: boolean;
  readonly exportPack?: () => string;
  readonly importPack?: (file: File) => Promise<void>;
}

function transfer(state: State = {}) {
  return (
    <JsonPackTransfer
      filename={FILENAME}
      exportPack={state.exportPack ?? (() => '{}')}
      importPack={state.importPack ?? (() => Promise.resolve())}
      pendingImport={state.pendingImport ?? null}
      isTransferring={state.isTransferring ?? false}
      canExport={state.canExport ?? true}
      exportGuidance="Downloads the library as a file."
      importGuidance="Replaces the library from a file."
    />
  );
}

function question(
  answers: Partial<Pick<PackImportConfirmProps, 'onConfirm' | 'onCancel'>> = {},
): PackImportConfirmProps {
  return {
    incoming: 4,
    replacing: 11,
    noun: LIBRARY_PACK_ITEMS,
    confirmGuidance: 'Replaces them for good.',
    cancelGuidance: 'Leaves them alone.',
    onConfirm: answers.onConfirm ?? vi.fn(),
    onCancel: answers.onCancel ?? vi.fn(),
  };
}

function chooser(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('the transfer should keep a file chooser.');
  return input;
}

const exportButton = () => screen.getByRole('button', { name: /Export JSON/ });
const importButton = () => screen.getByRole('button', { name: /Import JSON/ });

describe('JsonPackTransfer', () => {
  it('downloads the collection as it stands at the moment of the press', async () => {
    const exportPack = vi.fn(() => '{"projects":[]}');
    render(transfer({ exportPack }));
    expect(exportPack).not.toHaveBeenCalled();

    await userEvent.click(exportButton());

    expect(downloadName).toBe(FILENAME);
    expect(saved?.type).toBe('application/json');
    await expect(saved?.text()).resolves.toBe('{"projects":[]}');
  });

  it('offers no export of a collection with nothing worth exporting', () => {
    render(transfer({ canExport: false }));

    expect(exportButton()).toBeDisabled();
    expect(importButton()).toBeEnabled();
  });

  it('offers neither control while a transfer is in flight', () => {
    render(transfer({ isTransferring: true }));

    expect(exportButton()).toBeDisabled();
    expect(importButton()).toBeDisabled();
  });

  it('opens the file chooser from a real button, and offers JSON alone', async () => {
    const opened = vi.spyOn(HTMLInputElement.prototype, 'click');
    const { container } = render(transfer());

    await userEvent.click(importButton());

    expect(opened).toHaveBeenCalledOnce();
    expect(opened.mock.contexts[0]).toBe(chooser(container));
    expect(chooser(container)).toHaveAttribute('accept', 'application/json,.json');
  });

  it('hands the chosen file to the import, and clears the chooser once the import settles', async () => {
    let settle: () => void = () => undefined;
    const importPack = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          settle = resolve;
        }),
    );
    const { container } = render(transfer({ importPack }));
    const input = chooser(container);
    const pack = new File(['{}'], 'library.json', { type: 'application/json' });

    await userEvent.upload(input, pack);

    expect(importPack).toHaveBeenCalledWith(pack);
    // Not yet: a chooser cleared before the import has read the file would be clearing what it reads.
    expect(input.files).toHaveLength(1);

    settle();
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
    expect(input.files).toHaveLength(0);
  });

  it('asks in place of both buttons while an import waits on an answer', () => {
    render(transfer({ pendingImport: question() }));

    // Both, because an export started over a half-answered import is the race the transferring flag
    // exists to stop.
    expect(screen.queryByRole('button', { name: /Export JSON/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Import JSON/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cancel the import/ })).toHaveFocus();
  });

  it('gives the keyboard back to Import once the question is cancelled', async () => {
    const onCancel = vi.fn();
    const { rerender } = render(transfer({ pendingImport: question({ onCancel }) }));

    await userEvent.keyboard('{Enter}');
    expect(onCancel).toHaveBeenCalledOnce();
    rerender(transfer({ pendingImport: null }));

    // The button that had focus was unmounted by the question, so without this the answer drops a
    // keyboard reader onto the document body.
    expect(importButton()).toHaveFocus();
  });

  it('waits for Import to be usable again before giving it the keyboard after a replace', async () => {
    const onConfirm = vi.fn();
    const { rerender } = render(transfer({ pendingImport: question({ onConfirm }) }));

    await userEvent.click(screen.getByRole('button', { name: /^Replace your/ }));
    expect(onConfirm).toHaveBeenCalledOnce();

    // The write is in flight, so the button is back but disabled, and cannot take the focus.
    rerender(transfer({ pendingImport: null, isTransferring: true }));
    expect(importButton()).toBeDisabled();
    expect(importButton()).not.toHaveFocus();

    // The write lands: the focus that was owed arrives now, rather than having been spent on nothing.
    rerender(transfer({ pendingImport: null, isTransferring: false }));
    expect(importButton()).toHaveFocus();
  });
});
