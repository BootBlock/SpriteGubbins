import { describe, expect, it } from 'vitest';
import type { CellLattice } from '../types/cellLattice.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { SheetRegion, SpriteCell } from '../types/spriteCell.ts';
import { cellLattice } from './cellLattice.ts';
import { inPlacePlacement } from './inPlacePlacement.ts';
import { oversizedSprites, oversizeReason } from './spriteCell.ts';

/**
 * A Keep place cell of this size over a lattice of one cell whose square is `square`, resampling unless
 * the sheet was read at a pixel scale.
 */
function cellOver(size: number, square: SheetRegion, resamples = true): SpriteCell {
  const lattice: CellLattice = {
    kind: 'CELLS',
    cells: [{ index: 0, region: { left: 0, top: 0, width: 64, height: 64 }, square }],
    cellOf: [0],
    tileSide: square.width,
  };
  return {
    width: size,
    height: size,
    anchor: { x: 'CENTRE', y: 'MIDDLE' },
    fit: 'IN_PLACE',
    statedStep: null,
    lattice,
    resamples,
  };
}

describe('inPlacePlacement', () => {
  it('keeps a piece flush with its square’s far edge flush with the file’s at a fractional factor', () => {
    // At 1.5 an offset of 1 and a width of 31 both end in a half, and rounding each on its own put the
    // piece's right edge at 49 in a 48-pixel file.
    const box: SpriteBox = { left: 1, top: 1, width: 31, height: 31, pixels: 961 };
    const cell = cellOver(48, { left: 0, top: 0, width: 32, height: 32 });

    expect(inPlacePlacement(box, cell)).toMatchObject({ x: 2, y: 2, width: 46, height: 46 });
    expect(oversizedSprites([box], cell)).toEqual([]);
  });

  it('clips a piece a sixteenth past its square, and refuses one further', () => {
    // A 64-pixel file over a 64-pixel square: a sixteenth of it is four file pixels.
    const cell = cellOver(64, { left: 0, top: 0, width: 64, height: 64 });
    const slight: SpriteBox = { left: 4, top: -4, width: 20, height: 20, pixels: 400 };
    const further: SpriteBox = { left: 4, top: -5, width: 20, height: 20, pixels: 400 };

    expect(inPlacePlacement(slight, cell)).toMatchObject({ y: -4 });
    expect(oversizedSprites([slight, further], cell)).toEqual([1]);
  });

  it('keeps a veil drawn a pixel taller than it is wide inside its file', () => {
    // The veil's own box is its square, and a square measured from its width alone left the extra row
    // past the bottom of the file.
    const veil: SpriteBox = { left: 103, top: 103, width: 50, height: 51, pixels: 2550 };
    const lattice = cellLattice([veil], {
      width: 256,
      columns: 1,
      placement: 'WITHIN_TILE',
      share: 0.2,
      tileCells: { measuring: [0], spanning: [0] },
    });
    if (lattice.kind !== 'CELLS') throw new Error(`expected cells, got: ${lattice.reason}`);
    const cell = { ...cellOver(64, { left: 0, top: 0, width: 1, height: 1 }), lattice };

    expect(lattice.cells[0]?.square).toEqual({ left: 103, top: 103, width: 51, height: 51 });
    expect(oversizedSprites([veil], cell)).toEqual([]);
  });

  it('fills an oblong file’s shorter side with the square, centred, and refuses nothing inside it', () => {
    // A 64-pixel square into a 128 × 64 file: drawn at 1, 32 pixels in. Scaled by the width instead, the
    // square was 128 tall in a 64-pixel file and a piece in its lower half was refused.
    const cell = { ...cellOver(64, { left: 0, top: 0, width: 64, height: 64 }), width: 128 };
    const lower: SpriteBox = { left: 40, top: 40, width: 20, height: 20, pixels: 400 };

    expect(inPlacePlacement(lower, cell)).toMatchObject({ x: 72, y: 40, width: 20, height: 20 });
    expect(oversizedSprites([lower], cell)).toEqual([]);
  });

  describe('on a sheet with a pixel scale', () => {
    // `icons_fullbleed.png` at its grid of 7: a 29-pixel tile square, cut into 128 × 128 files. A
    // sixteenth of the square is 1.8 file pixels.
    const square = { left: 10, top: 10, width: 29, height: 29 };
    const cell = cellOver(128, square, false);

    it('centres the square in the file at its drawn size', () => {
      const veil: SpriteBox = { left: 10, top: 10, width: 29, height: 29, pixels: 841 };

      expect(inPlacePlacement(veil, cell)).toMatchObject({ x: 49, y: 49, width: 29, height: 29 });
      expect(oversizedSprites([veil], cell)).toEqual([]);
    });

    it('refuses a piece past its square alike on all four sides, however large the file', () => {
      // Each reaches two pixels past one side of its square and stays well inside the file. Measured
      // against the file alone, the right and bottom ones passed and the left and top ones were refused.
      const past: readonly SpriteBox[] = [
        { left: 8, top: 15, width: 10, height: 10, pixels: 100 },
        { left: 15, top: 8, width: 10, height: 10, pixels: 100 },
        { left: 31, top: 15, width: 10, height: 10, pixels: 100 },
        { left: 15, top: 31, width: 10, height: 10, pixels: 100 },
      ];

      expect(oversizedSprites(past, cell)).toEqual([0, 1, 2, 3]);
    });

    it('clips a piece a pixel past its square on any side', () => {
      const slight: readonly SpriteBox[] = [
        { left: 9, top: 15, width: 10, height: 10, pixels: 100 },
        { left: 30, top: 30, width: 10, height: 10, pixels: 100 },
      ];

      expect(oversizedSprites(slight, cell)).toEqual([]);
    });

    it('refuses a piece inside its square that a smaller file would clip, and says to raise the cell', () => {
      // A 29-pixel square overhangs a 24-pixel file by three pixels on the left and two on the right.
      const small = cellOver(24, square, false);
      const corner: SpriteBox = { left: 29, top: 20, width: 10, height: 5, pixels: 50 };
      const middle: SpriteBox = { left: 20, top: 20, width: 5, height: 5, pixels: 25 };

      expect(inPlacePlacement(corner, small)).toMatchObject({ x: 16, width: 10 });
      expect(oversizedSprites([corner, middle], small)).toEqual([0]);
      expect(oversizeReason([corner, middle], ['badge', 'pip'], small, [0])).toBe(
        'badge is drawn in a 29 × 29 tile square, larger than the 24 × 24 cell — raise the cell to at least 29 × 29',
      );
    });

    it('asks for a new sheet where a piece reaches past its square', () => {
      const past: SpriteBox = { left: 15, top: 31, width: 10, height: 10, pixels: 100 };

      expect(oversizeReason([past], ['badge'], cell, [0])).toBe(
        'badge reaches past its tile square where it was drawn — re-generate the sheet with each piece inside its tile square',
      );
    });
  });
});
