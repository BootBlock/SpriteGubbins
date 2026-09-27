import { describe, expect, it } from 'vitest';
import { DUPLICATE_REGISTRATION_REACH } from '../constants/quantiser.ts';
import type { PixelShift, ProfiledSprite, Rgba, SpriteBox } from '../types/quantiser.ts';
import { imageFrom } from '../test/images.ts';
import { profileSprites } from './alphaProfile.ts';
import { FULLY_OPAQUE, FULLY_TRANSPARENT, pixelOffset } from './imageData.ts';
import { registerSprites } from './registerSprites.ts';
import { spriteDistance } from './spriteEquality.ts';

const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };
const INK: Rgba = { r: 20, g: 30, b: 40, a: FULLY_OPAQUE };
const OTHER: Rgba = { r: 200, g: 40, b: 40, a: FULLY_OPAQUE };

/** A transparent sheet with each drawing stamped at its corner, and the box each one fills. */
function sheetOf(stamps: readonly { left: number; top: number; cells: readonly (readonly Rgba[])[] }[]): {
  image: ImageData;
  boxes: SpriteBox[];
  sprites: ProfiledSprite[];
} {
  const image = imageFrom(60, 30, () => CLEAR);
  const boxes = stamps.map(({ left, top, cells }) => {
    for (const [row, line] of cells.entries()) {
      for (const [column, color] of line.entries()) {
        const at = pixelOffset(image.width, left + column, top + row);
        image.data.set([color.r, color.g, color.b, color.a], at);
      }
    }
    return { left, top, width: cells[0]?.length ?? 0, height: cells.length, pixels: 0 };
  });
  return { image, boxes, sprites: profileSprites(image, boxes) };
}

/**
 * Ten columns alternating between two colours, ten rows deep.
 *
 * A drawing whose every cell disagrees with its neighbour, so laying one copy a column off the other
 * scores every cell a whole colour apart — which is what makes a wrong registration impossible to
 * miss, and a right one the only offset that comes under the dial.
 */
function stripes(): Rgba[][] {
  return Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, (_, column) => (column % 2 === 0 ? INK : OTHER)),
  );
}

/** The same drawing with one pixel added outside its left edge, beside its first row. */
function withLeftPixel(cells: readonly (readonly Rgba[])[]): Rgba[][] {
  return cells.map((line, row) => [row === 0 ? (line[0] ?? INK) : CLEAR, ...line]);
}

/** The same drawing with one pixel added above its top edge, over its first column. */
function withTopPixel(cells: readonly (readonly Rgba[])[]): Rgba[][] {
  const width = cells[0]?.length ?? 0;
  return [
    Array.from({ length: width }, (_, column) => (column === 0 ? (cells[0]?.[0] ?? INK) : CLEAR)),
    ...cells.map((line) => [...line]),
  ];
}

describe('registerSprites', () => {
  it('lays two copies of one drawing corner to corner', () => {
    const { image, sprites } = sheetOf([
      { left: 2, top: 2, cells: stripes() },
      { left: 30, top: 2, cells: stripes() },
    ]);

    expect(registerSprites(image, sprites[0], sprites[1])).toEqual({ distance: 0, shift: { x: 0, y: 0 } });
  });

  it('finds the drawing a column in from a corner that an extra left pixel moved', () => {
    // The copy's corner sits a column left of its drawing, so the drawing is where the corner would
    // be if it had not moved: the copy is laid a column left of the first sprite's corner.
    const { image, boxes, sprites } = sheetOf([
      { left: 2, top: 2, cells: stripes() },
      { left: 30, top: 2, cells: withLeftPixel(stripes()) },
    ]);

    const { distance, shift } = registerSprites(image, sprites[0], sprites[1]);

    expect(shift).toEqual({ x: -1, y: 0 });
    // One cell present on one side only, at 255, over the hundred and one cells either covers.
    expect(distance).toBeCloseTo(255 / 101, 3);
    expect(spriteDistance(image, boxAt(boxes, 0), boxAt(boxes, 1), { x: 0, y: 0 })).toBeGreaterThan(24);
  });

  it('finds the drawing a row down from a corner that an extra top pixel moved', () => {
    const { image, sprites } = sheetOf([
      { left: 2, top: 2, cells: stripes() },
      { left: 30, top: 2, cells: withTopPixel(stripes()) },
    ]);

    expect(registerSprites(image, sprites[0], sprites[1]).shift).toEqual({ x: 0, y: -1 });
  });

  it('settles a tie at the corners, where the colours cannot say which offset is the drawing', () => {
    // A flat block and one a column wider overlap completely at two offsets and score the same at
    // both, so the answer is the corner rather than whichever candidate was visited first.
    const flat = (width: number): Rgba[][] =>
      Array.from({ length: 20 }, () => Array.from({ length: width }, () => INK));
    const { image, sprites } = sheetOf([
      { left: 2, top: 2, cells: flat(20) },
      { left: 30, top: 2, cells: flat(21) },
    ]);

    expect(registerSprites(image, sprites[0], sprites[1]).shift).toEqual({ x: 0, y: 0 });
  });

  it('returns the corners and no distance where no offset comes under the limit', () => {
    const { image, sprites } = sheetOf([
      { left: 2, top: 2, cells: stripes() },
      { left: 30, top: 2, cells: withLeftPixel(stripes()) },
    ]);

    expect(registerSprites(image, sprites[0], sprites[1], 1)).toEqual({
      distance: Infinity,
      shift: { x: 0, y: 0 },
    });
  });

  it('agrees with every offset measured in full, with nothing abandoned early', () => {
    // The search hands each candidate after the first the best mean so far as its limit, and skips
    // one whose alpha profiles already rule it out. Either, one cell or one bound too eager, would
    // return a worse offset with nothing to say so. The oracle is every offset in the reach measured
    // with no limit at all, over pairs of random drawings with partial alpha, holes and different
    // extents, at limits from the dial's floor to none.
    let state = 7;
    const next = (below: number): number => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return Math.floor((state / 4_294_967_296) * below);
    };
    const drawing = (): Rgba[][] => {
      const width = 3 + next(6);
      return Array.from({ length: 3 + next(6) }, () =>
        Array.from({ length: width }, () =>
          next(4) === 0 ? CLEAR : { r: next(4) * 60, g: 40, b: 40, a: next(3) === 0 ? 128 : FULLY_OPAQUE },
        ),
      );
    };
    const reach = DUPLICATE_REGISTRATION_REACH;
    const order: PixelShift[] = [];
    for (let y = -reach; y <= reach; y += 1) {
      for (let x = -reach; x <= reach; x += 1) order.push({ x, y });
    }
    order.sort((one, other) => one.x ** 2 + one.y ** 2 - (other.x ** 2 + other.y ** 2));

    for (let pair = 0; pair < 200; pair += 1) {
      const base = drawing();
      const copy = next(2) === 0 ? base.map((line) => [...line]) : drawing();
      const row = copy[next(copy.length)];
      if (row !== undefined) row[next(row.length)] = CLEAR;
      const { image, boxes, sprites } = sheetOf([
        { left: 2, top: 2, cells: base },
        { left: 30, top: 2, cells: copy },
      ]);
      const every = order.map((shift) => spriteDistance(image, boxAt(boxes, 0), boxAt(boxes, 1), shift));
      for (const limit of [0, 6, 12, 24, Infinity]) {
        const admitted = every.map((distance) => (distance <= limit ? distance : Infinity));
        const best = Math.min(...admitted);
        const expected = best === Infinity ? { x: 0, y: 0 } : order[admitted.indexOf(best)];
        expect(
          registerSprites(image, sprites[0], sprites[1], limit),
          `pair ${String(pair)} at ${String(limit)}`,
        ).toEqual({
          distance: best,
          shift: expected,
        });
      }
    }
  });
});

/** The box at `index`, or a failure naming the fixture rather than a type assertion. */
function boxAt(boxes: readonly SpriteBox[], index: number): SpriteBox {
  const box = boxes[index];
  if (box === undefined) throw new Error(`the fixture needs a box at ${String(index)}.`);
  return box;
}
