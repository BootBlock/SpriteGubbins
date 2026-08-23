import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PALETTE_EXPORT_GUIDANCE } from '../../constants/paletteExport.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { Rgba } from '../../types/quantiser.ts';
import { PaletteExportControls } from './PaletteExportControls.tsx';

/**
 * Which palettes the panel offers, and which it does not.
 *
 * The two rows are not the same list — a lock goes on holding colours the sheet on screen may not
 * have used — so the check that matters here is that each appears on its own condition and that
 * neither stands in for the other. The files themselves are pinned in `utils/writePalette.test.ts`
 * and the row in `common/PaletteDownload.test.tsx`.
 */

const GREEN: Rgba = { r: 40, g: 160, b: 60, a: 255 };
const RED: Rgba = { r: 200, g: 40, b: 40, a: 255 };

function show(resultPalette: readonly Rgba[] | null) {
  render(<PaletteExportControls resultPalette={resultPalette} sheetName="armour.png" />);
}

describe('PaletteExportControls', () => {
  beforeEach(() => {
    useQuantiseStore.getState().clear();
  });

  it('offers nothing, and says what would appear, before there is a result or a lock', () => {
    show(null);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(PALETTE_EXPORT_GUIDANCE.open)).toBeVisible();
  });

  it('offers the colours of the sheet once the transform has answered', () => {
    show([GREEN, RED]);

    expect(screen.getByText('2 entries in this sheet')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Download the colours of this sheet as a swatch PNG' }),
    ).toBeVisible();
    expect(screen.getByText(PALETTE_EXPORT_GUIDANCE.available)).toBeVisible();
  });

  /** A held lock is a statement about the series, so it survives the sheet on screen having none. */
  it('offers a held lock whether or not there is a result beside it', () => {
    useQuantiseStore.getState().lockPalette({
      entries: [GREEN],
      setting: 'RESTRAINED_64_COLOR',
      sheetName: 'cyborg_monk.png',
    });
    show(null);

    expect(screen.getByText('1 entry held from cyborg_monk.png')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Download the locked palette as a GIMP palette' }),
    ).toBeVisible();
  });

  it('keeps the two palettes apart when both are on offer', () => {
    useQuantiseStore.getState().lockPalette({
      entries: [GREEN],
      setting: 'RESTRAINED_64_COLOR',
      sheetName: 'armour.png',
    });
    show([GREEN, RED]);

    expect(screen.getAllByRole('button')).toHaveLength(6);
    expect(screen.getByText('2 entries in this sheet')).toBeVisible();
    expect(screen.getByText('1 entry held from armour.png')).toBeVisible();
  });
});
