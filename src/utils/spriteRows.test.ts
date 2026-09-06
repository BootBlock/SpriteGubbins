import { describe, expect, it } from 'vitest';
import type { SpriteBox } from '../types/quantiser.ts';
import { spriteReadingOrder, spriteRows } from './spriteRows.ts';

/** One box, written as the four numbers a row's shape is argued about in. */
function box(left: number, top: number, width: number, height: number): SpriteBox {
  return { left, top, width, height, pixels: width * height };
}

/** Every box's left edge and top edge, which is what an ordering claim is made about. */
function positions(boxes: readonly SpriteBox[]): readonly (readonly [number, number])[] {
  return boxes.map((each) => [each.left, each.top] as const);
}

describe('spriteRows', () => {
  it('keeps a row whose sprites are not flush in left-to-right order', () => {
    // The defect this file exists for: three sprites plainly on one line, the middle one drawn a
    // pixel lower. Sorting on the exact top coordinate puts it last, so the pack and the manifest
    // named the third sprite with the second one's name — five of fifteen on `armour.png`.
    const rows = spriteRows([box(2, 0, 4, 4), box(12, 1, 4, 4), box(22, 0, 4, 4)]);

    expect(rows).toHaveLength(1);
    expect(positions(rows[0]?.boxes ?? [])).toEqual([
      [2, 0],
      [12, 1],
      [22, 0],
    ]);
  });

  it('states the band a row occupies, which is the deepest of its members rather than the first', () => {
    const rows = spriteRows([box(0, 4, 4, 4), box(10, 2, 4, 10)]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.top).toBe(2);
    expect(rows[0]?.bottom).toBe(12);
  });

  it('holds a row together through a tall sprite in the middle of it', () => {
    // The left and right sprites share no row of the sheet with each other; both overlap the tall
    // one between them, and the band grows to cover all three. A rule keyed on the first box alone
    // would open a third row here.
    const rows = spriteRows([box(0, 0, 4, 4), box(10, 2, 4, 12), box(20, 10, 4, 4)]);

    expect(rows).toHaveLength(1);
    expect(positions(rows[0]?.boxes ?? [])).toEqual([
      [0, 0],
      [10, 2],
      [20, 10],
    ]);
  });

  it('opens a new row for a sprite that clears the band above it', () => {
    const rows = spriteRows([box(0, 0, 4, 4), box(10, 0, 4, 4), box(0, 20, 4, 4)]);

    expect(rows.map((row) => positions(row.boxes))).toEqual([
      [
        [0, 0],
        [10, 0],
      ],
      [[0, 20]],
    ]);
  });

  it('answers the same whatever order it was handed the boxes in', () => {
    // The property that lets `mergeNearby` and `sheetLayout` share it: neither may have to know how
    // the other ordered its argument, which is how the app came to hold two answers to this.
    const boxes = [box(2, 0, 4, 4), box(12, 1, 4, 4), box(22, 0, 4, 4), box(0, 20, 4, 4)];
    const shuffled = [boxes[3], boxes[1], boxes[2], boxes[0]].filter(
      (each): each is SpriteBox => each !== undefined,
    );

    expect(spriteReadingOrder(shuffled)).toEqual(spriteReadingOrder(boxes));
  });

  it('leaves the array it was handed in the order it was handed it', () => {
    // `sheetLayout` is given `SpriteSegmentation`'s own box array whenever a download is written at
    // 1× — `scaleBoxes` returns its argument unchanged there — and that array is what the store
    // holds and the preview rings. Sorting in place would reorder the screen from inside a writer.
    const boxes = [box(12, 1, 4, 4), box(2, 0, 4, 4)];
    const handed = [...boxes];

    spriteReadingOrder(boxes);
    spriteRows(boxes);

    expect(boxes).toStrictEqual(handed);
  });

  it('returns the boxes it was handed, by reference', () => {
    // One set of box objects travels the whole pipeline, which is what lets `frameAlignment`
    // exclude a frame's own box from the sheet's by object identity.
    const one = box(2, 0, 4, 4);
    const two = box(12, 1, 4, 4);

    expect(spriteReadingOrder([two, one])[0]).toBe(one);
    expect(spriteRows([two, one])[0]?.boxes[1]).toBe(two);
  });

  it('has no rows to report on a sheet with no sprites', () => {
    expect(spriteRows([])).toEqual([]);
    expect(spriteReadingOrder([])).toEqual([]);
  });
});
