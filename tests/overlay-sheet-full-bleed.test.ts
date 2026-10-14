import { beforeAll, describe, expect, it } from 'vitest';
import { keepPlace, readOverlaySheet, type OverlayReading } from './overlaySheetReading.ts';
import { PLACE_OVERSHOOT } from '../src/constants/cellLattice.ts';
import { measureSheetScale } from '../src/utils/pixelGrid.ts';
import { cellPlacements, oversizedSprites } from '../src/utils/spriteCell.ts';

/**
 * The second full-bleed overlay sheet, `test_sprites/icons_fullbleed.png`, drawn from the prompt that
 * puts each tier mark in the bottom-left corner of the tile, through the real quantiser, the cell reading
 * and the Keep place fit into 128 × 128 files. `TILE_TOLERANCE` and `PLACE_OVERSHOOT` were set on
 * `game_overlay_test.png`; this is the first sheet they were not set from.
 *
 * The veil came back 11% over the share the prompt states, and every tier mark inside its tile, in its
 * bottom-left corner. The bottom row holds no piece drawn to the whole tile, and the generator drew it
 * fifteen pixels below where the rows above it put it, so its square is held to its own pieces
 * (`squareCentres`); read off the rows above, both its pieces were refused.
 */
let reading: OverlayReading;

beforeAll(async () => {
  reading = await readOverlaySheet('icons_fullbleed.png', 'FULL_BLEED_TILE');
}, 300_000);

describe('the second full-bleed overlay sheet', () => {
  it('finds each of the fourteen pieces in its own cell, the separate pips of a tier mark in one', () => {
    // The two pips of the second tier mark and the four of the fourth are drawn apart.
    expect(reading.lattice.cellOf).toEqual([0, 1, 2, 3, 4, 5, 6, 6, 7, 8, 8, 8, 8, 9, 10, 11, 12, 13]);
    expect(reading.pieces).toHaveLength(14);
  });

  it('measures the tile square from the veil, 11% over the share the prompt states', () => {
    // 60% of the median 313-pixel cell is 188.
    expect(reading.lattice.tileSide).toBe(208);
  });

  it('keeps every piece in place in a 128 × 128 file, each tier mark in its bottom-left corner', () => {
    const cell = keepPlace(reading);
    expect(oversizedSprites(reading.pieces, cell)).toEqual([]);
    const placed = cellPlacements(reading.pieces, cell);
    const marks = placed.filter((_piece, at) => reading.names[at]?.startsWith('tier-mark-'));
    expect(marks).toHaveLength(4);
    for (const [at, mark] of marks.entries()) {
      const name = `tier-mark-${String(at + 1)}`;
      expect(mark.x, name).toBeGreaterThanOrEqual(0);
      expect(mark.x, name).toBeLessThanOrEqual(13);
      expect(mark.y + mark.height, name).toBeGreaterThanOrEqual(118);
      expect(mark.y + mark.height, name).toBeLessThanOrEqual(128);
      expect(mark.x + mark.width, name).toBeLessThan(128);
    }
    // The furthest any piece reaches past its file is the new-item flare's seven pixels, drawn nine
    // pixels larger than the tile and seven below its row: one pixel inside the margin.
    const past = placed.map((piece) =>
      Math.max(-piece.x, -piece.y, piece.x + piece.width - 128, piece.y + piece.height - 128),
    );
    expect(Math.max(...past)).toBe(7);
    expect(reading.names[past.indexOf(7)]).toBe('new-item-flare');
    expect(128 * PLACE_OVERSHOOT).toBe(8);
  });

  it('reads one pixel scale off the whole sheet, where the first full-bleed sheet had none', () => {
    expect(measureSheetScale(reading.sheet)).toEqual({ grid: 7, measurement: 'REPEAT_DISTANCE' });
  });
});
