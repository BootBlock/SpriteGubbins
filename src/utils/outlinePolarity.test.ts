import { describe, expect, it } from 'vitest';
import { createImage, FULLY_OPAQUE, pixelOffset, writePixel } from './imageData.ts';
import { outlinePolarity, polarityAt } from './outlinePolarity.ts';

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

describe('outlinePolarity', () => {
  it('reads a dark line on a light ground as the dark side growing', () => {
    const field = outlinePolarity(ruled(12, LIGHT, DARK), 4);
    // Positive wherever the line is: it is the minority mark on a light ground, so it is what
    // expands. The middle column and the blocks either side of it all see it.
    expect(polarityAt(field, 6, 6)).toBeGreaterThan(0);
    expect(polarityAt(field, 5, 6)).toBeGreaterThan(0);
  });

  it('reads a light line on a dark ground as the bright side growing', () => {
    const field = outlinePolarity(ruled(12, DARK, LIGHT), 4);
    expect(polarityAt(field, 6, 6)).toBeLessThan(0);
    expect(polarityAt(field, 5, 6)).toBeLessThan(0);
  });

  it('grows whichever tone is locally in the minority, which is what a contour is', () => {
    // The same two tones, swapped. There is no prior about which colour a ground is: the score is
    // decided entirely by which of the two reaches further from the local median, and the median is
    // the majority. This is the property the reference's ground term overrides, and the reason it
    // is not carried over.
    expect(polarityAt(outlinePolarity(ruled(12, LIGHT, DARK), 4), 6, 6)).toBeGreaterThan(0);
    expect(polarityAt(outlinePolarity(ruled(12, DARK, LIGHT), 4), 6, 6)).toBeLessThan(0);
  });

  it('scores a flat neighbourhood at zero, where neither side has anywhere to reach', () => {
    // Nothing is drawn on it, so there is nothing to grow. The pass resolves the tie towards
    // erosion, which on a region of one colour changes nothing at all.
    expect(polarityAt(outlinePolarity(ruled(12, LIGHT, LIGHT), 4), 6, 6)).toBe(0);
    expect(polarityAt(outlinePolarity(ruled(12, DARK, DARK), 4), 6, 6)).toBe(0);
  });

  it('measures the ground, not the mark — a median rather than a mean', () => {
    // One dark column in twelve drags a mean well down and leaves a median untouched. Were the score
    // built on a mean, a contour dark enough would pull the ground down to meet it and read as the
    // majority — which is to say the pass would stop recognising the very thing it is looking for.
    const marked = outlinePolarity(ruled(12, LIGHT, DARK), 4);
    const plain = outlinePolarity(ruled(12, LIGHT, LIGHT), 4);
    expect(polarityAt(marked, 6, 6)).toBeGreaterThan(polarityAt(plain, 6, 6));
  });

  it('leaves a lattice point NaN where its whole window is transparent', () => {
    const image = createImage(8, 8);
    for (let offset = 0; offset < image.data.length; offset += 4) writePixel(image.data, offset, CLEAR);
    const field = outlinePolarity(image, 4);
    expect([...field.scores].every((score) => Number.isNaN(score))).toBe(true);
    // And the reader answers a neutral zero rather than propagating the NaN into the pass.
    expect(polarityAt(field, 3, 3)).toBe(0);
  });

  it('ignores transparent pixels when reading the ground', () => {
    // The same dark line, once on a light ground and once on a light ground surrounded by cleared
    // pixels. If the cleared pixels counted, their zero bytes would read as black and flip the
    // ground the line is measured against.
    const solid = ruled(12, LIGHT, DARK);
    const keyed = ruled(12, LIGHT, DARK);
    for (let y = 0; y < 12; y += 1) {
      for (let x = 0; x < 12; x += 1) {
        if (x < 3 || x > 8) writePixel(keyed.data, pixelOffset(12, x, y), CLEAR);
      }
    }
    const from = outlinePolarity(solid, 4);
    const to = outlinePolarity(keyed, 4);
    expect(polarityAt(to, 6, 6)).toBeCloseTo(polarityAt(from, 6, 6), 5);
  });

  it('interpolates between lattice points rather than stepping at every block edge', () => {
    // One dark mark, so a single lattice point scores and its neighbours do not. A block-constant
    // field would hold the point's own score flat across its block and drop to zero at the edge;
    // an interpolated one falls off across the gap, so the values between the two are strictly
    // between the two.
    const image = createImage(24, 24);
    for (let y = 0; y < 24; y += 1) {
      for (let x = 0; x < 24; x += 1) writePixel(image.data, pixelOffset(24, x, y), LIGHT);
    }
    writePixel(image.data, pixelOffset(24, 13, 13), DARK);

    const field = outlinePolarity(image, 4);
    const peak = polarityAt(field, 13, 13);
    expect(peak).toBeGreaterThan(0);
    const across = Array.from({ length: 8 }, (_, step) => polarityAt(field, 13 + step, 13));
    const falling = across.filter((score, index) => index === 0 || score <= (across[index - 1] ?? 0));
    expect(falling.length).toBe(across.length);
    expect(new Set(across).size).toBeGreaterThan(2);
  });
});
