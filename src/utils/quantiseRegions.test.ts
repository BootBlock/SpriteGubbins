import { describe, expect, it } from 'vitest';
import { channels, imageFrom } from '../test/images.ts';
import { DITHER_PATTERNS, VOTE_METHODS } from '../types/quantiser.ts';
import type { QuantiseSettings, Rgba } from '../types/quantiser.ts';
import { colorHistogram } from './imageData.ts';
import { quantiseImage, quantiseRegions } from './quantiseImage.ts';
import { quantisePrologue } from './quantisePrologue.ts';

/** The pipeline at a grid of 1 with every optional pass off, and `overrides` written over it. */
function settings(overrides: Partial<QuantiseSettings> = {}): QuantiseSettings {
  return {
    grid: 1,
    key: null,
    silhouetteThreshold: 0,
    vote: 'DOMINANT',
    lineStrength: 1.5,
    trimStrength: 0,
    inkThreshold: 64,
    fillCleanup: 0,
    cleanupPasses: 1,
    spriteGap: 1,
    symmetry: 'OFF',
    symmetryTolerance: 8,
    symmetryConfidence: 90,
    duplicateTolerance: 0,
    duplicateSnap: false,
    frameAlignment: 'OFF',
    frameDriftTolerance: 0,
    antiAlias: 'OFF',
    antiAliasThreshold: 24,
    antiAliasStrength: 100,
    antiAliasRun: 2,
    antiAliasPalette: 'SNAP',
    dither: 'NONE',
    outlineExpansion: 0,
    colorMerge: 0,
    reduction: null,
    ...overrides,
  };
}

/** Each region of `images` quantised together, as the regions of one sheet. */
function together(images: readonly ImageData[], tuning: QuantiseSettings): readonly ImageData[] {
  return quantiseRegions(
    images.map((image) => quantisePrologue(image, tuning)),
    tuning,
  );
}

/** Each of `images` quantised on its own, as a sheet of its own. */
function alone(images: readonly ImageData[], tuning: QuantiseSettings): readonly ImageData[] {
  return images.map((image) => quantiseImage(image, tuning).image);
}

/** How many distinct colours the images hold between them. */
function colorsAcross(images: readonly ImageData[]): number {
  return new Set(images.flatMap((image) => [...colorHistogram(image).keys()])).size;
}

const shade = (r: number, g: number, b: number): Rgba => ({ r, g, b, a: 255 });

/** Stripes of four shades, one a column, so a budget of two has a real choice to make. */
const stripes = (width: number, height: number, shades: readonly Rgba[]) =>
  imageFrom(width, height, (x) => shades[x % shades.length] ?? shade(0, 0, 0));

const REDS = [shade(120, 20, 20), shade(160, 30, 30), shade(200, 40, 40), shade(240, 50, 50)];
const BLUES = [shade(20, 20, 120), shade(30, 30, 160), shade(40, 40, 200), shade(50, 50, 240)];

/** A busy region of every colour it can hold, so the cleanup and the anti-aliasing both find work. */
const busy = (width: number, height: number, seed: number) =>
  imageFrom(width, height, (x, y) => {
    const n = (x * 7 + y * 13 + seed) % 5;
    return shade(40 + n * 45, 200 - n * 30, 60 + ((x + y) % 2) * 40);
  });

describe('quantiseRegions', () => {
  const budget = { kind: 'MAX_COLORS' as const, maxColors: 2 };

  it.each(VOTE_METHODS)(
    'holds the regions of a budgeted sheet to the budget between them under %s',
    (vote) => {
      // The defect this pins: run one at a time, each region chose a palette of its own, so a budget of
      // two came back as four colours across a red region and a blue one. The sheet has one palette.
      const regions = [stripes(8, 8, REDS), stripes(8, 8, BLUES)];
      const tuning = settings({ vote, reduction: budget });

      expect(colorsAcross(alone(regions, tuning))).toBe(4);
      expect(colorsAcross(together(regions, tuning))).toBeLessThanOrEqual(2);
    },
  );

  it.each(DITHER_PATTERNS.filter((pattern) => pattern !== 'NONE'))(
    'holds the regions of a budgeted sheet to the budget between them under %s',
    (dither) => {
      const regions = [stripes(8, 8, REDS), stripes(8, 8, BLUES)];

      expect(colorsAcross(together(regions, settings({ dither, reduction: budget })))).toBeLessThanOrEqual(2);
    },
  );

  it('merges the regions’ colours by how often each occurs across all of them', () => {
    // Two shades within the merge's reach. The first region is mostly the one and the second mostly
    // the other, so alone each keeps its own majority; across both, the first is the commoner and
    // takes every pixel of the second, which is what the sheet's own merge would do.
    const common = shade(100, 100, 100);
    const rare = shade(104, 100, 100);
    const regions = [
      imageFrom(10, 10, (x, y) => (y * 10 + x < 90 ? common : rare)),
      imageFrom(10, 10, (x, y) => (y * 10 + x < 60 ? rare : common)),
    ];
    const tuning = settings({ colorMerge: 12 });

    expect(colorsAcross(alone(regions, tuning))).toBe(2);
    expect(colorsAcross(together(regions, tuning))).toBe(1);
  });

  it.each([
    {
      case: 'the cleanup and the anti-aliasing',
      tuning: settings({ fillCleanup: 48, cleanupPasses: 2, antiAlias: 'BOTH' }),
    },
    {
      case: 'a dither against a channel depth',
      tuning: settings({ dither: 'BAYER_4', reduction: { kind: 'CHANNEL_DEPTH', bitsPerChannel: 2 } }),
    },
  ])('changes nothing a region does not share with another under $case', ({ tuning }) => {
    // Neither setting reads the sheet as a whole, so each region must come back exactly as it would
    // alone — which is what shows the stack's border reads as the edge of an image, and its pitch
    // keeps a dither's pattern where each region would have it.
    const regions = [busy(12, 9, 0), busy(7, 11, 3), busy(10, 5, 1)];

    expect(together(regions, tuning).map(channels)).toEqual(alone(regions, tuning).map(channels));
  });

  it('quantises one region exactly as the sheet it is', () => {
    const tuning = settings({
      reduction: { kind: 'MAX_COLORS', maxColors: 3 },
      colorMerge: 12,
      fillCleanup: 24,
      dither: 'BAYER_4',
      antiAlias: 'BOTH',
    });
    const sheet = busy(12, 9, 2);

    expect(together([sheet], tuning).map(channels)).toEqual(alone([sheet], tuning).map(channels));
  });
});
