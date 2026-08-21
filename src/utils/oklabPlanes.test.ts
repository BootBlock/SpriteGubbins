import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import { srgbToOklab } from './oklab.ts';
import { CHROMA_OFFSET, oklabPlanes } from './oklabPlanes.ts';

describe('oklabPlanes', () => {
  it('reads one value per pixel per axis, in row-major order', () => {
    const image = imageFrom(3, 2, (x, y) => ({ r: x * 90, g: y * 120, b: 40, a: 255 }));

    const planes = oklabPlanes(image);

    expect(planes.L).toHaveLength(6);
    const expected = srgbToOklab(90, 120, 40);
    expect(planes.L[4]).toBeCloseTo(expected.L, 10);
    expect(planes.a[4]).toBeCloseTo(CHROMA_OFFSET + expected.a, 10);
    expect(planes.b[4]).toBeCloseTo(CHROMA_OFFSET + expected.b, 10);
  });

  it('separates two hues that share a lightness', () => {
    // The property the whole three-plane arrangement exists for: a lightness-only reading cannot
    // tell these apart, so a score built on one would let a palette be discarded for nothing.
    const green = oklabPlanes(imageFrom(1, 1, () => ({ r: 0, g: 130, b: 60, a: 255 })));
    const blue = oklabPlanes(imageFrom(1, 1, () => ({ r: 0, g: 110, b: 210, a: 255 })));

    expect(Math.abs((green.L[0] ?? 0) - (blue.L[0] ?? 0))).toBeLessThan(5);
    expect(Math.abs((green.b[0] ?? 0) - (blue.b[0] ?? 0))).toBeGreaterThan(20);
  });

  it('keeps both chroma axes inside the range the lightness axis occupies', () => {
    // What the offset is for: one dynamic range covers all three, so the same stabilising constants
    // are the same fraction of each.
    const gamut = imageFrom(64, 64, (x, y) => ({ r: x * 4, g: y * 4, b: (x * y) % 256, a: 255 }));

    const planes = oklabPlanes(gamut);

    for (const plane of [planes.L, planes.a, planes.b]) {
      for (const value of plane) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(255);
      }
    }
  });

  it('reads a cleared pixel as unlit and neutral, whatever colour is left under it', () => {
    // A keyed sheet's transparent pixels keep whatever the key colour was, so reading them would
    // report structure that nothing on screen has.
    const magenta = oklabPlanes(imageFrom(1, 1, () => ({ r: 255, g: 0, b: 255, a: 0 })));
    const black = oklabPlanes(imageFrom(1, 1, () => ({ r: 0, g: 0, b: 0, a: 0 })));

    expect([magenta.L[0], magenta.a[0], magenta.b[0]]).toEqual([0, CHROMA_OFFSET, CHROMA_OFFSET]);
    expect([black.L[0], black.a[0], black.b[0]]).toEqual([0, CHROMA_OFFSET, CHROMA_OFFSET]);
  });

  it('scales a half-opaque pixel halfway toward unlit and neutral', () => {
    const half = oklabPlanes(imageFrom(1, 1, () => ({ r: 200, g: 40, b: 40, a: 128 })));
    const opaque = srgbToOklab(200, 40, 40);
    const share = 128 / 255;

    expect(half.L[0]).toBeCloseTo(opaque.L * share, 10);
    expect(half.a[0]).toBeCloseTo(CHROMA_OFFSET + opaque.a * share, 10);
  });
});
