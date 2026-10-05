import { describe, expect, it } from 'vitest';
import { DEFAULT_SPRITE_CELL_CHOICE } from '../constants/spriteCell.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { SpriteCell } from '../types/spriteCell.ts';
import { cellPlacements, oversizedSprites, resizingFitAllowed, resolveSpriteCell } from './spriteCell.ts';

/**
 * The two fits that resize: what each draws a sprite at, where it lands, and when the sheet may not
 * have one. The `REFUSE` placements are `spriteCell.test.ts`'s.
 */

/** Two painted tiles a little off square, and a mark half their size, centred 300 pixels apart. */
const BOXES: readonly SpriteBox[] = [
  { left: 20, top: 20, width: 260, height: 256, pixels: 66_560 },
  { left: 321, top: 22, width: 258, height: 260, pixels: 67_080 },
  { left: 685, top: 90, width: 130, height: 120, pixels: 9_000 },
];

const ICON: SpriteCell = {
  width: 128,
  height: 128,
  anchor: { x: 'CENTRE', y: 'MIDDLE' },
  fit: 'FILL_SQUARE',
  statedStep: null,
  lattice: null,
  resamples: true,
};

describe('resolveSpriteCell, with a fit', () => {
  const choice = {
    ...DEFAULT_SPRITE_CELL_CHOICE,
    source: 'FIXED',
    fixed: { width: 128, height: 128 },
  } as const;

  it('keeps a resizing fit on a sheet read at a pixel grid of 1', () => {
    expect(resolveSpriteCell({ ...choice, fit: 'SCALE_SET' }, null, 1, null, null)?.fit).toBe('SCALE_SET');
  });

  it('places a sheet with a pixel scale as drawn, whatever fit is stored', () => {
    // Resizing pixel art by area blends the pixels the lattice reading exists to keep apart.
    expect(resolveSpriteCell({ ...choice, fit: 'FILL_SQUARE' }, null, 4, null, null)?.fit).toBe('REFUSE');
  });

  it('opens on the fit that resizes nothing, so the tab behaves as it always did', () => {
    expect(DEFAULT_SPRITE_CELL_CHOICE.fit).toBe('REFUSE');
  });

  it('allows resizing only at a grid of 1, or before any grid is settled', () => {
    expect([null, 1, 2, 8].map(resizingFitAllowed)).toStrictEqual([true, true, false, false]);
  });
});

describe('oversizedSprites, under a fit that resizes', () => {
  it('refuses nothing, since every sprite is brought inside the cell', () => {
    expect(oversizedSprites(BOXES, { ...ICON, fit: 'REFUSE' })).toStrictEqual([0, 1, 2]);
    expect(oversizedSprites(BOXES, ICON)).toStrictEqual([]);
    expect(oversizedSprites(BOXES, { ...ICON, fit: 'SCALE_SET' })).toStrictEqual([]);
  });
});

describe('cellPlacements, filling a square', () => {
  it('cuts each sprite’s centred square and draws it at the whole cell', () => {
    const [first, second] = cellPlacements(BOXES, ICON);

    // 260 × 256: a 256 square, the two spare columns split one each side.
    expect(first).toStrictEqual({
      source: { left: 22, top: 20, width: 256, height: 256 },
      x: 0,
      y: 0,
      width: 128,
      height: 128,
    });
    // 258 × 260: a 258 square, the two spare rows split one each side.
    expect(second?.source).toStrictEqual({ left: 321, top: 23, width: 258, height: 258 });
  });

  it('fills the shorter side of a cell that is not square, and places it at the anchor', () => {
    const tall = cellPlacements(BOXES, { ...ICON, height: 160, anchor: { x: 'CENTRE', y: 'BOTTOM' } })[0];

    expect(tall).toMatchObject({ x: 0, y: 32, width: 128, height: 128 });
  });
});

describe('cellPlacements, scaling evenly', () => {
  const placed = cellPlacements(BOXES, { ...ICON, fit: 'SCALE_SET' });

  it('draws every sprite at one factor, so the mark stays about half a tile', () => {
    const [first, , mark] = placed;
    if (first === undefined || mark === undefined) throw new Error('the placements came back short');

    // The step across is 300 on this row, so the factor is 128/300 and nothing is cropped.
    expect(first.source).toMatchObject({ left: 20, top: 20, width: 260, height: 256 });
    expect([first.width, first.height]).toStrictEqual([
      Math.round(260 * (128 / 300)),
      Math.round(256 * (128 / 300)),
    ]);
    expect([mark.width, mark.height]).toStrictEqual([
      Math.round(130 * (128 / 300)),
      Math.round(120 * (128 / 300)),
    ]);
  });

  it('centres each drawn sprite in its cell at the anchor the reader named', () => {
    for (const placement of placed) {
      expect(placement.x).toBe(Math.floor((128 - placement.width) / 2));
      expect(placement.y).toBe(Math.floor((128 - placement.height) / 2));
    }
  });
});
