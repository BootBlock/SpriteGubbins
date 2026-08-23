import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import { pixelOffset, readPixel } from './imageData.ts';
import { cropSprite } from './cropSprite.ts';
import { cellOffsets } from './spriteCell.ts';
import { placeInCell } from './placeInCell.ts';

const A = { r: 200, g: 30, b: 30, a: 255 } as const;
const B = { r: 30, g: 30, b: 200, a: 255 } as const;
const CLEAR = { r: 0, g: 0, b: 0, a: 0 } as const;

/**
 * A sheet holding two sprites a gutter apart, which is the layout every returned sheet has and the
 * one that decides whether a cell is a canvas or a window.
 *
 * Ten wide: sprite A fills columns 0–1, a clear gutter runs 2–2, and sprite B fills 3–4.
 */
const SHEET = imageFrom(10, 2, (x) => {
  if (x < 2) return A;
  if (x >= 3 && x < 5) return B;
  return CLEAR;
});

const BOX_A = { left: 0, top: 0, width: 2, height: 2, pixels: 4 };

/** `readPixel` takes a channel offset; every assertion here is about a position. */
function at(image: ImageData, x: number, y: number) {
  return readPixel(image.data, pixelOffset(image.width, x, y));
}

describe('placeInCell', () => {
  it('lays the artwork at the offset it is given and leaves the rest clear', () => {
    const placed = placeInCell(cropSprite(SHEET, BOX_A), { width: 6, height: 2 }, { x: 2, y: 0 });

    expect([placed.width, placed.height]).toStrictEqual([6, 2]);
    expect(at(placed, 2, 0)).toStrictEqual(A);
    expect(at(placed, 3, 0)).toStrictEqual(A);
    expect(at(placed, 1, 0)).toStrictEqual(CLEAR);
    expect(at(placed, 4, 0)).toStrictEqual(CLEAR);
  });

  it('never brings a neighbouring sprite into this sprite’s own file', () => {
    // The defect this function exists for. A 6 × 2 cell centred on a 2-wide box reaches from column
    // −2 to column 3 of the sheet, and column 3 is where the next sprite starts — so cutting the
    // sheet at a cell-sized rect puts a slice of sprite B into sprite A's PNG. Cutting the box and
    // laying it on a clear cell cannot.
    const cell = { width: 6, height: 2 };
    const offset = cellOffsets([BOX_A], { ...cell, anchor: { x: 'CENTRE', y: 'BOTTOM' } })[0];
    if (offset === undefined) throw new Error('the offsets came back empty');
    const placed = placeInCell(cropSprite(SHEET, BOX_A), cell, offset);

    const widened = cropSprite(SHEET, { ...BOX_A, left: BOX_A.left - offset.x, width: cell.width });
    expect(at(widened, 5, 0)).toStrictEqual(B);
    expect([...placed.data].some((_, index) => index % 4 === 2 && placed.data[index] === B.b)).toBe(false);
  });

  it('clips artwork that would hang past the cell rather than writing past its end', () => {
    // Unreachable while `writeSheet` refuses an oversized sprite, and what keeps that a refusal
    // rather than a corrupted file if it ever stopped.
    const placed = placeInCell(cropSprite(SHEET, BOX_A), { width: 1, height: 2 }, { x: -1, y: 0 });

    expect([placed.width, placed.height]).toStrictEqual([1, 2]);
    expect(at(placed, 0, 0)).toStrictEqual(A);
  });

  it('drops a row that falls outside the cell without shifting the ones that do not', () => {
    const placed = placeInCell(cropSprite(SHEET, BOX_A), { width: 2, height: 1 }, { x: 0, y: -1 });

    expect(placed.height).toBe(1);
    // Row 1 of the sprite lands on row 0 of the cell; row 0 is dropped rather than folded onto it.
    expect(at(placed, 0, 0)).toStrictEqual(A);
  });
});
