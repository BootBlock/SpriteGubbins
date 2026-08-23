import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useUIStore } from '../../stores/useUIStore.ts';
import { MAX_PALETTE_ENTRIES } from '../../utils/pngPalette.ts';
import type { Rgba } from '../../types/quantiser.ts';
import { PaletteDownload } from './PaletteDownload.tsx';

/**
 * The row that writes a settled palette to a file, and the two things about it no unit of the
 * writers can cover: which file each press asks for, and whether two rows on one page can be told
 * apart.
 *
 * The bytes themselves are pinned in `utils/writePalette.test.ts`. What is checked here is the wiring
 * — the anchor the browser is handed, the name it is handed under, and the confirmation.
 */

const GREEN: Rgba = { r: 40, g: 160, b: 60, a: 255 };
const RED: Rgba = { r: 200, g: 40, b: 40, a: 255 };

/** What the download anchor was told to save the file as, in press order. */
let saved: string[] = [];

beforeEach(() => {
  saved = [];
  useUIStore.setState({ toastMessage: null });
  URL.createObjectURL = vi.fn(() => 'blob:palette');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    saved.push(this.download);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function show(entries: readonly Rgba[] = [GREEN, RED], name = 'armour.png', subject = 'the locked palette') {
  render(<PaletteDownload palette={{ name, entries }} subject={subject} />);
}

describe('PaletteDownload', () => {
  it('offers all three files the app can write a palette as', () => {
    show();

    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Download the locked palette as a swatch PNG' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Download the locked palette as a GIMP palette' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Download the locked palette as a hex list' })).toBeVisible();
  });

  /**
   * Two palettes are offered on the Quantise tab at once, and the visible labels are the same three
   * words in both rows. Without the subject in the accessible name there is nothing to choose by.
   */
  it('names its buttons for the palette it was given, not for the file alone', () => {
    show([GREEN], 'armour.png', 'the colours of this sheet');

    expect(
      screen.getByRole('button', { name: 'Download the colours of this sheet as a hex list' }),
    ).toBeVisible();
  });

  it('saves each format under the palette’s own name and its own extension', async () => {
    show();

    await userEvent.click(screen.getByRole('button', { name: /swatch PNG$/ }));
    await waitFor(() => {
      expect(saved).toEqual(['armour-palette.png']);
    });

    await userEvent.click(screen.getByRole('button', { name: /GIMP palette$/ }));
    await userEvent.click(screen.getByRole('button', { name: /hex list$/ }));
    await waitFor(() => {
      expect(saved).toEqual(['armour-palette.png', 'armour-palette.gpl', 'armour-palette.txt']);
    });
  });

  it('confirms the download by saying how many colours it carries', async () => {
    show();

    await userEvent.click(screen.getByRole('button', { name: /hex list$/ }));

    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe('Downloaded armour-palette.txt — 2 entries');
    });
  });

  /**
   * A result with no colour budget reduces nothing, so the list can run to tens of thousands — at
   * which point a block each is a strip of a hundred thousand pixels, built on the reader's own
   * thread and useful to nobody. The two text forms still carry the whole list.
   */
  it('withholds the swatch above the count an image can carry as a palette', () => {
    const wide = Array.from({ length: MAX_PALETTE_ENTRIES + 1 }, (_unused, at) => ({
      r: at % 256,
      g: (at * 7) % 256,
      b: (at * 13) % 256,
      a: 255,
    }));
    show(wide);

    expect(screen.queryByRole('button', { name: /swatch PNG$/ })).toBeNull();
    expect(screen.getByRole('button', { name: /GIMP palette$/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /hex list$/ })).toBeVisible();
  });

  it('offers the swatch at exactly that count', () => {
    show(Array.from({ length: MAX_PALETTE_ENTRIES }, (_unused, at) => ({ r: at, g: 0, b: 0, a: 255 })));

    expect(screen.getByRole('button', { name: /swatch PNG$/ })).toBeVisible();
  });

  it('renders nothing at all for a palette with no colours in it', () => {
    show([]);

    expect(screen.queryByRole('button')).toBeNull();
  });
});
