import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { imageFrom } from '../../test/images.ts';
import { MAX_PALETTE_ENTRIES } from '../../utils/pngPalette.ts';
import { CustomPaletteField } from './CustomPaletteField.tsx';

/**
 * Where a palette of the reader's own gets in.
 *
 * Three routes, and what is pinned here is what each of them does to the configuration — because
 * that is the part a reader cannot see going wrong. A file that states nothing usable must not take
 * the palette already loaded with it, and a picture holding more colours than a palette can carry
 * must refuse rather than pin 256 of a sheet's 4,000 and call them the reader's.
 *
 * The decode is stubbed for the reason `IdentityPaletteCapture`'s suite stubs it: `createImageBitmap`
 * and a 2D canvas are the two things happy-dom does not provide, and they stand between choosing a
 * file and any of this running.
 */

/** 400 distinct colours, which is more than a palette can carry. */
const SHEET = imageFrom(20, 20, (x, y) => ({ r: x * 12, g: y * 12, b: 0, a: 255 }));

beforeEach(() => {
  useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, palette: 'CUSTOM' } });

  vi.stubGlobal('createImageBitmap', () =>
    Promise.resolve({ width: SHEET.width, height: SHEET.height, close: () => undefined }),
  );
  const context: Partial<CanvasRenderingContext2D> = {
    drawImage: () => undefined,
    getImageData: () => SHEET,
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as CanvasRenderingContext2D);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Hands the chooser a file, as the picker reads one. */
async function choose(file: File): Promise<void> {
  const input = screen.getByLabelText('Palette file');
  // A `FileList`, not an array: the picker reads `files.item(0)`, which an array has no answer for.
  const files = Object.assign([file], { item: (index: number) => (index === 0 ? file : null) });
  await act(async () => {
    fireEvent.change(input, { target: { files } });
  });
}

function pinned() {
  return useOutputStore.getState().output.customPalette;
}

describe('CustomPaletteField', () => {
  it('pins the colours a .gpl states, under the name the file records', async () => {
    render(<CustomPaletteField />);
    await choose(
      new File(['GIMP Palette\nName: Dusk Harbour\n#\n16 32 48 #102030\n64 80 96 #405060\n'], 'dusk.gpl', {
        type: 'text/plain',
      }),
    );

    await waitFor(() => {
      expect(pinned()).toEqual({ name: 'Dusk Harbour', entries: ['#102030', '#405060'] });
    });
    expect(screen.getByRole('textbox', { name: 'Palette name' })).toHaveValue('Dusk Harbour');
    expect(screen.getByText(/2 colours pinned/)).toBeVisible();
  });

  it('pins a pasted list as it is typed, and names the line it could not read', async () => {
    const user = userEvent.setup();
    render(<CustomPaletteField />);

    await user.click(screen.getByRole('textbox', { name: 'Or paste the colours' }));
    await user.paste('#102030\nrust orange\n#405060');

    expect(pinned()?.entries).toEqual(['#102030', '#405060']);
    expect(screen.getByText('Line 2 states no colour: “rust orange”')).toBeVisible();
  });

  it('refuses a picture of more colours than a palette holds, and pins nothing', async () => {
    render(<CustomPaletteField />);
    await choose(new File(['sheet'], 'accepted-sheet.png', { type: 'image/png' }));

    await waitFor(() => {
      expect(screen.getByText(/accepted-sheet holds 400 colours/)).toBeVisible();
    });
    expect(pinned()).toBeNull();
  });

  it('reduces that picture on the press, and only on the press', async () => {
    const user = userEvent.setup();
    render(<CustomPaletteField />);
    await choose(new File(['sheet'], 'accepted-sheet.png', { type: 'image/png' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: `Reduce to ${String(MAX_PALETTE_ENTRIES)}` })).toBeVisible();
    });

    await user.click(screen.getByRole('button', { name: `Reduce to ${String(MAX_PALETTE_ENTRIES)}` }));

    expect(pinned()?.entries).toHaveLength(MAX_PALETTE_ENTRIES);
    expect(pinned()?.name).toBe('accepted-sheet');
    // The offer goes with the answer, so a second press cannot reduce what is already reduced.
    expect(screen.queryByRole('button', { name: /^Reduce/ })).toBeNull();
  });

  it('keeps the palette already pinned when a file states nothing usable', async () => {
    // The mis-click case. Dropping a good palette to make room for a broken one loses work that
    // cannot be recovered from anything on screen.
    render(<CustomPaletteField />);
    await choose(new File(['#102030\n'], 'good.txt', { type: 'text/plain' }));
    await waitFor(() => {
      expect(pinned()?.entries).toEqual(['#102030']);
    });

    await choose(new File(['nothing here at all\n'], 'notes.txt', { type: 'text/plain' }));

    await waitFor(() => {
      expect(screen.getByText(/Line 1 states no colour/)).toBeVisible();
    });
    expect(pinned()?.entries).toEqual(['#102030']);
  });

  it('renames without touching the colours', async () => {
    const user = userEvent.setup();
    render(<CustomPaletteField />);
    await choose(new File(['#102030\n'], 'palette.txt', { type: 'text/plain' }));
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Palette name' })).toBeVisible();
    });

    await user.clear(screen.getByRole('textbox', { name: 'Palette name' }));
    await user.type(screen.getByRole('textbox', { name: 'Palette name' }), 'Dusk');

    expect(pinned()).toEqual({ name: 'Dusk', entries: ['#102030'] });
  });

  it('keeps the refusal live region in the document before there is anything to announce', () => {
    // A region inserted with its first message is not announced, which is the whole of what it is
    // for — and every answer this panel gives arrives after a file has been read, when nothing else
    // on screen has moved.
    const { container } = render(<CustomPaletteField />);

    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('says so when a file states nothing at all, rather than changing nothing in silence', async () => {
    // A blank text file and a `.gpl` with nothing under its header both read as no colours and no
    // faulty lines. Reported, they are a file the reader can see was read; unreported, the panel
    // looks exactly as it did before they chose it.
    render(<CustomPaletteField />);
    await choose(
      new File(['GIMP Palette\nName: Empty\nColumns: 0\n#\n'], 'empty.gpl', { type: 'text/plain' }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Nothing in empty.gpl read as a colour/)).toBeVisible();
    });
    expect(pinned()).toBeNull();
  });

  it('keeps the name the reader typed when the pasted list is edited again', async () => {
    // The box re-reads on every keystroke and a pasted list names nothing, so taking its empty name
    // would wipe out the typed one the moment a colour was added to the list.
    const user = userEvent.setup();
    render(<CustomPaletteField />);
    await user.click(screen.getByRole('textbox', { name: 'Or paste the colours' }));
    await user.paste('#102030');
    await user.type(screen.getByRole('textbox', { name: 'Palette name' }), 'Dusk');

    await user.click(screen.getByRole('textbox', { name: 'Or paste the colours' }));
    await user.paste('\n#405060');

    expect(pinned()).toEqual({ name: 'Dusk', entries: ['#102030', '#405060'] });
  });

  it('drops the palette on Remove, and empties the box that pinned it', async () => {
    const user = userEvent.setup();
    render(<CustomPaletteField />);
    await user.click(screen.getByRole('textbox', { name: 'Or paste the colours' }));
    await user.paste('#102030');

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(pinned()).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Or paste the colours' })).toHaveValue('');
  });
});
