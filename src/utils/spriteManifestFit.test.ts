import { describe, expect, it } from 'vitest';
import type { CellLattice } from '../types/cellLattice.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { SpriteCell } from '../types/spriteCell.ts';
import { buildManifest, MANIFEST_VERSION } from './spriteManifest.ts';

/**
 * What a manifest says about a cell whose fit resizes or keeps a piece in place, which is what a
 * consumer compositing from the sheet needs to do exactly what the pack did. The placements themselves
 * are `cellPlacements`'s.
 */

/** Two painted tiles 300 pixels apart, one a pixel taller than it is wide. */
const BOXES: readonly SpriteBox[] = [
  { left: 20, top: 20, width: 260, height: 260, pixels: 67_600 },
  { left: 320, top: 20, width: 260, height: 261, pixels: 67_860 },
];

const input = {
  image: 'icons-quantised.png',
  spriteDirectory: 'sprites',
  width: 600,
  height: 300,
  scale: 1,
  boxes: BOXES,
  duplicates: [],
  names: ['heal-minor', 'heal-major'],
  naming: 'READING_ORDER',
  sheet: null,
} as const;

const FILL: SpriteCell = {
  width: 128,
  height: 128,
  anchor: { x: 'CENTRE', y: 'MIDDLE' },
  fit: 'FILL_SQUARE',
  statedStep: null,
  lattice: null,
  resamples: true,
};

describe('buildManifest, under a fit that resizes or keeps place', () => {
  it('states the fit beside the cell, and the shape’s new version', () => {
    const manifest = buildManifest({ ...input, cell: FILL });

    expect(manifest.version).toBe(MANIFEST_VERSION);
    expect(manifest.cell).toStrictEqual({ width: 128, height: 128, anchor: FILL.anchor, fit: 'FILL_SQUARE' });
  });

  it('states the region cut from the sheet and the rectangle it is drawn into', () => {
    const manifest = buildManifest({ ...input, cell: FILL });

    // The second tile's 260 square, its one spare row floored away below; drawn at the whole cell.
    expect(manifest.sprites[1]?.placement).toStrictEqual({
      from: { x: 320, y: 20, width: 260, height: 260 },
      x: 0,
      y: 0,
      width: 128,
      height: 128,
    });
    // The rect stays the artwork's own box, as it is under every cut.
    expect(manifest.sprites[1]).toMatchObject({ x: 320, y: 20, width: 260, height: 261 });
  });

  it('magnifies the placement with the file, cell and region alike', () => {
    const manifest = buildManifest({ ...input, scale: 2, cell: { ...FILL, fit: 'SCALE_SET' } });

    // One step of 300 across makes the factor 128/300, so a 260 tile is drawn at 111 at 1:1.
    expect(manifest.cell).toMatchObject({ width: 256, height: 256 });
    expect(manifest.sprites[0]?.placement).toStrictEqual({
      from: { x: 40, y: 40, width: 520, height: 520 },
      x: 2 * Math.floor((128 - 111) / 2),
      y: 2 * Math.floor((128 - 111) / 2),
      width: 222,
      height: 222,
    });
  });

  it('puts the pivot on the square that was cut, since that is the artwork the cell holds', () => {
    const manifest = buildManifest({ ...input, cell: FILL });

    expect(manifest.sprites[1]?.pivot).toStrictEqual({ x: 320 + 130, y: 20 + 130 });
  });

  it('magnifies an odd tile square before it finds its centre, under Keep place', () => {
    const lattice: CellLattice = {
      kind: 'CELLS',
      cells: [
        {
          index: 0,
          region: { left: 0, top: 0, width: 50, height: 50 },
          square: { left: 10, top: 10, width: 25, height: 25 },
        },
      ],
      cellOf: [0],
      tileSide: 25,
    };
    const manifest = buildManifest({
      ...input,
      width: 50,
      height: 50,
      scale: 2,
      boxes: [{ left: 12, top: 12, width: 20, height: 20, pixels: 400 }],
      names: ['locked-mark'],
      naming: 'CELL',
      cell: { ...FILL, width: 25, height: 25, fit: 'IN_PLACE', lattice },
    });

    // The square is 20 + 50 across at 2×, so its centre is 45, where flooring 12.5 first would say 44.
    expect(manifest.sprites[0]).toMatchObject({ pivot: { x: 45, y: 45 }, pivotSource: 'TILE_CENTRE' });
  });
});
