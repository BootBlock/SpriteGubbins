import { describe, expect, it } from 'vitest';
import type { Rgba, SpriteBox } from '../types/quantiser.ts';
import { imageFrom } from '../test/images.ts';
import { duplicateSprites } from './duplicateSprites.ts';
import { FULLY_OPAQUE, FULLY_TRANSPARENT, pixelOffset, readPixel } from './imageData.ts';
import { snapDuplicates } from './snapDuplicates.ts';
import { spriteSegments } from './spriteSegments.ts';

const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };
const INK: Rgba = { r: 20, g: 30, b: 40, a: FULLY_OPAQUE };
const SPOT: Rgba = { r: 24, g: 34, b: 44, a: FULLY_OPAQUE };
const FAR: Rgba = { r: 220, g: 30, b: 30, a: FULLY_OPAQUE };

/** A transparent sheet with each stamp's cells written onto it. */
function sheetOf(
  width: number,
  height: number,
  stamps: readonly { left: number; top: number; cells: readonly (readonly Rgba[])[] }[],
): ImageData {
  const image = imageFrom(width, height, () => CLEAR);
  for (const stamp of stamps) {
    for (const [row, cells] of stamp.cells.entries()) {
      for (const [column, color] of cells.entries()) {
        const at = pixelOffset(width, stamp.left + column, stamp.top + row);
        image.data[at] = color.r;
        image.data[at + 1] = color.g;
        image.data[at + 2] = color.b;
        image.data[at + 3] = color.a;
      }
    }
  }
  return image;
}

/** A solid block of one colour. */
function block(width: number, height: number, color: Rgba): Rgba[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => color));
}

/** The same block with its first `count` cells replaced. */
function blockWith(width: number, height: number, color: Rgba, spot: Rgba, count: number): Rgba[][] {
  const cells = block(width, height, color);
  for (let index = 0; index < count; index += 1) {
    const row = cells[Math.floor(index / width)];
    if (row !== undefined) row[index % width] = spot;
  }
  return cells;
}

/** The boxes the segmentation finds, which is what the snap is meant to be handed. */
function boxesOf(image: ImageData): readonly SpriteBox[] {
  const found = spriteSegments(image, 0);
  if (found.kind !== 'SEGMENTED') throw new Error(`Expected SEGMENTED, got ${found.kind}`);
  return found.boxes;
}

/**
 * The box at `index`, or a failure naming what came back instead.
 *
 * `noUncheckedIndexedAccess` types every indexed read as possibly absent, and a cast to say
 * otherwise is exactly the assertion this repository does not make. Failing here says which
 * expectation was wrong rather than which line threw.
 */
function boxAt(boxes: readonly SpriteBox[], index: number): SpriteBox {
  const box = boxes[index];
  if (box === undefined) throw new Error(`Expected a box at ${String(index)}, found ${String(boxes.length)}`);
  return box;
}

/** One sprite's cells read back off a sheet, as a flat list in reading order. */
function cellsOf(image: ImageData, box: SpriteBox): Rgba[] {
  const cells: Rgba[] = [];
  for (let row = 0; row < box.height; row += 1) {
    for (let column = 0; column < box.width; column += 1) {
      cells.push(readPixel(image.data, pixelOffset(image.width, box.left + column, box.top + row)));
    }
  }
  return cells;
}

/** The whole pass over a sheet, at the tolerance given — segment, read, fold. */
function fold(image: ImageData, tolerance: number) {
  const boxes = boxesOf(image);
  return { boxes, ...snapDuplicates(image, duplicateSprites(image, boxes, tolerance), boxes) };
}

describe('snapDuplicates', () => {
  it('writes the canonical over each near-duplicate', () => {
    const image = sheetOf(40, 20, [
      { left: 2, top: 2, cells: block(4, 4, INK) },
      { left: 20, top: 2, cells: blockWith(4, 4, INK, SPOT, 2) },
    ]);

    const { boxes, image: snapped, folded } = fold(image, 24);

    expect(folded).toBe(1);
    expect(cellsOf(snapped, boxAt(boxes, 1))).toEqual(cellsOf(snapped, boxAt(boxes, 0)));
  });

  it('leaves the source image untouched', () => {
    const image = sheetOf(40, 20, [
      { left: 2, top: 2, cells: block(4, 4, INK) },
      { left: 20, top: 2, cells: blockWith(4, 4, INK, SPOT, 2) },
    ]);
    const before = new Uint8ClampedArray(image.data);

    fold(image, 24);

    expect(image.data).toEqual(before);
  });

  it('leaves sprites that were not grouped exactly as they were', () => {
    const image = sheetOf(60, 20, [
      { left: 2, top: 2, cells: block(4, 4, INK) },
      { left: 20, top: 2, cells: blockWith(4, 4, INK, SPOT, 2) },
      { left: 40, top: 2, cells: block(4, 4, FAR) },
    ]);

    const { boxes, image: snapped } = fold(image, 24);

    expect(cellsOf(snapped, boxAt(boxes, 2))).toEqual(cellsOf(image, boxAt(boxes, 2)));
  });

  it('gives a wider member the canonical silhouette, clearing what is left over', () => {
    // The case a block copy could not do: the member is a column wider than the sprite replacing it,
    // so the fold has to take that column away, or the sheet keeps a stripe of the drawing it has
    // just replaced. Afterwards the two are the same shape as well as the same colours.
    //
    // Twenty cells to a side, which is what makes the pair a pair at all: the column they differ by
    // is clear on one side, so it scores the full 255 and the mean is that column's share of the
    // union box. Over 21 × 20 cells that is 12, inside the dial's range — over the 5 × 5 blocks the
    // rest of this file uses it would be 51, and the two would rightly not be one drawing.
    const image = sheetOf(80, 30, [
      { left: 2, top: 2, cells: block(20, 20, INK) },
      { left: 30, top: 2, cells: block(21, 20, INK) },
    ]);

    const { image: snapped, folded } = fold(image, 24);

    expect(folded).toBe(1);
    expect(boxesOf(snapped).map((box) => [box.width, box.height])).toEqual([
      [20, 20],
      [20, 20],
    ]);
    expect(readPixel(snapped.data, pixelOffset(snapped.width, 50, 3)).a).toBe(FULLY_TRANSPARENT);
  });

  it('grows a narrower member into the space it needs, when that space is clear', () => {
    const image = sheetOf(80, 30, [
      { left: 2, top: 2, cells: block(21, 20, INK) },
      { left: 30, top: 2, cells: block(20, 20, INK) },
    ]);

    const { image: snapped, folded } = fold(image, 24);

    expect(folded).toBe(1);
    expect(boxesOf(snapped).map((box) => [box.width, box.height])).toEqual([
      [21, 20],
      [21, 20],
    ]);
  });

  it('leaves a member alone rather than growing it into a neighbour', () => {
    // The member is a column narrower than the canonical and one clear pixel from a third sprite, so
    // taking the canonical's silhouette would put its artwork directly against that sprite — which
    // the next segmentation would read as one larger piece. The fold stands down instead, and the
    // sheet keeps a repeat rather than losing a neighbour.
    const image = sheetOf(80, 30, [
      { left: 2, top: 2, cells: block(21, 20, INK) },
      { left: 30, top: 2, cells: block(20, 20, INK) },
      { left: 51, top: 2, cells: block(10, 20, FAR) },
    ]);
    expect(boxesOf(image)).toHaveLength(3);

    const { image: snapped, folded } = fold(image, 24);

    expect(folded).toBe(0);
    expect(snapped.data).toEqual(image.data);
  });

  it('leaves the segmentation finding the same boxes where every extent already matched', () => {
    const image = sheetOf(60, 24, [
      { left: 2, top: 2, cells: block(5, 5, INK) },
      { left: 20, top: 8, cells: blockWith(5, 5, INK, SPOT, 3) },
      { left: 40, top: 14, cells: block(4, 3, FAR) },
    ]);

    const { boxes, image: snapped } = fold(image, 24);

    expect(boxesOf(snapped)).toEqual(boxes);
  });

  it('carries a cleared cell over with the rest of the drawing', () => {
    // A canonical with a hole in it, folded onto a member that has none. The hole has to arrive — a
    // fold that only wrote opaque pixels would leave the member's own pixel showing through, and the
    // two sprites would still differ after a fold that reported success.
    //
    // Five cells to a side rather than three, and the arithmetic is why: the single cell they differ
    // by is clear on one side, which scores the full 255, so over nine cells the mean is 28 and the
    // pair is past every rung the dial offers. Over twenty-five it is 10.
    const hole = block(5, 5, INK);
    (hole[2] ?? [])[2] = CLEAR;
    const filled = block(5, 5, INK);
    (filled[2] ?? [])[2] = SPOT;
    const image = sheetOf(40, 20, [
      { left: 2, top: 2, cells: hole },
      { left: 20, top: 2, cells: filled },
    ]);

    const { image: snapped, folded } = fold(image, 24);

    expect(folded).toBe(1);
    expect(readPixel(snapped.data, pixelOffset(snapped.width, 22, 4)).a).toBe(FULLY_TRANSPARENT);
  });

  it('returns the sheet unchanged, and nothing folded, when there is nothing to fold', () => {
    const image = sheetOf(40, 20, [
      { left: 2, top: 2, cells: block(4, 4, INK) },
      { left: 20, top: 2, cells: block(4, 4, FAR) },
    ]);

    const { image: snapped, folded } = fold(image, 8);

    expect(folded).toBe(0);
    expect(snapped.data).toEqual(image.data);
  });

  it('leaves a member alone rather than writing off the edge of the sheet', () => {
    // The member is flush against the right edge and a column narrower than the canonical, so the
    // silhouette it would take does not fit. Clipping it would produce a sprite that is neither
    // drawing, so the fold stands down.
    const image = sheetOf(78, 30, [
      { left: 2, top: 2, cells: block(21, 20, INK) },
      { left: 58, top: 2, cells: block(20, 20, INK) },
    ]);

    const { image: snapped, folded } = fold(image, 24);

    expect(folded).toBe(0);
    expect(snapped.data).toEqual(image.data);
  });
});
