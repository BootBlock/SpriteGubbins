import { describe, expect, it } from 'vitest';
import { createImage, FULLY_OPAQUE, packedColorAt, pixelOffset, readPixel, writePixel } from './imageData.ts';
import { outlineExpansion } from './outlineExpansion.ts';

const LIGHT = { r: 240, g: 240, b: 240, a: FULLY_OPAQUE };
const DARK = { r: 20, g: 20, b: 20, a: FULLY_OPAQUE };
const CLEAR = { r: 0, g: 0, b: 0, a: 0 };

/** A square of `ground` with a one-pixel vertical line of `mark` down its middle column. */
function ruled(size: number, ground: typeof LIGHT, mark: typeof LIGHT): ImageData {
  const image = createImage(size, size);
  const middle = size >> 1;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      writePixel(image.data, pixelOffset(size, x, y), x === middle ? mark : ground);
    }
  }
  return image;
}

/** The middle row of an image, as which columns hold `colour`. */
function columnsHolding(image: ImageData, colour: typeof LIGHT): number[] {
  const y = image.height >> 1;
  const held: number[] = [];
  for (let x = 0; x < image.width; x += 1) {
    const pixel = readPixel(image.data, pixelOffset(image.width, x, y));
    if (pixel.r === colour.r && pixel.g === colour.g && pixel.b === colour.b) held.push(x);
  }
  return held;
}

describe('outlineExpansion', () => {
  it('returns the sheet unchanged at a thickness of zero', () => {
    const image = ruled(9, LIGHT, DARK);
    expect(Array.from(outlineExpansion(image, 3, 0).data)).toEqual(Array.from(image.data));
  });

  it('grows a one-pixel dark contour to three, which is enough to win its cell', () => {
    // The failure the pass exists for: at a grid of 3, a single dark column is one pixel in nine of
    // the cell it crosses, and every reading resolves that cell to the ground. Three pixels of nine
    // is a third of the cell, and the line rescue can see it.
    const expanded = outlineExpansion(ruled(9, LIGHT, DARK), 3, 1);
    expect(columnsHolding(expanded, DARK)).toEqual([3, 4, 5]);
  });

  it('grows a one-pixel bright trim on a dark ground, by reading the polarity the other way', () => {
    // The same sheet inverted. A pass that only ever darkened would erase this line instead of
    // rescuing it, which is what makes the polarity reading the point rather than an embellishment.
    const expanded = outlineExpansion(ruled(9, DARK, LIGHT), 3, 1);
    expect(columnsHolding(expanded, LIGHT)).toEqual([3, 4, 5]);
  });

  it('grows further at a greater thickness', () => {
    expect(columnsHolding(outlineExpansion(ruled(15, LIGHT, DARK), 3, 2), DARK)).toEqual([5, 6, 7, 8, 9]);
  });

  it('produces only colours the sheet already contained', () => {
    // The promise the Quantise panel makes to the reader about the standard vote. A per-channel
    // erosion — which is what the reference implementation performs — breaks it silently, by
    // assembling a colour from three different pixels.
    const image = ruled(
      24,
      { r: 200, g: 120, b: 40, a: FULLY_OPAQUE },
      { r: 12, g: 60, b: 180, a: FULLY_OPAQUE },
    );
    const before = new Set<number>();
    for (let offset = 0; offset < image.data.length; offset += 4) {
      before.add(packedColorAt(image.data, offset));
    }

    const expanded = outlineExpansion(image, 4, 2);
    for (let offset = 0; offset < expanded.data.length; offset += 4) {
      expect(before.has(packedColorAt(expanded.data, offset))).toBe(true);
    }
  });

  it('leaves the silhouette exactly where the key left it', () => {
    // Alpha is never morphed, so the pass cannot grow the artwork into the field the reader deleted
    // — nor erode a contour off the edge of the sprite.
    const image = ruled(15, LIGHT, DARK);
    for (let y = 0; y < 15; y += 1) {
      for (let x = 0; x < 15; x += 1) {
        if (x < 4 || x > 10 || y < 4 || y > 10) writePixel(image.data, pixelOffset(15, x, y), CLEAR);
      }
    }

    const expanded = outlineExpansion(image, 3, 2);
    for (let offset = 3; offset < image.data.length; offset += 4) {
      expect(expanded.data[offset]).toBe(image.data[offset]);
    }
  });

  it('never hands a cleared pixel’s bytes to the artwork beside it', () => {
    // The cleared pixels here are pure black, which would win every erosion if the sentinel did not
    // keep them out — and the sprite would come back with a black halo eaten into its edge.
    const image = createImage(9, 9);
    for (let y = 0; y < 9; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const inside = x >= 3 && x <= 5 && y >= 3 && y <= 5;
        writePixel(image.data, pixelOffset(9, x, y), inside ? LIGHT : CLEAR);
      }
    }

    const expanded = outlineExpansion(image, 3, 1);
    for (let y = 3; y <= 5; y += 1) {
      for (let x = 3; x <= 5; x += 1) {
        expect(readPixel(expanded.data, pixelOffset(9, x, y))).toEqual(LIGHT);
      }
    }
  });

  it('is deterministic — the same sheet expands to the same bytes twice', () => {
    const image = ruled(21, LIGHT, DARK);
    expect(Array.from(outlineExpansion(image, 4, 2).data)).toEqual(
      Array.from(outlineExpansion(image, 4, 2).data),
    );
  });

  it('leaves a flat sheet alone, whichever way its polarity reads', () => {
    for (const colour of [LIGHT, DARK]) {
      const image = ruled(12, colour, colour);
      expect(Array.from(outlineExpansion(image, 3, 2).data)).toEqual(Array.from(image.data));
    }
  });
});
