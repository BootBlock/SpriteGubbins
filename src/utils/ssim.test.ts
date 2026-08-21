import { describe, expect, it } from 'vitest';
import { imageFrom, soften } from '../test/images.ts';
import { oklabPlanes } from './oklabPlanes.ts';
import { meanSsim } from './ssim.ts';

/**
 * The same index computed the slow way — every window summed directly, no summed-area tables.
 *
 * This is what establishes that the fast form is the index it claims to be. Five integral tables per
 * channel and a rectangle difference is easy to get subtly wrong in a way no property test would
 * notice: an off-by-one in the stride shifts one plane against another and still returns a plausible
 * number in [0, 1] that is monotone in everything you would think to check. Written from the paper's
 * own expression, so the two agree only if the fast one is right.
 */
function directSsim(a: ImageData, b: ImageData, window = 8): number {
  const left = oklabPlanes(a);
  const right = oklabPlanes(b);
  return (
    (directChannel(left.L, right.L, a.width, a.height, window) +
      directChannel(left.a, right.a, a.width, a.height, window) +
      directChannel(left.b, right.b, a.width, a.height, window)) /
    3
  );
}

function directChannel(
  left: Float64Array,
  right: Float64Array,
  width: number,
  height: number,
  window: number,
): number {
  const c1 = (0.01 * 255) ** 2;
  const c2 = (0.03 * 255) ** 2;
  let total = 0;
  let windows = 0;

  for (let top = 0; top + window <= height; top += 1) {
    for (let x = 0; x + window <= width; x += 1) {
      const xs: number[] = [];
      const ys: number[] = [];
      for (let dy = 0; dy < window; dy += 1) {
        for (let dx = 0; dx < window; dx += 1) {
          xs.push(left[(top + dy) * width + x + dx] ?? 0);
          ys.push(right[(top + dy) * width + x + dx] ?? 0);
        }
      }
      const count = xs.length;
      const meanA = xs.reduce((sum, value) => sum + value, 0) / count;
      const meanB = ys.reduce((sum, value) => sum + value, 0) / count;
      const varA = xs.reduce((sum, value) => sum + (value - meanA) ** 2, 0) / (count - 1);
      const varB = ys.reduce((sum, value) => sum + (value - meanB) ** 2, 0) / (count - 1);
      const covariance =
        xs.reduce((sum, value, index) => sum + (value - meanA) * ((ys[index] ?? 0) - meanB), 0) / (count - 1);
      total +=
        ((2 * meanA * meanB + c1) * (2 * covariance + c2)) /
        ((meanA * meanA + meanB * meanB + c1) * (varA + varB + c2));
      windows += 1;
    }
  }

  return windows === 0 ? 1 : total / windows;
}

/** The art blended `share` of the way toward a flat mid grey. */
function towardFlat(image: ImageData, share: number): ImageData {
  return imageFrom(image.width, image.height, (x, y) => {
    const at = (y * image.width + x) * 4;
    const mix = (value: number) => value * (1 - share) + 128 * share;
    return {
      r: mix(image.data[at] ?? 0),
      g: mix(image.data[at + 1] ?? 0),
      b: mix(image.data[at + 2] ?? 0),
      a: 255,
    };
  });
}

/** A 32 × 32 sprite of flat blocks with a dark contour — structure an SSIM window can see. */
const ART = imageFrom(32, 32, (x, y) => {
  const onContour = x === 8 || x === 23 || y === 8 || y === 23;
  if (onContour && x >= 8 && x <= 23 && y >= 8 && y <= 23) return { r: 12, g: 10, b: 16, a: 255 };
  if (x > 8 && x < 23 && y > 8 && y < 23) return { r: 190, g: 120, b: 60, a: 255 };
  return { r: 40, g: 60, b: 90, a: 255 };
});

describe('meanSsim', () => {
  it('answers 1 for an image against itself', () => {
    expect(meanSsim(ART, ART)).toBeCloseTo(1, 12);
  });

  it('answers 1 for two separately built copies of one image', () => {
    const copy = imageFrom(ART.width, ART.height, (x, y) => {
      const at = (y * ART.width + x) * 4;
      return {
        r: ART.data[at] ?? 0,
        g: ART.data[at + 1] ?? 0,
        b: ART.data[at + 2] ?? 0,
        a: ART.data[at + 3] ?? 0,
      };
    });

    expect(meanSsim(ART, copy)).toBeCloseTo(1, 12);
  });

  it('agrees with the same index summed directly, window by window', () => {
    // The cross-check the integral tables are worth having: they agree to ten decimals on artwork,
    // on a degraded copy of it, and on a copy with no structure left at all.
    for (const other of [ART, soften(ART), towardFlat(ART, 1)]) {
      expect(meanSsim(ART, other)).toBeCloseTo(directSsim(ART, other), 10);
    }
  });

  it('falls monotonically as an image is degraded further', () => {
    const ladder = [0, 0.25, 0.5, 0.75, 1].map((share) => meanSsim(ART, towardFlat(ART, share)));

    expect(ladder).toEqual([...ladder].sort((a, b) => b - a));
    expect(ladder[0]).toBeCloseTo(1, 12);
    // Half the index gone by the time nothing of the artwork is left. Stated as a share of where the
    // ladder starts rather than as an absolute figure, because what a flat grey scores against a
    // particular sheet is a property of that sheet's colours rather than of the index.
    expect(ladder[4]).toBeLessThan((ladder[0] ?? 1) / 2);
  });

  it('is symmetric in its two arguments', () => {
    expect(meanSsim(ART, soften(ART))).toBeCloseTo(meanSsim(soften(ART), ART), 12);
  });

  it('scores a shifted image below a softened one that disagrees with more pixels', () => {
    // The reason the sweep is scored on structure rather than on a difference of pixels. The shifted
    // copy leaves the flat interior alone and disagrees with fewer pixels than the softening does —
    // asserted below rather than claimed — yet it has moved every edge, which is the failure that
    // matters on a sprite sheet, and SSIM is what puts it lower.
    const shifted = imageFrom(ART.width, ART.height, (x, y) => {
      const at = (y * ART.width + Math.min(ART.width - 1, x + 3)) * 4;
      return {
        r: ART.data[at] ?? 0,
        g: ART.data[at + 1] ?? 0,
        b: ART.data[at + 2] ?? 0,
        a: ART.data[at + 3] ?? 0,
      };
    });
    const softened = soften(ART);
    const differing = (other: ImageData) =>
      [...ART.data].filter((value, index) => value !== other.data[index]).length;

    expect(differing(shifted)).toBeLessThan(differing(softened));
    expect(meanSsim(ART, shifted)).toBeLessThan(meanSsim(ART, softened));
  });

  it('sees two hues apart at one lightness, which a luma-only reading cannot', () => {
    // The defect this replaced. A score that reads lightness alone cannot tell these two sheets
    // apart at all, so discarding a palette costs it nothing — and the sweep took the reference
    // sheet from 60 colours to 11 for a hundredth of a point of likeness on exactly that reasoning.
    const green = imageFrom(32, 32, (x, y) =>
      (x >> 3) % 2 === (y >> 3) % 2 ? { r: 0, g: 130, b: 60, a: 255 } : { r: 20, g: 20, b: 20, a: 255 },
    );
    // A blue chosen for the same OKLab lightness as the green above, so only the chroma axes differ.
    const blue = imageFrom(32, 32, (x, y) =>
      (x >> 3) % 2 === (y >> 3) % 2 ? { r: 0, g: 110, b: 210, a: 255 } : { r: 20, g: 20, b: 20, a: 255 },
    );

    // Within five of 255, which is two per cent of the axis: the same lightness as far as a reader
    // is concerned, and well inside what a lightness-only score would round together.
    const lightnessApart = Math.abs((oklabPlanes(green).L[0] ?? 0) - (oklabPlanes(blue).L[0] ?? 0));
    expect(lightnessApart).toBeLessThan(5);
    expect(meanSsim(green, blue)).toBeLessThan(0.9);
  });

  it('reads two fully transparent images as alike whatever colours are left under them', () => {
    // A keyed sheet is mostly cleared pixels, and the channels under them are whatever the key was.
    const magenta = imageFrom(16, 16, () => ({ r: 255, g: 0, b: 255, a: 0 }));
    const black = imageFrom(16, 16, () => ({ r: 0, g: 0, b: 0, a: 0 }));

    expect(meanSsim(magenta, black)).toBeCloseTo(1, 12);
  });

  it('measures an image smaller than one window rather than refusing it', () => {
    const tiny = imageFrom(3, 3, (x) => ({ r: x * 80, g: 0, b: 0, a: 255 }));

    expect(meanSsim(tiny, tiny)).toBeCloseTo(1, 12);
    expect(
      meanSsim(
        tiny,
        imageFrom(3, 3, () => ({ r: 0, g: 0, b: 0, a: 255 })),
      ),
    ).toBeLessThan(1);
  });

  it('refuses two images of different sizes', () => {
    expect(() =>
      meanSsim(
        ART,
        imageFrom(16, 16, () => ({ r: 0, g: 0, b: 0, a: 255 })),
      ),
    ).toThrow(/same size/);
  });

  it('holds a flat image against itself at 1 rather than dividing by nothing', () => {
    // The case the two stabilising constants exist for: no mean and no variance on either side.
    const blank = imageFrom(16, 16, () => ({ r: 0, g: 0, b: 0, a: 0 }));

    expect(meanSsim(blank, blank)).toBeCloseTo(1, 12);
  });
});
