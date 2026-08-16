import { describe, expect, it } from 'vitest';
import { type MutableOklab, srgbToOklab, srgbToOklabInto } from './oklab.ts';

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
