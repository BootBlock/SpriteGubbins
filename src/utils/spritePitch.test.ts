import { describe, expect, it } from 'vitest';
import type { SpriteBox } from '../types/quantiser.ts';
import { evenScale } from './evenScale.ts';
import { spritePitch } from './spritePitch.ts';

/** A box with its artwork's pixel count left out, which neither reading asks for. */
function box(left: number, top: number, width: number, height: number): SpriteBox {
  return { left, top, width, height, pixels: width * height };
}

/**
 * Isolated marks on a 4 × 4 grid with a 300-pixel step, each a different size and set a little off
 * its slot's centre, as a generator draws them.
 */
const MARKS: readonly SpriteBox[] = Array.from({ length: 16 }, (_, index) => {
  const column = index % 4;
  const row = Math.floor(index / 4);
  const side = 120 + ((index * 37) % 90);
  const wobble = (index % 3) - 1;
  return box(column * 300 + 150 - side / 2 + wobble, row * 300 + 150 - side / 2 - wobble, side, side);
});

describe('spritePitch', () => {
  it('reads the grid’s step on both axes from the sprites’ centres, whatever their sizes', () => {
    const pitch = spritePitch(MARKS);

    // Within the pixel or two each mark was set off its slot by.
    expect(Math.abs((pitch.x ?? 0) - 300)).toBeLessThanOrEqual(2);
    expect(Math.abs((pitch.y ?? 0) - 300)).toBeLessThanOrEqual(2);
  });

  it('takes the median step, so a gap left by a missing sprite does not stretch the grid', () => {
    // The third mark of the first row is gone, so one step across that row is 600.
    const pitch = spritePitch(MARKS.filter((_, index) => index !== 2));

    expect(Math.abs((pitch.x ?? 0) - 300)).toBeLessThanOrEqual(2);
  });

  it('measures nothing on an axis the sheet gives no step along', () => {
    expect(spritePitch([box(0, 0, 10, 10), box(20, 0, 10, 10)])).toStrictEqual({ x: 20, y: null });
    expect(spritePitch([box(0, 0, 10, 10)])).toStrictEqual({ x: null, y: null });
  });
});

describe('evenScale', () => {
  const cell = { width: 128, height: 128, anchor: { x: 'CENTRE', y: 'MIDDLE' }, fit: 'SCALE_SET' } as const;

  it('makes one step of the grid one cell, so every mark keeps its size relative to the rest', () => {
    expect(evenScale(MARKS, cell)).toBeCloseTo(128 / 300, 2);
  });

  it('takes the smaller factor where the grid’s steps differ, so a step fits the cell both ways', () => {
    const wide = MARKS.map((mark, index) => ({ ...mark, left: mark.left + (index % 4) * 300 }));

    // Twice as far apart across, so the step across, 600, is the one that decides a square cell —
    // and the step down decides a cell short enough.
    expect(evenScale(wide, cell)).toBeCloseTo(128 / 600, 2);
    expect(evenScale(wide, { ...cell, height: 32 })).toBeCloseTo(32 / 300, 2);
  });

  it('never lets one sprite past the cell, even where it is wider than the step', () => {
    // The row's median step is 225, which would draw the 400-pixel sprite at 228 px in a 128 cell.
    const spread = [box(0, 0, 400, 100), box(300, 0, 100, 100), box(600, 0, 100, 100)];

    expect(evenScale(spread, cell)).toBeCloseTo(128 / 400, 5);
  });

  it('fits a lone sprite to the cell, with no grid to read', () => {
    expect(evenScale([box(0, 0, 256, 200)], cell)).toBe(0.5);
  });

  it('enlarges a set drawn smaller than the cell, by the same factor for all', () => {
    const small = [box(0, 0, 40, 40), box(64, 0, 30, 30)];

    expect(evenScale(small, cell)).toBeCloseTo(128 / 59, 5);
  });
});
