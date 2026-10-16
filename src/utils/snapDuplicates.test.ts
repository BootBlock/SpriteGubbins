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

/**
 * Ten columns alternating between two colours, ten rows deep: a drawing that scores every cell a
 * whole colour apart when a copy of it is laid a column off, so a fold written at the wrong offset
 * cannot pass for a right one.
 */
function stripes(): Rgba[][] {
  return Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, (_, column) => (column % 2 === 0 ? INK : FAR)),
  );
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

/** The sprite gap most cases segment at: eight-connectivity alone, with no merge beyond it. */
const TOUCHING = 0;

/** The boxes the segmentation finds, which is what the snap is meant to be handed. */
function boxesOf(image: ImageData, gap = TOUCHING): readonly SpriteBox[] {
  const found = spriteSegments(image, gap);
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

/** The whole pass over a sheet, at the tolerance and gap given — segment, read, fold. */
function fold(image: ImageData, tolerance: number, gap = TOUCHING) {
  const boxes = boxesOf(image, gap);
  return { boxes, ...snapDuplicates(image, duplicateSprites(image, boxes, tolerance), boxes, gap) };
}

describe('snapDuplicates', () => {
  it('folds four copies onto a clean one when the first carries a flaw', () => {
    // Four copies of one frame, the first with a single cell drawn in another colour. Folding from
    // the first sprite wrote that cell into all four; folding from the group's most typical copy
    // writes it into none, and rewrites the first sprite with the rest.
    const clean = block(8, 8, INK);
    const flawed = blockWith(8, 8, INK, FAR, 1);
    const image = sheetOf(80, 20, [
      { left: 2, top: 2, cells: flawed },
      { left: 20, top: 2, cells: clean },
      { left: 40, top: 2, cells: clean },
      { left: 60, top: 2, cells: clean },
    ]);

    const { boxes, image: snapped, folded } = fold(image, 2);

    expect(folded).toBe(3);
    for (const index of [0, 1, 2, 3]) {
      expect(cellsOf(snapped, boxAt(boxes, index))).toEqual(clean.flat());
    }
  });

  it('writes the source of a group over each other member', () => {
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

  it.each([
    ['left', { x: -1, y: 0 }],
    ['top', { x: 0, y: -1 }],
  ] as const)(
    'folds a member whose extra %s pixel moved its corner onto the drawing, not beside it',
    (_, step) => {
      // The member is the source's drawing with one pixel added outside one edge, which moves its
      // corner. Written from the corner, the source would land a column or a row off the drawing and
      // leave that pixel's column or row as a fringe; registered, it lands on the drawing and the
      // extra pixel is cleared.
      const drawing = stripes();
      const image = sheetOf(60, 30, [
        { left: 4, top: 4, cells: drawing },
        { left: 30, top: 6, cells: drawing },
        { left: 30 + step.x, top: 6 + step.y, cells: [[INK]] },
      ]);
      expect(boxesOf(image).map((box) => [box.left, box.top, box.width, box.height])).toEqual([
        [4, 4, 10, 10],
        [30 + step.x, 6 + step.y, 10 - step.x, 10 - step.y],
      ]);

      const { image: snapped, folded } = fold(image, 3);

      expect(folded).toBe(1);
      const after = boxesOf(snapped);
      expect(after.map((box) => [box.left, box.top, box.width, box.height])).toEqual([
        [4, 4, 10, 10],
        [30, 6, 10, 10],
      ]);
      expect(cellsOf(snapped, boxAt(after, 1))).toEqual(drawing.flat());
    },
  );

  it('grows a member left, into clear space, where the source reaches further that way', () => {
    // The mirror of the case above: the source is the one carrying the extra left pixel, so the
    // member takes it, one column left of the member's own corner.
    const drawing = stripes();
    const image = sheetOf(60, 30, [
      { left: 4, top: 4, cells: drawing },
      { left: 3, top: 4, cells: [[INK]] },
      { left: 30, top: 6, cells: drawing },
    ]);

    const { image: snapped, folded } = fold(image, 3);

    expect(folded).toBe(1);
    expect(boxesOf(snapped).map((box) => [box.left, box.top, box.width, box.height])).toEqual([
      [3, 4, 11, 10],
      [29, 6, 11, 10],
    ]);
  });

  it('leaves a member alone rather than writing off the left edge of the sheet', () => {
    // The same fold with the member flush against the sheet's left edge, so the column the source's
    // extra pixel needs is not on the sheet.
    const drawing = stripes();
    const image = sheetOf(60, 30, [
      { left: 30, top: 4, cells: drawing },
      { left: 29, top: 4, cells: [[INK]] },
      { left: 0, top: 16, cells: drawing },
    ]);

    const { image: snapped, folded } = fold(image, 3);

    expect(folded).toBe(0);
    expect(snapped.data).toEqual(image.data);
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

  it('leaves a member alone rather than growing it to within the sprite gap of a neighbour', () => {
    // The member is a row shorter than the canonical, and a third sprite sits two clear rows below
    // it — further than a gap of 1, so the segmentation counts three. Taking the canonical's
    // silhouette would leave one clear row, which the gap merge folds, and the third sprite would be
    // absorbed into the member. The fold stands down instead. Twenty cells to a side for the reason
    // the wider-member case above gives: it is what makes the pair a pair at a tolerance of 24.
    const image = sheetOf(80, 30, [
      { left: 2, top: 2, cells: block(20, 21, INK) },
      { left: 30, top: 2, cells: block(20, 20, INK) },
      { left: 28, top: 24, cells: block(24, 4, FAR) },
    ]);
    expect(boxesOf(image, 1)).toHaveLength(3);

    const { image: snapped, folded } = fold(image, 24, 1);

    expect(folded).toBe(0);
    expect(snapped.data).toEqual(image.data);
    expect(fold(image, 24, TOUCHING).folded).toBe(1);
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
