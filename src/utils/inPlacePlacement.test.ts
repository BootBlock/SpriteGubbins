import { describe, expect, it } from 'vitest';
import type { CellLattice } from '../types/cellLattice.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { SheetRegion, SpriteCell } from '../types/spriteCell.ts';
import { cellLattice } from './cellLattice.ts';
import { inPlacePlacement } from './inPlacePlacement.ts';
import { oversizedSprites } from './spriteCell.ts';

/** A Keep place cell of this size over a lattice of one cell whose square is `square`. */
function cellOver(size: number, square: SheetRegion): SpriteCell {
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
    resamples: true,
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
});
