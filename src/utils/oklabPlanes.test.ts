import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import { srgbToOklab } from './oklab.ts';
import { CHROMA_OFFSET, CLEARED_LIGHTNESS, oklabPlanes } from './oklabPlanes.ts';

describe('oklabPlanes', () => {
  it('reads one value per pixel per axis, in row-major order', () => {
    const image = imageFrom(3, 2, (x, y) => ({ r: x * 90, g: y * 120, b: 40, a: 255 }));

    const planes = oklabPlanes(image);

    expect(planes.L).toHaveLength(6);
    const expected = srgbToOklab(90, 120, 40);
    expect(planes.L[4]).toBeCloseTo(expected.L, 10);
    expect(planes.a[4]).toBeCloseTo(CHROMA_OFFSET + expected.a, 10);
    expect(planes.b[4]).toBeCloseTo(CHROMA_OFFSET + expected.b, 10);
    expect(planes.alpha[4]).toBe(255);
  });

  it('separates two hues that share a lightness', () => {
    // The property the whole three-plane arrangement exists for: a lightness-only reading cannot
    // tell these apart, so a score built on one would let a palette be discarded for nothing.
    const green = oklabPlanes(imageFrom(1, 1, () => ({ r: 0, g: 130, b: 60, a: 255 })));
    const blue = oklabPlanes(imageFrom(1, 1, () => ({ r: 0, g: 110, b: 210, a: 255 })));

    expect(Math.abs((green.L[0] ?? 0) - (blue.L[0] ?? 0))).toBeLessThan(5);
    expect(Math.abs((green.b[0] ?? 0) - (blue.b[0] ?? 0))).toBeGreaterThan(20);
  });

  it('keeps both chroma axes and coverage inside the range the lightness axis occupies', () => {
    // What the offset is for: one dynamic range covers all four, so the same stabilising constants
    // are the same fraction of each.
    const gamut = imageFrom(64, 64, (x, y) => ({ r: x * 4, g: y * 4, b: (x * y) % 256, a: (x + y) * 2 }));

    const planes = oklabPlanes(gamut);

    // Each plane's extremes, which bound every value in it — one pair of assertions per plane rather
    // than two per pixel.
    for (const [axis, plane] of Object.entries(planes)) {
      let lowest = Number.POSITIVE_INFINITY;
      let highest = Number.NEGATIVE_INFINITY;
      for (const value of plane) {
        lowest = Math.min(lowest, value);
        highest = Math.max(highest, value);
      }
      expect(lowest, axis).toBeGreaterThanOrEqual(0);
      expect(highest, axis).toBeLessThanOrEqual(255);
    }
  });

  it('reads a cleared pixel as one neutral colour, whatever colour is left under it', () => {
    // A keyed sheet's transparent pixels keep whatever the key colour was, so reading them would
    // report structure that nothing on screen has.
    const magenta = oklabPlanes(imageFrom(1, 1, () => ({ r: 255, g: 0, b: 255, a: 0 })));
    const black = oklabPlanes(imageFrom(1, 1, () => ({ r: 0, g: 0, b: 0, a: 0 })));

    for (const cleared of [magenta, black]) {
      expect([cleared.L[0], cleared.a[0], cleared.b[0], cleared.alpha[0]]).toEqual([
        CLEARED_LIGHTNESS,
        CHROMA_OFFSET,
        CHROMA_OFFSET,
        0,
      ]);
    }
  });

  it('tells a cleared pixel from an opaque black one', () => {
    // The defect this replaced: both used to land on unlit and neutral, so deleting a black outline
    // to transparency changed nothing any reader of these planes could see.
    const cleared = oklabPlanes(imageFrom(1, 1, () => ({ r: 0, g: 0, b: 0, a: 0 })));
    const black = oklabPlanes(imageFrom(1, 1, () => ({ r: 0, g: 0, b: 0, a: 255 })));

    expect(Math.abs((cleared.L[0] ?? 0) - (black.L[0] ?? 0))).toBeGreaterThan(100);
    expect(Math.abs((cleared.alpha[0] ?? 0) - (black.alpha[0] ?? 0))).toBe(255);
  });

  it('takes a half-covered pixel halfway toward the neutral, and reads its coverage apart', () => {
    const half = oklabPlanes(imageFrom(1, 1, () => ({ r: 200, g: 40, b: 40, a: 128 })));
    const opaque = srgbToOklab(200, 40, 40);
    const share = 128 / 255;

    expect(half.L[0]).toBeCloseTo(CLEARED_LIGHTNESS + (opaque.L - CLEARED_LIGHTNESS) * share, 10);
    expect(half.a[0]).toBeCloseTo(CHROMA_OFFSET + opaque.a * share, 10);
    expect(half.alpha[0]).toBe(128);
  });
});
