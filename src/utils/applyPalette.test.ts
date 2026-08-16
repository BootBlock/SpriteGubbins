import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import { applyPalette } from './applyPalette.ts';
import { colorHistogram, countColors, packColor, readPixel } from './imageData.ts';
import { buildPalette } from './wuQuantiser.ts';

/** 200 pixels, every one a different colour. */
const TWO_HUNDRED_COLORS = imageFrom(20, 10, (x, y) => {
  const n = y * 20 + x;
  return { r: (n * 7) % 256, g: (n * 13) % 256, b: (n * 29) % 256, a: 255 };
});

/** Half opaque, half a fully transparent field still carrying the colour it was keyed from. */
const KEYED = imageFrom(8, 8, (x) =>
  x < 4 ? { r: 10 + x * 20, g: 20, b: 30, a: 255 } : { r: 200, g: 100, b: 50, a: 0 },
);

describe('applyPalette', () => {
  it('draws the image with no colour outside the palette', () => {
    const palette = buildPalette(TWO_HUNDRED_COLORS, 32);
    const applied = applyPalette(TWO_HUNDRED_COLORS, palette);

    const allowed = new Set(palette.map(packColor));
    for (const key of colorHistogram(applied).keys()) {
      expect(allowed.has(key), `${String(key)} is not a palette colour`).toBe(true);
    }
    expect(countColors(applied)).toBe(32);
  });

  it('leaves fully transparent pixels byte for byte as it found them', () => {
    const applied = applyPalette(KEYED, buildPalette(KEYED, 8));
    expect(applied.width).toBe(KEYED.width);

    for (let offset = 0; offset < applied.data.length; offset += 4) {
      const before = readPixel(KEYED.data, offset);
      if (before.a === 0) expect(readPixel(applied.data, offset)).toEqual(before);
    }
  });

  it('keeps the opaque half, rather than passing by wiping the image', () => {
    // Without this, the transparency test above would pass on an `applyPalette` that returned the
    // blank buffer it allocates — every transparent pixel of this fixture is already zero in RGB.
    const applied = applyPalette(KEYED, buildPalette(KEYED, 8));

    for (let offset = 0; offset < applied.data.length; offset += 4) {
      const before = readPixel(KEYED.data, offset);
      if (before.a === 255) expect(readPixel(applied.data, offset)).toEqual(before);
    }
  });
});
