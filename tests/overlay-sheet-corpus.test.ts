import { beforeAll, describe, expect, it } from 'vitest';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { TILE_SHARE } from '../src/constants/promptText/tileShare.ts';
import { DEFAULT_KEY_TOLERANCE } from '../src/constants/quantiser.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { iconOverlaySheets } from '../src/constants/sheetPlans/iconOverlaySheets.ts';
import { DEFAULT_SPRITE_CELL_CHOICE } from '../src/constants/spriteCell.ts';
import type { CellLattice } from '../src/types/cellLattice.ts';
import type { SpriteBox } from '../src/types/quantiser.ts';
import { cellLattice } from '../src/utils/cellLattice.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import { planSlots } from '../src/utils/componentSlots.ts';
import {
  cellPlacements,
  oversizedSprites,
  oversizeReason,
  resolveSpriteCell,
} from '../src/utils/spriteCell.ts';
import { tileCellsOf } from '../src/utils/tileCellsOf.ts';

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
const MAGENTA = { r: 255, g: 0, b: 255, a: 255 } as const;
const [OVERLAY] = iconOverlaySheets('FULL_BLEED_TILE', []);

let boxes: readonly SpriteBox[] = [];
let lattice: CellLattice;

beforeAll(async () => {
  const sheet = await loadCorpusSheet('game_overlay_test.png');
  const result = quantiseImage(sheet, {
    ...QUANTISE_DEFAULT_DIALS,
    grid: 1,
    key: { color: MAGENTA, tolerance: DEFAULT_KEY_TOLERANCE },
    reduction: null,
  });
  if (result.sprites.kind !== 'SEGMENTED') {
    throw new Error(`the sheet did not segment: ${result.sprites.kind}`);
  }
  boxes = result.sprites.boxes;
  lattice = cellLattice(boxes, {
    width: result.sprites.width,
    columns: 4,
    placement: 'WITHIN_TILE',
    share: TILE_SHARE.HIGH_RESOLUTION / 100,
    tileCells: tileCellsOf(OVERLAY),
  });
}, 300_000);

describe('the generated overlay sheet', () => {
  it('finds each of the fourteen pieces in its own cell, in reading order', () => {
    if (lattice.kind !== 'CELLS') throw new Error(`expected cells, got: ${lattice.reason}`);
    expect(lattice.cellOf).toEqual(Array.from({ length: 14 }, (_, at) => at));
  });

  it('measures the tile square from the veil, 16% over the share the prompt states', () => {
    if (lattice.kind !== 'CELLS') throw new Error(`expected cells, got: ${lattice.reason}`);
    expect(lattice.tileSide).toBe(217);
  });

  it('keeps every piece in place in a 128 × 128 file, the spanning ones filling it, bar one too wide', () => {
    const choice = { ...DEFAULT_SPRITE_CELL_CHOICE, source: 'TARGET', fit: 'SCALE_SET' } as const;
    const cell = resolveSpriteCell(choice, { width: 128, height: 128 }, 1, null, lattice);
    if (cell === null) throw new Error('unreachable: a target cell resolves');
    expect(cell.fit).toBe('IN_PLACE');
    // The fourth tier mark is 263 pixels across a 217-pixel square, a ninth past each side.
    const over = oversizedSprites(boxes, cell);
    expect(over).toEqual([8]);
    expect(oversizeReason(boxes, planSlots(OVERLAY), cell, over)).toMatch(
      /^tier-mark-4 reaches past its 128 × 128 cell/,
    );

    const placed = cellPlacements(boxes, cell);
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
    // The quarter sweep is the top-right quadrant of its square, drawn three pixels above the squares
    // of its row, so it reaches two file pixels past the top, which the clip takes.
    const quarter = placed[3];
    if (quarter === undefined) throw new Error('unreachable: fourteen pieces');
    expect(quarter.y).toBe(-2);
    // Its right edge meets the file's within a pixel, and it was drawn 118 pixels across, a little over
    // half the square, so it starts just left of the file's middle.
    expect(Math.abs(quarter.x + quarter.width - 128)).toBeLessThanOrEqual(1);
    expect(quarter.x).toBe(58);
  });
});
