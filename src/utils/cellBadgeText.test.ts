import { describe, expect, it } from 'vitest';
import type { CellLattice } from '../types/cellLattice.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { SpriteCell } from '../types/spriteCell.ts';
import { cellBadgeText } from './cellBadgeText.ts';

/** Two tiles centred 300 pixels apart, which a 128 cell takes at 43%. */
const BOXES: readonly SpriteBox[] = [
  { left: 20, top: 20, width: 260, height: 260, pixels: 67_600 },
  { left: 320, top: 20, width: 260, height: 260, pixels: 67_600 },
];

const CELL: SpriteCell = {
  width: 128,
  height: 128,
  anchor: { x: 'CENTRE', y: 'MIDDLE' },
  fit: 'REFUSE',
  statedStep: null,
  lattice: null,
  resamples: true,
};

describe('cellBadgeText', () => {
  it('counts the pieces that will not fit, naming the cell', () => {
    expect(cellBadgeText(CELL, BOXES, 1)).toBe('1 sprite larger than 128 × 128');
    expect(cellBadgeText(CELL, BOXES, 2)).toBe('2 sprites larger than 128 × 128');
  });

  it('names the cell alone where every piece is placed as drawn', () => {
    expect(cellBadgeText(CELL, BOXES, 0)).toBe('128 × 128 cell');
  });

  it('states the one factor a set is scaled by, and that each square is filled', () => {
    expect(cellBadgeText({ ...CELL, fit: 'SCALE_SET' }, BOXES, 0)).toBe('128 × 128 cell at 43%');
    expect(cellBadgeText({ ...CELL, fit: 'FILL_SQUARE' }, BOXES, 0)).toBe(
      '128 × 128 cell, each square filled',
    );
  });

  describe('under Keep place', () => {
    const lattice: CellLattice = {
      kind: 'CELLS',
      cells: [
        {
          index: 0,
          region: { left: 0, top: 0, width: 300, height: 300 },
          square: { left: 20, top: 20, width: 260, height: 260 },
        },
      ],
      cellOf: [0],
      tileSide: 260,
    };
    const inPlace: SpriteCell = { ...CELL, fit: 'IN_PLACE', lattice };

    it('counts the pieces out of place, whether past their square or past the cell', () => {
      expect(cellBadgeText(inPlace, BOXES, 1)).toBe('1 sprite out of place in 128 × 128');
      expect(cellBadgeText(inPlace, BOXES, 2)).toBe('2 sprites out of place in 128 × 128');
    });

    it('states the tile square’s factor, or that it is centred as drawn at a pixel scale', () => {
      expect(cellBadgeText(inPlace, BOXES, 0)).toBe('128 × 128 cell, tile square at 49%');
      expect(cellBadgeText({ ...inPlace, resamples: false }, BOXES, 0)).toBe(
        '128 × 128 cell, each tile square centred as drawn',
      );
    });
  });
});
