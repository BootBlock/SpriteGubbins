import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import { applyPalette } from './applyPalette.ts';
import { colorHistogram, countColors, packColor, pixelOffset, readPixel } from './imageData.ts';
import { buildPalette } from './wuQuantiser.ts';

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
    // The reason neither this nor its predecessor is k-means. A user re-running a batch gets the
    // same sheet, and this test can assert an exact palette rather than a tolerance.
    expect(buildPalette(TWO_HUNDRED_COLORS, 32)).toEqual(buildPalette(TWO_HUNDRED_COLORS, 32));
  });

  it('chooses colours the image already contained rather than inventing averages', () => {
    // Wu as published contributes each box's weighted *mean*, which is a colour the sheet does not
    // hold. This is the departure the app requires, and the assertion that holds it.
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

  it('spends its slots where the pixels are, not where the outliers are', () => {
    // The quality claim this algorithm replaced median cut to make, as the case that separates the
    // two. The sheet is a shaded surface — sixteen greens a step apart, carrying 240 of 256 pixels
    // — beside two lone pixels at opposite corners of the colour cube.
    //
    // Splitting by widest *range* reaches for those two outliers first, because they are what
    // stretches every channel; the surface is left sharing slots and its shading collapses.
    // Splitting by the variance a cut *removes* weighs the outliers by the two pixels they are, so
    // the surface keeps its steps. At a budget of six the difference is stark and countable.
    const shaded = imageFrom(16, 16, (x, y) => {
      const n = y * 16 + x;
      if (n === 0) return { r: 255, g: 0, b: 0, a: 255 };
      if (n === 255) return { r: 0, g: 0, b: 255, a: 255 };
      return { r: 20, g: 90 + (n % 16) * 4, b: 40, a: 255 };
    });

    const palette = buildPalette(shaded, 6);
    const greens = palette.filter((color) => color.r === 20 && color.b === 40);
    expect(greens.length).toBeGreaterThanOrEqual(4);
  });

  it('keeps a soft edge that is its own colour, and folds one that is not', () => {
    // The consequence of alpha not being a partition axis, pinned in both directions so neither
    // half can drift unnoticed.
    //
    // A half-opaque *teal* edge over a green body is its own region of the colour cube, so it takes
    // a box and keeps the alpha it was found at. A half-opaque *green* edge over the same green
    // body shares that body's bin, and the body — which far outnumbers it — speaks for the box, so
    // the edge is drawn at full opacity. That second case is the cost this design accepts, and it
    // is a fold toward the sheet's own colour rather than an invented one.
    // Both fixtures carry more colours than the budget, so the search genuinely partitions rather
    // than short-circuiting to "already inside the budget" and keeping everything by default.
    const GREEN = { r: 20, g: 160, b: 60, a: 255 };
    const RED = { r: 200, g: 30, b: 30, a: 255 };
    const BLUE = { r: 30, g: 30, b: 200, a: 255 };
    const WHITE = { r: 240, g: 240, b: 240, a: 255 };

    // Six colours into five boxes: the two whites share a bin and merge, so the teal edge — its own
    // region of the cube — keeps a box, and the entry it contributes carries the alpha it was found
    // at rather than being written opaque.
    const distinct = imageFrom(8, 8, (x) => {
      if (x < 3) return GREEN;
      if (x === 3) return { r: 20, g: 140, b: 160, a: 128 };
      if (x === 4) return RED;
      if (x === 5) return BLUE;
      if (x === 6) return WHITE;
      return { r: 242, g: 240, b: 240, a: 255 };
    });
    expect(countColors(distinct)).toBe(6);
    const distinctPalette = buildPalette(distinct, 5);
    expect(distinctPalette.some((color) => color.a === 128 && color.b === 160)).toBe(true);

    // Five colours into four boxes. The half-opaque green shares the body's bin and is outnumbered
    // by it three to one, so the body speaks for the box and the edge is drawn opaque.
    const sameColor = imageFrom(8, 8, (x) => {
      if (x < 4) return GREEN;
      if (x === 4) return { ...GREEN, a: 128 };
      if (x === 5) return RED;
      if (x === 6) return BLUE;
      return WHITE;
    });
    expect(countColors(sameColor)).toBe(5);
    const folded = applyPalette(sameColor, buildPalette(sameColor, 4));
    expect(readPixel(folded.data, pixelOffset(8, 4, 0))).toEqual(GREEN);
  });

  it('returns what separates rather than padding the list to the budget', () => {
    // Eight colours inside one histogram bin — each channel within eight of its neighbours, which
    // is the bin width. No cut divides them, so the search stops early and the palette is short.
    // Naming the shortfall is the honest answer; repeating a colour to reach the count is not.
    const crowded = imageFrom(8, 8, (x, y) => {
      const n = (y * 8 + x) % 8;
      return { r: 200 + n, g: 100, b: 50, a: 255 };
    });

    expect(countColors(crowded)).toBe(8);
    const palette = buildPalette(crowded, 4);
    expect(palette.length).toBeLessThanOrEqual(4);
    expect(new Set(palette.map(packColor)).size).toBe(palette.length);
  });
});
