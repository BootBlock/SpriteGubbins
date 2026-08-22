import { describe, expect, it } from 'vitest';
import {
  linearToByte,
  srgbToLinear,
  type MutableOklab,
  oklabToSrgb,
  oklchToOklab,
  srgbToOklab,
  srgbToOklabInto,
} from './oklab.ts';

/**
 * The straight distance between two byte colours, as every gate that imports this module takes it.
 */
function distance(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  const x = srgbToOklab(a[0], a[1], a[2]);
  const y = srgbToOklab(b[0], b[1], b[2]);
  return Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b);
}

describe('srgbToOklab', () => {
  it('matches Ottosson’s published space, so a moved matrix digit cannot pass as a tweak', () => {
    // The sRGB primaries as every reference implementation converts them, scaled by 255. These are
    // the *definition* being pinned: a wrong digit in either matrix moves these far past the
    // tolerance, while a legitimate refactor of the arithmetic moves them not at all.
    const red = srgbToOklab(255, 0, 0);
    expect(red.L).toBeCloseTo(160.13, 1);
    expect(red.a).toBeCloseTo(57.34, 1);
    expect(red.b).toBeCloseTo(32.09, 1);

    const green = srgbToOklab(0, 255, 0);
    expect(green.L).toBeCloseTo(220.94, 1);
    expect(green.a).toBeCloseTo(-59.64, 1);
    expect(green.b).toBeCloseTo(45.77, 1);

    const blue = srgbToOklab(0, 0, 255);
    expect(blue.L).toBeCloseTo(115.26, 1);
    expect(blue.a).toBeCloseTo(-8.28, 1);
    expect(blue.b).toBeCloseTo(-79.44, 1);
  });

  it('runs black to white along 0 to 255, which is the scale every dial is calibrated in', () => {
    const black = srgbToOklab(0, 0, 0);
    expect(black.L).toBe(0);
    expect(black.a).toBe(0);
    expect(black.b).toBe(0);

    // Not exactly 255, because Ottosson's matrix rows do not sum to exactly one — the same fact
    // `keyDistance.ts` documents as the reason a grey's residual is a threshold test rather than
    // an equality. Within a thousandth of a step is the truth of it.
    const white = srgbToOklab(255, 255, 255);
    expect(white.L).toBeCloseTo(255, 3);
    expect(white.a).toBeCloseTo(0, 4);
    expect(white.b).toBeCloseTo(0, 4);
  });

  it('keeps every grey on the L axis, in byte order', () => {
    let previous = -1;
    for (let byte = 0; byte < 256; byte += 5) {
      const grey = srgbToOklab(byte, byte, byte);
      // On the axis: what "achromatic" means in this space, and what the keying's basis relies on
      // when it treats the axis as (1, 0, 0).
      expect(Math.abs(grey.a)).toBeLessThan(1e-4);
      expect(Math.abs(grey.b)).toBeLessThan(1e-4);
      expect(grey.L).toBeGreaterThan(previous);
      previous = grey.L;
    }
  });

  it('spreads the darks and gathers the lights, which is the correction the gates moved here for', () => {
    // Sixteen bytes at the bottom of the range against the same sixteen at the top. RGB scores the
    // two journeys identically; a reader does not — the dark step is a plainly visible change and
    // the light one is barely there. The ratio is the defect the RGB gates had, stated as the
    // property that fixes it.
    const dark = distance([0, 0, 0], [16, 16, 16]);
    const light = distance([239, 239, 239], [255, 255, 255]);
    expect(dark).toBeGreaterThan(3 * light);
  });

  it('overwrites every field of a reused scratch, leaving nothing of the previous pixel', () => {
    // The scratch form exists to be reused millions of times, so the property that matters is that
    // each call replaces *all three* fields: a field the conversion stopped writing would silently
    // carry the previous pixel's value into every distance after it. Converting two very different
    // colours through one scratch and comparing the second against a fresh conversion is what makes
    // that failure observable — on a fresh object the unwritten field is zero, not magenta's.
    const out: MutableOklab = { L: 0, a: 0, b: 0 };
    srgbToOklabInto(out, 255, 0, 255);
    srgbToOklabInto(out, 20, 180, 60);
    expect(out).toEqual(srgbToOklab(20, 180, 60));
  });
});

describe('oklabToSrgb', () => {
  it('gives back the byte it started from, across the cube', () => {
    // The round trip is the whole claim the inverse makes, and the only check that can catch a
    // transposed digit in the second matrix: the forward direction is pinned above against
    // published figures, so a matrix that undoes it exactly is by construction the right one.
    // Every eleventh byte on each channel, which is 24³ colours through both directions.
    for (let r = 0; r < 256; r += 11) {
      for (let g = 0; g < 256; g += 11) {
        for (let b = 0; b < 256; b += 11) {
          expect(oklabToSrgb(srgbToOklab(r, g, b))).toEqual({ r, g, b, a: 255 });
        }
      }
    }
  });

  it('clamps a colour sRGB cannot show rather than wrapping it', () => {
    // Chroma far past the gamut on the green axis. A channel that overflowed instead of clamping
    // would come back as a low byte — a bright colour rendered dark — which is the failure a
    // heatmap would show as a cold cell exactly where the sheet was at its worst.
    const beyond = oklabToSrgb(oklchToOklab(0.78, 0.6, 156));
    expect(beyond).toEqual({ r: 0, g: 255, b: 0, a: 255 });
  });
});

describe('oklchToOklab', () => {
  it('reads the polar form the stylesheet writes colours in', () => {
    // Lightness crosses scales — CSS states 0–1, this module works in 0–255 — and hue 0 puts the
    // whole of the chroma on `a`, which is what makes the axis assignment checkable by hand.
    const red = oklchToOklab(0.5, 0.1, 0);
    expect(red.L).toBeCloseTo(127.5, 6);
    expect(red.a).toBeCloseTo(25.5, 6);
    expect(red.b).toBeCloseTo(0, 6);

    const yellow = oklchToOklab(0.5, 0.1, 90);
    expect(yellow.a).toBeCloseTo(0, 6);
    expect(yellow.b).toBeCloseTo(25.5, 6);
  });

  it('resolves a real token to the bytes the engine paints for it', () => {
    // `--color-rose`, exactly as `index.css` states it, through to the pixel. This is the pairing
    // the heatmap's ramp depends on — a stylesheet colour named in the stylesheet's own terms and
    // resolved in code — so it is pinned on a token rather than on a synthetic triple, and pinned
    // as bytes rather than as a tolerance, because bytes are what reaches the canvas.
    expect(oklabToSrgb(oklchToOklab(0.68, 0.2, 12))).toEqual({ r: 249, g: 85, b: 119, a: 255 });
  });
});

/**
 * The transfer function on its own, both ways — the half of this module `coverageBlend` reaches for.
 *
 * Exported rather than duplicated, so these two are the same split and the same exponent the
 * matrices above are written against. What is worth pinning is the round trip and the one figure
 * that separates a linear-light mix from a byte average.
 */
describe('the sRGB transfer function', () => {
  it('round-trips every byte', () => {
    for (let byte = 0; byte < 256; byte += 1) {
      expect(linearToByte(srgbToLinear(byte))).toBe(byte);
    }
  });

  it('puts the linear midpoint of black and white at 188, not at 128', () => {
    // The figure the module note states for the dither's mixing plan, and the one `coverageBlend`
    // rests on: light adds linearly, and averaging the gamma-encoded bytes lands somewhere else.
    expect(linearToByte((srgbToLinear(0) + srgbToLinear(255)) / 2)).toBe(188);
  });

  it('clamps rather than throwing on a value outside the unit range', () => {
    // The same clamp `oklabToSrgb` relies on, which is what a browser does with an out-of-gamut
    // colour — so a mix that overshoots by a rounding step is a byte rather than an exception.
    expect(linearToByte(-0.5)).toBe(0);
    expect(linearToByte(1.5)).toBe(255);
  });

  it('answers zero for a channel outside the byte range, as every other reader here does', () => {
    expect(srgbToLinear(-1)).toBe(0);
    expect(srgbToLinear(256)).toBe(0);
  });
});
