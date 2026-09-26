import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import { coverageMask } from './coverageMask.ts';
import { FULLY_OPAQUE, FULLY_TRANSPARENT } from './imageData.ts';

const INK = { r: 20, g: 30, b: 40, a: FULLY_OPAQUE };
const FAINT = { r: 20, g: 30, b: 40, a: 1 };
const CLEAR = { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };

/** Whether the mask marks column `column` of row `row` of its box. */
function marked(mask: ReturnType<typeof coverageMask>, column: number, row: number): boolean {
  return (((mask.bits[row * mask.stride + (column >>> 5)] ?? 0) >>> (column & 31)) & 1) === 1;
}

describe('coverageMask', () => {
  it('marks every pixel with any coverage, faint or solid, at its column and row in the box', () => {
    const sheet = imageFrom(80, 6, (x, y) => {
      if (y === 2 && (x === 5 || x === 36 || x === 74)) return INK;
      if (y === 4 && x === 40) return FAINT;
      return CLEAR;
    });
    const mask = coverageMask(sheet, { left: 4, top: 1, width: 71, height: 5, pixels: 0 });

    expect(mask.stride).toBe(3);
    const found: [number, number][] = [];
    for (let row = 0; row < mask.height; row += 1) {
      for (let column = 0; column < 32 * mask.stride; column += 1) {
        if (marked(mask, column, row)) found.push([column, row]);
      }
    }
    expect(found).toEqual([
      [1, 1],
      [32, 1],
      [70, 1],
      [36, 3],
    ]);
  });

  it('never reads outside the box, so a neighbour one pixel away leaves no trace', () => {
    // Solid everywhere except the box, and the tail bits past the box's width stay clear too — the
    // registration ANDs whole words and relies on that.
    const sheet = imageFrom(40, 10, (x, y) => (x >= 2 && x < 12 && y >= 2 && y < 8 ? CLEAR : INK));
    const mask = coverageMask(sheet, { left: 2, top: 2, width: 10, height: 6, pixels: 0 });

    expect(Array.from(mask.bits)).toEqual([0, 0, 0, 0, 0, 0]);
    expect({ left: mask.left, top: mask.top, width: mask.width, height: mask.height }).toEqual({
      left: 2,
      top: 2,
      width: 10,
      height: 6,
    });
  });
});
