import { beforeAll, describe, expect, it } from 'vitest';
import { keepPlace, readOverlaySheet, type OverlayReading } from './overlaySheetReading.ts';
import { measureSheetScale } from '../src/utils/pixelGrid.ts';
import { cellPlacements, oversizedSprites } from '../src/utils/spriteCell.ts';

/**
 * The first isolated-look overlay sheet, `test_sprites/icons_isolated.png`, through the real quantiser,
 * the cell reading and the Keep place fit into 128 × 128 files. Under the isolated look each piece is
 * placed against the whole cell (`WITHIN_CELL`), and the cell is mapped onto the file.
 *
 * The gaps between small pieces fall wherever the pieces leave them, so the cells they bound came back
 * from 276 to 361 pixels wide. Every square is the median cell's side instead, so every piece is scaled
 * into its file by one factor, as the icons it lies over are.
 */
let reading: OverlayReading;

beforeAll(async () => {
  reading = await readOverlaySheet('icons_isolated.png', 'ISOLATED_MARK');
}, 300_000);

describe('the isolated-look overlay sheet', () => {
  it('finds each of the fourteen pieces in its own cell, the separate pips of a tier mark in one', () => {
    // The pips of the second, third and fourth tier marks are drawn apart.
    expect(reading.lattice.cellOf).toEqual([0, 1, 2, 3, 4, 5, 6, 6, 7, 7, 7, 8, 8, 8, 8, 9, 10, 11, 12, 13]);
    expect(reading.pieces).toHaveLength(14);
    expect(reading.lattice.tileSide).toBeNull();
  });

  it('places every piece against a square of one side, however wide the gaps made its cell', () => {
    const widths = reading.lattice.cells.map((cell) => cell.region.width);
    expect([Math.min(...widths), Math.max(...widths)]).toEqual([276, 361]);
    for (const cell of reading.lattice.cells) {
      expect(cell.square, `cell ${String(cell.index)}`).toMatchObject({ width: 314, height: 314 });
    }
  });

  it('keeps every piece in place in a 128 × 128 file, each scaled by the one factor', () => {
    const cell = keepPlace(reading);
    expect(oversizedSprites(reading.pieces, cell)).toEqual([]);
    const placed = cellPlacements(reading.pieces, cell);
    for (const [at, piece] of placed.entries()) {
      const box = reading.pieces[at];
      const name = reading.names[at] ?? '';
      if (box === undefined) throw new Error('unreachable: one placement per piece');
      expect(Math.abs(piece.width - (box.width * 128) / 314), name).toBeLessThanOrEqual(1);
      expect(
        [piece.x, piece.y].every((edge) => edge >= -1),
        name,
      ).toBe(true);
      expect(Math.max(piece.x + piece.width, piece.y + piece.height), name).toBeLessThanOrEqual(128);
    }
  });

  it('reads one pixel scale off the whole sheet', () => {
    expect(measureSheetScale(reading.sheet)).toEqual({ grid: 5, measurement: 'REPEAT_DISTANCE' });
  });
});
