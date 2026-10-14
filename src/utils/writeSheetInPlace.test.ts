import { describe, expect, it } from 'vitest';
import { DEFAULT_SPRITE_CELL_CHOICE } from '../constants/spriteCell.ts';
import { decodePng } from '../test/decodePng.ts';
import { imageFrom } from '../test/images.ts';
import { readZip } from '../test/readZip.ts';
import { sheetWriteJob } from '../test/sheetWriteJob.ts';
import type { CellLattice } from '../types/cellLattice.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { SpriteCellChoice } from '../types/spriteCell.ts';
import { cellLattice } from './cellLattice.ts';
import { buildManifest } from './spriteManifest.ts';
import { cellPlacements, oversizedSprites, oversizeReason, resolveSpriteCell } from './spriteCell.ts';
import { spriteSegments } from './spriteSegments.ts';
import { writeSheet } from './writeSheet.ts';

/**
 * A painted overlay sheet through the sprite pack into 128 × 128 files under `Keep place`: a full veil
 * in the first cell, a badge in the top-right corner of the second cell's tile square, and a bar along
 * the bottom of the third's. 1024 pixels across, four 256-pixel cells, the tile square 60% of a cell.
 */
const SIDE = 1024;
const TILE = 154;
const MARGIN = 51;

/** Each opaque rectangle of the sheet: `[left, top, width, height]`. */
const SHAPES: readonly (readonly [number, number, number, number])[] = [
  [MARGIN, MARGIN, TILE, TILE],
  [256 + MARGIN + TILE - 30, MARGIN, 30, 30],
  [512 + MARGIN, MARGIN + TILE - 20, TILE, 20],
];

const SHEET = imageFrom(SIDE, 512, (x, y) =>
  SHAPES.some(([left, top, width, height]) => x >= left && x < left + width && y >= top && y < top + height)
    ? { r: 200, g: 40, b: 40, a: 255 }
    : { r: 0, g: 0, b: 0, a: 0 },
);

function segmented(): readonly SpriteBox[] {
  const sprites = spriteSegments(SHEET, 1);
  if (sprites.kind !== 'SEGMENTED') throw new Error('The sheet is three separate pieces.');
  return sprites.boxes;
}

function latticeOf(boxes: readonly SpriteBox[]): CellLattice {
  return cellLattice(boxes, {
    width: SIDE,
    columns: 4,
    placement: 'WITHIN_TILE',
    share: 0.6,
    tileCells: { measuring: [0], spanning: [0] },
  });
}

const CHOICE: SpriteCellChoice = { ...DEFAULT_SPRITE_CELL_CHOICE, source: 'TARGET', fit: 'SCALE_SET' };

/** The opaque pixels' bounds in one decoded file. */
function opaqueBounds(png: { width: number; height: number; pixels: Uint8Array | Uint8ClampedArray }) {
  let left = png.width;
  let top = png.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if ((png.pixels[(y * png.width + x) * 4 + 3] ?? 0) === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return { left, top, right, bottom };
}

describe('an overlay sheet, packed into 128 × 128 cells under Keep place', () => {
  it('keeps every piece where it sits on the tile, in a file the size of the tile', async () => {
    const boxes = segmented();
    const cell = resolveSpriteCell(CHOICE, { width: 128, height: 128 }, 1, null, latticeOf(boxes));
    expect(cell?.fit).toBe('IN_PLACE');
    if (cell === null) throw new Error('unreachable');
    expect(oversizedSprites(boxes, cell)).toEqual([]);

    const job = sheetWriteJob({
      image: SHEET,
      format: 'SPRITE_PACK',
      boxes,
      names: ['disabled-veil', 'locked-mark', 'broken-overlay'],
      naming: 'CELL',
      cell,
    });
    const files = readZip((await writeSheet(job)).bytes).filter((entry) => entry.name.startsWith('sprites/'));
    const [veil, badge, bar] = await Promise.all(files.map(async (entry) => decodePng(entry.bytes)));
    if (veil === undefined || badge === undefined || bar === undefined) throw new Error('three files');

    expect([veil.width, veil.height, badge.width, badge.height]).toEqual([128, 128, 128, 128]);
    expect(opaqueBounds(veil)).toEqual({ left: 0, top: 0, right: 127, bottom: 127 });
    // The badge is the top-right 30 of 154, a fifth of the tile, so it fills the top-right fifth of the file.
    expect(opaqueBounds(badge)).toEqual({ left: 103, top: 0, right: 127, bottom: 24 });
    // The bar runs the tile's whole width along its bottom edge.
    expect(opaqueBounds(bar)).toEqual({ left: 0, top: 111, right: 127, bottom: 127 });
  });

  it('states each piece’s pivot at the centre of its tile square', () => {
    const boxes = segmented();
    const cell = resolveSpriteCell(CHOICE, { width: 128, height: 128 }, 1, null, latticeOf(boxes));
    const manifest = buildManifest({
      image: 'sheet.png',
      spriteDirectory: 'sprites',
      width: SIDE,
      height: 512,
      scale: 1,
      boxes,
      duplicates: [],
      names: ['disabled-veil', 'locked-mark', 'broken-overlay'],
      naming: 'CELL',
      cell,
      sheet: null,
    });
    expect(manifest.cell?.fit).toBe('IN_PLACE');
    expect(manifest.naming).toBe('CELL');
    expect(manifest.sprites.map((sprite) => sprite.pivotSource)).toEqual([
      'TILE_CENTRE',
      'TILE_CENTRE',
      'TILE_CENTRE',
    ]);
    expect(manifest.sprites.map((sprite) => sprite.pivot)).toEqual([
      { x: MARGIN + TILE / 2, y: MARGIN + TILE / 2 },
      { x: 256 + MARGIN + TILE / 2, y: MARGIN + TILE / 2 },
      { x: 512 + MARGIN + TILE / 2, y: MARGIN + TILE / 2 },
    ]);
  });

  it('places a pixel-art sheet’s pieces at their drawn size', () => {
    const boxes = segmented();
    const cell = resolveSpriteCell(CHOICE, { width: 160, height: 160 }, 2, null, latticeOf(boxes));
    expect(cell?.resamples).toBe(false);
    if (cell === null) throw new Error('unreachable');
    expect(oversizedSprites(boxes, cell)).toEqual([]);
    // At a factor of 1 the 154-pixel square is centred in the 160-pixel file, three pixels in, and the
    // badge keeps its 30 pixels, 124 in from the square's left edge.
    const placed = cellPlacements(boxes, cell);
    expect(placed[0]).toMatchObject({ x: 3, y: 3, width: 154, height: 154 });
    expect(placed[1]).toMatchObject({ x: 127, y: 3, width: 30, height: 30 });
  });

  it('refuses the pack, naming the piece, where its tile square is larger than the file', () => {
    const boxes = segmented();
    const lattice = latticeOf(boxes);
    const cell = resolveSpriteCell(CHOICE, { width: 128, height: 128 }, 2, null, lattice);
    if (cell === null) throw new Error('unreachable');
    // At a pixel scale the 154-pixel square keeps its drawn size, which no 128 cell holds: centred, it
    // overhangs the file by thirteen pixels a side, more than its sixteenth.
    const over = oversizedSprites(boxes, cell);
    expect(over).toEqual([0, 1, 2]);
    expect(oversizeReason(boxes, ['disabled-veil'], cell, over)).toBe(
      'disabled-veil is drawn in a 154 × 154 tile square, larger than the 128 × 128 cell and 2 more do not fit either — raise the cell to at least 154 × 154',
    );
  });

  it('refuses the pack where the sheet’s cells could not be read, and says why', async () => {
    const boxes = segmented();
    const lattice: CellLattice = { kind: 'FAILED', reason: 'no gap between rows near 256', boxes: [0] };
    const cell = resolveSpriteCell(CHOICE, { width: 128, height: 128 }, 1, null, lattice);
    const job = sheetWriteJob({ image: SHEET, format: 'SPRITE_PACK', boxes, names: [], cell });
    await expect(writeSheet(job)).rejects.toThrow(
      'the sheet’s cells could not be read: no gap between rows near 256',
    );
  });

  it('takes Keep place only on a placement sheet, whatever is stored', () => {
    const stored: SpriteCellChoice = { ...CHOICE, fit: 'IN_PLACE' };
    expect(resolveSpriteCell(stored, { width: 128, height: 128 }, 1, null, null)?.fit).toBe('REFUSE');
    expect(resolveSpriteCell(CHOICE, { width: 128, height: 128 }, 1, null, latticeOf(segmented()))?.fit).toBe(
      'IN_PLACE',
    );
  });
});
