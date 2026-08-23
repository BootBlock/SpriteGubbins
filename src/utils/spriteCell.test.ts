import { describe, expect, it } from 'vitest';
import { DEFAULT_SPRITE_CELL_CHOICE } from '../constants/spriteCell.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { SpriteCell, SpriteCellChoice } from '../types/spriteCell.ts';
import {
  cellOffsets,
  cellPivot,
  oversizedSprites,
  oversizeReason,
  resolveSpriteCell,
  targetFitsCell,
} from './spriteCell.ts';

/** Three pieces of a rig at three different sizes — the shape the whole feature exists to fix. */
const BOXES: readonly SpriteBox[] = [
  { left: 10, top: 10, width: 8, height: 6, pixels: 30 },
  { left: 30, top: 10, width: 5, height: 12, pixels: 40 },
  { left: 50, top: 10, width: 12, height: 12, pixels: 90 },
];

function choice(overrides: Partial<SpriteCellChoice> = {}): SpriteCellChoice {
  return { ...DEFAULT_SPRITE_CELL_CHOICE, ...overrides };
}

const CELL: SpriteCell = { width: 16, height: 16, anchor: { x: 'CENTRE', y: 'BOTTOM' } };

describe('resolveSpriteCell', () => {
  it('answers with no cell at all where each sprite keeps its bounding box', () => {
    expect(resolveSpriteCell(choice({ source: 'BOX' }), { width: 20, height: 20 })).toBeNull();
  });

  it('takes the studio’s own component size where that is the source', () => {
    const cell = resolveSpriteCell(choice({ source: 'TARGET' }), { width: 20, height: 12 });

    expect(cell).toStrictEqual({ width: 20, height: 12, anchor: { x: 'CENTRE', y: 'BOTTOM' } });
  });

  it('degrades to the bounding box where the studio states no size to take', () => {
    // The control does not offer that position while there is no target, and this is what makes the
    // absence safe wherever the two are out of step — a size guessed here would be a cut nobody
    // asked for.
    expect(resolveSpriteCell(choice({ source: 'TARGET' }), null)).toBeNull();
  });

  it('degrades where the studio states a size larger than a cell may be', () => {
    // The control does not offer the position either, so this is the same guard on both sides of
    // one question rather than a second answer to it.
    expect(resolveSpriteCell(choice({ source: 'TARGET' }), { width: 2048, height: 2048 })).toBeNull();
  });

  it('takes the typed size where the source is a cell of the reader’s own', () => {
    const typed = choice({ source: 'FIXED', fixed: { width: 24, height: 32 } });

    // And it is the typed size rather than the studio's, even where the studio states one.
    expect(resolveSpriteCell(typed, { width: 20, height: 12 })).toMatchObject({
      width: 24,
      height: 32,
    });
  });
});

describe('oversizedSprites', () => {
  it('finds nothing where every piece fits the cell', () => {
    expect(oversizedSprites(BOXES, CELL)).toStrictEqual([]);
  });

  it('names each piece the cell cannot hold, by its reading-order position', () => {
    const tight: SpriteCell = { ...CELL, width: 6 };

    // The first is 8 wide and the third 12; the second is 5 and fits.
    expect(oversizedSprites(BOXES, tight)).toStrictEqual([0, 2]);
  });

  it('reads either side on its own, so a piece too tall to fit is caught as well', () => {
    expect(oversizedSprites(BOXES, { ...CELL, height: 8 })).toStrictEqual([1, 2]);
  });

  it('accepts a piece exactly the size of the cell', () => {
    // The cell states a size, not a margin — a piece drawn to fill its slot is the intended case.
    expect(oversizedSprites([{ left: 0, top: 0, width: 16, height: 16, pixels: 4 }], CELL)).toStrictEqual([]);
  });
});

describe('cellOffsets', () => {
  it('registers the artwork at the anchor the reader named', () => {
    // The first piece is 8 × 6 in a 16 × 16 cell: four pixels of slack either side across, and ten
    // above it with the artwork against the foot.
    expect(cellOffsets(BOXES, CELL)[0]).toStrictEqual({ x: 4, y: 10 });

    expect(cellOffsets(BOXES, { ...CELL, anchor: { x: 'LEFT', y: 'TOP' } })[0]).toStrictEqual({
      x: 0,
      y: 0,
    });

    expect(cellOffsets(BOXES, { ...CELL, anchor: { x: 'RIGHT', y: 'BOTTOM' } })[0]).toStrictEqual({
      x: 8,
      y: 10,
    });
  });

  it('puts an odd pixel of slack on the side a reader can predict', () => {
    // 5 wide in a 16 cell leaves 11, which centres at 5 rather than 5.5 — floored, as a pivot
    // between two pixels is, because a half-pixel is resolved differently by every consumer.
    expect(cellOffsets(BOXES, CELL)[1]?.x).toBe(5);
  });

  it('is a displacement rather than a rect, so no cut is widened', () => {
    // Widening the cut is what bakes a neighbouring sprite into this sprite's own file — see
    // `placeInCell`, which measured that on all eight reference sheets.
    expect(cellOffsets(BOXES, CELL)).toHaveLength(BOXES.length);
    expect(Object.keys(cellOffsets(BOXES, CELL)[0] ?? {}).sort()).toStrictEqual(['x', 'y']);
  });

  it('offsets a sprite the size of its cell by nothing at all', () => {
    const exact = [{ left: 3, top: 4, width: 16, height: 16, pixels: 9 }];

    expect(cellOffsets(exact, CELL)[0]).toStrictEqual({ x: 0, y: 0 });
  });
});

describe('targetFitsCell', () => {
  it('accepts a component size inside the range the two boxes offer', () => {
    expect(targetFitsCell({ width: 48, height: 96 })).toBe(true);
  });

  it('refuses one past it, which the studio’s free-text field can state', () => {
    // A 2048 cell on a fifteen-sprite sheet asks the writer for fifteen sixteen-megabyte canvases.
    expect(targetFitsCell({ width: 2048, height: 2048 })).toBe(false);
    expect(targetFitsCell({ width: 48, height: 900 })).toBe(false);
  });
});

describe('cellPivot', () => {
  it('reproduces the foot-of-the-box default at the anchor the manifest already used', () => {
    const box = BOXES[0];
    if (box === undefined) throw new Error('the fixture lost its first box');

    expect(cellPivot(box, { x: 'CENTRE', y: 'BOTTOM' })).toStrictEqual({
      x: Math.floor(box.left + box.width / 2),
      y: box.top + box.height,
    });
  });

  it('lands on whichever corner the artwork was registered against', () => {
    const box = BOXES[0];
    if (box === undefined) throw new Error('the fixture lost its first box');

    expect(cellPivot(box, { x: 'LEFT', y: 'TOP' })).toStrictEqual({ x: 10, y: 10 });
    expect(cellPivot(box, { x: 'RIGHT', y: 'MIDDLE' })).toStrictEqual({ x: 18, y: 13 });
  });
});

describe('oversizeReason', () => {
  it('names the first offender, its size and the cell it will not fit', () => {
    const tight: SpriteCell = { ...CELL, width: 6 };
    const said = oversizeReason(BOXES, tight, [0]);

    // Counting from one, as the manifest's own numbering does, so the piece can be found in the
    // preview's Sprites mode.
    expect(said).toContain('Sprite 1');
    expect(said).toContain('8 × 6 drawn pixels');
    expect(said).toContain('6 × 16 cell');
  });

  it('counts the rest rather than listing them', () => {
    // A sheet drawn one step too coarse puts every sprite over at once, and a list of fifteen says
    // no more than the first does.
    expect(oversizeReason(BOXES, { ...CELL, width: 6 }, [0, 2])).toContain('1 more does not fit either');
  });

  it('says nothing where nothing was over', () => {
    expect(oversizeReason(BOXES, CELL, [])).toBe('');
  });
});
