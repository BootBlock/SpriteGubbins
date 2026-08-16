import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import { applyPalette } from './applyPalette.ts';
import type { Rgba } from '../types/quantiser.ts';
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

  it('gives every separated region of the sheet a slot of its own', () => {
    // What a variance-minimising search is *for*, stated as the outcome rather than as a race
    // against the algorithm it replaced: five tight, well-separated clusters at deliberately
    // unequal populations, and a budget of exactly five. Each cluster must take one slot, and the
    // colour it contributes must be the one most of its pixels carry rather than its satellite.
    //
    // A search that spent a slot splitting one cluster would have to merge two others to afford
    // it, and this fails on both counts at once — the merged pair loses an entry, and the split
    // one contributes a colour a minority carries.
    const CLUSTERS: readonly Rgba[] = [
      { r: 200, g: 40, b: 40, a: 255 },
      { r: 40, g: 200, b: 40, a: 255 },
      { r: 40, g: 40, b: 200, a: 255 },
      { r: 200, g: 200, b: 40, a: 255 },
      { r: 30, g: 30, b: 30, a: 255 },
    ];
    const clustered = imageFrom(20, 20, (x, y) => {
      const n = y * 20 + x;
      const cluster = CLUSTERS[n % 5] ?? { r: 0, g: 0, b: 0, a: 255 };
      // One pixel in five of each cluster is a satellite three steps away, so every cluster holds
      // two colours with a four-to-one majority between them.
      return n % 25 >= 20 ? { ...cluster, r: cluster.r + 3 } : cluster;
    });

    expect(countColors(clustered)).toBe(10);
    const palette = buildPalette(clustered, 5);
    expect([...palette].sort((left, right) => packColor(left) - packColor(right))).toEqual(
      [...CLUSTERS].sort((left, right) => packColor(left) - packColor(right)),
    );
  });

  it('separates colours the binned pass cannot tell apart, rather than returning a short palette', () => {
    // The coarse pass bins each channel eight steps wide, so a shading ramp finer than that lands
    // in one cell and no cut at that resolution divides it. This is the artwork the app is for —
    // a 200-step grey ramp occupies 26 bins — and without the refinement pass a budget of 64 came
    // back with 26 colours, while raising the budget to 128 changed nothing at all.
    const ramp = imageFrom(20, 10, (x, y) => {
      const n = y * 20 + x;
      return { r: 40 + n, g: 40 + n, b: 40 + n, a: 255 };
    });

    expect(countColors(ramp)).toBe(200);
    expect(buildPalette(ramp, 64)).toHaveLength(64);
    expect(buildPalette(ramp, 128)).toHaveLength(128);
  });

  it('folds the nearest pair when the budget cannot afford every colour, keeping the majority', () => {
    // The other side of the alpha test above. Opacities of one colour survive wherever the budget
    // can afford them; where it cannot, something has to merge, and what merges is the *nearest*
    // pair rather than an arbitrary one. The colour that then speaks for the merged group is the
    // one most of its pixels carry — never an average of the two, which is the promise the whole
    // quantiser makes.
    //
    // Both fixtures carry more colours than the budget, so the search genuinely partitions rather
    // than short-circuiting to "already inside the budget" and keeping everything by default.
    const GREEN = { r: 20, g: 160, b: 60, a: 255 };
    const RED = { r: 200, g: 30, b: 30, a: 255 };
    const BLUE = { r: 30, g: 30, b: 200, a: 255 };
    const WHITE = { r: 240, g: 240, b: 240, a: 255 };

    // Six colours into five slots: the two whites are two steps apart and are much the nearest
    // pair, so they merge, and the teal edge keeps a slot with the alpha it was found at.
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

    // Five colours into four slots. The two greens differ only in opacity, so they are nearest each
    // other by a wide margin and are what merges; the body outnumbers the edge four to one, so the
    // body's full opacity is what survives.
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

  it('reaches the budget even when every colour crowds into one bin', () => {
    // Eight colours inside a single histogram cell — every channel within eight of its neighbours,
    // which is the bin width. The coarse pass cannot divide this at all and returns one box; the
    // refinement is the whole of what produces a palette here, and an exact count is what pins it,
    // since a search that gave up early would still satisfy "at most four".
    const crowded = imageFrom(8, 8, (x, y) => {
      const n = (y * 8 + x) % 8;
      return { r: 200 + n, g: 100, b: 50, a: 255 };
    });

    expect(countColors(crowded)).toBe(8);
    const palette = buildPalette(crowded, 4);
    expect(palette).toHaveLength(4);
    expect(new Set(palette.map(packColor)).size).toBe(4);
  });

  it('keeps an anti-aliased edge at the opacity it was drawn at', () => {
    // The regression this pass exists to prevent, driven the way a returned sheet actually arrives:
    // one colour at a ramp of opacities, which is what a straight-alpha PNG's soft edge is. Alpha is
    // a channel like the other three, so those are five colours and the budget can afford all of
    // them — collapsing them onto whichever opacity carried the most pixels would have
    // `applyPalette` write that entry whole and replace the sprite's fade-out with a hard edge.
    const ALPHAS = [32, 96, 128, 200, 255];
    const softEdge = imageFrom(10, 10, (x, y) => {
      const n = y * 10 + x;
      return { r: 200, g: 100, b: 50, a: ALPHAS[n % 5] ?? 255 };
    });

    const drawn = applyPalette(softEdge, buildPalette(softEdge, 8));
    for (let index = 0; index < ALPHAS.length; index += 1) {
      expect(readPixel(drawn.data, pixelOffset(10, index, 0)).a).toBe(ALPHAS[index]);
    }
  });
});
