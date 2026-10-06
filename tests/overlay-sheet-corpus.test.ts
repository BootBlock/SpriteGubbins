import { beforeAll, describe, expect, it } from 'vitest';
import { keepPlace, readOverlaySheet, type OverlayReading } from './overlaySheetReading.ts';
import { cellPlacements, oversizedSprites, oversizeReason } from '../src/utils/spriteCell.ts';

/**
 * The first overlay sheet a generator drew from the cell prompt, `test_sprites/game_overlay_test.png`,
 * through the real quantiser, the cell reading and the Keep place fit into 128 × 128 files.
 *
 * What it pins is what the synthetic sheets could not: the generator drew the tile square at about 70%
 * of the cell where the prompt asked for 60%, drew the halo, the ring, the glow and the three-quarter
 * sweep each a little larger than the veil, and laid its squares a few pixels off the middle of the
 * cells the gaps describe. Every piece still lands in its cell, in its place — bar the fourth tier mark,
 * drawn wider than the tile, which the pack refuses by name.
 */
let reading: OverlayReading;

beforeAll(async () => {
  reading = await readOverlaySheet('game_overlay_test.png', 'FULL_BLEED_TILE');
}, 300_000);

describe('the generated overlay sheet', () => {
  it('finds each of the fourteen pieces in its own cell, in reading order', () => {
    expect(reading.lattice.cellOf).toEqual(Array.from({ length: 14 }, (_, at) => at));
  });

  it('measures the tile square from the veil, 16% over the share the prompt states', () => {
    expect(reading.lattice.tileSide).toBe(217);
  });

  it('keeps every piece in place in a 128 × 128 file, the spanning ones filling it, bar one too wide', () => {
    const { pieces, names } = reading;
    const cell = keepPlace(reading);
    expect(cell.fit).toBe('IN_PLACE');
    // The fourth tier mark is 263 pixels across a 217-pixel square, a ninth past each side.
    const over = oversizedSprites(pieces, cell);
    expect(over).toEqual([8]);
    expect(oversizeReason(pieces, names, cell, over)).toMatch(/^tier-mark-4 reaches past its 128 × 128 cell/);

    const placed = cellPlacements(pieces, cell);
    // The veil, the halo, the ring, the three-quarter sweep and the glow each fill the file along their
    // longer side and lie wholly inside it, however much larger than the veil each was drawn.
    for (const index of [0, 1, 2, 4, 9]) {
      const piece = placed[index];
      if (piece === undefined) throw new Error('unreachable: fourteen pieces');
      expect(Math.max(piece.width, piece.height), `piece ${String(index)}`).toBe(128);
      expect(
        [piece.x, piece.y].every((at) => at >= 0),
        `piece ${String(index)}`,
      ).toBe(true);
      expect(piece.x + piece.width <= 128 && piece.y + piece.height <= 128, `piece ${String(index)}`).toBe(
        true,
      );
    }
    // The quarter sweep is the top-right quadrant of its square, drawn two pixels above the squares of
    // its row, so it reaches a file pixel past the top, which the clip takes.
    const quarter = placed[3];
    if (quarter === undefined) throw new Error('unreachable: fourteen pieces');
    expect(quarter.y).toBe(-1);
    // Its right edge meets the file's within a pixel, and it was drawn 118 pixels across, a little over
    // half the square, so it starts just left of the file's middle.
    expect(Math.abs(quarter.x + quarter.width - 128)).toBeLessThanOrEqual(1);
    expect(quarter.x).toBe(58);
  });
});
