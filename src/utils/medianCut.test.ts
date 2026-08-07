import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import { colorHistogram, countColors, packColor } from './imageData.ts';
import { buildPalette } from './medianCut.ts';

/** 200 pixels, every one a different colour — `r` alone is injective for the first 256 of them. */
const TWO_HUNDRED_COLORS = imageFrom(20, 10, (x, y) => {
  const n = y * 20 + x;
  return { r: (n * 7) % 256, g: (n * 13) % 256, b: (n * 29) % 256, a: 255 };
});

describe('buildPalette', () => {
  it('reduces a known input to exactly the requested number of colours', () => {
    expect(countColors(TWO_HUNDRED_COLORS)).toBe(200);
    expect(buildPalette(TWO_HUNDRED_COLORS, 32)).toHaveLength(32);
    expect(buildPalette(TWO_HUNDRED_COLORS, 64)).toHaveLength(64);
  });

  it('answers the same palette every run', () => {
    // The reason median cut was chosen over k-means. A user re-running a batch gets the same sheet,
    // and this test can assert an exact palette rather than a tolerance.
    expect(buildPalette(TWO_HUNDRED_COLORS, 32)).toEqual(buildPalette(TWO_HUNDRED_COLORS, 32));
  });

  it('chooses colours the image already contained rather than inventing averages', () => {
    const present = new Set(colorHistogram(TWO_HUNDRED_COLORS).keys());
    for (const color of buildPalette(TWO_HUNDRED_COLORS, 32)) {
      expect(present.has(packColor(color))).toBe(true);
    }
  });

  it('leaves an image already inside the budget alone', () => {
    // Reducing further would discard colours nothing asked to lose.
    expect(buildPalette(TWO_HUNDRED_COLORS, 500)).toHaveLength(200);
  });

  it('gives a fully transparent region no palette entry of its own', () => {
    // An empty field describes nothing. Letting it claim slots would spend part of a 32-colour
    // budget on the colour a keyed sheet was cut out from.
    const keyed = imageFrom(8, 8, (x) =>
      x < 4 ? { r: 10 + x * 20, g: 20, b: 30, a: 255 } : { r: 200, g: 100, b: 50, a: 0 },
    );

    const palette = buildPalette(keyed, 8);
    expect(palette).toHaveLength(4);
    expect(palette.every((color) => color.a === 255)).toBe(true);
    expect(palette.some((color) => color.r === 200)).toBe(false);
  });
});
