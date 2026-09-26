import { describe, expect, it } from 'vitest';
import { imageFrom, soften } from '../test/images.ts';
import { oklabToSrgb, srgbToOklab } from './oklab.ts';
import { oklabPlanes, type OklabPlanes } from './oklabPlanes.ts';
import { meanSsim, ssimAgainst, ssimReference } from './ssim.ts';

/**
 * The same index computed the slow way — every window summed directly, no summed-area tables.
 *
 * This is what establishes that the fast form is the index it claims to be. Summed-area tables and a
 * rectangle difference are easy to get subtly wrong in a way no property test would notice: an
 * off-by-one in the stride shifts one plane against another and still returns a plausible number in
 * [0, 1] that is monotone in everything you would think to check. Written from the paper's own
 * expression, with its luminance term swapped for `sech` of the OKLab distance between the window
 * means as `meanSsim` states, so the two agree only if the fast one is right. `components` names the
 * planes read, so a test can ask what the index is without one of them.
 */
function directSsim(
  a: ImageData,
  b: ImageData,
  components: readonly (keyof OklabPlanes)[] = ['L', 'a', 'b', 'alpha'],
  window = 8,
): number {
  const left = oklabPlanes(a);
  const right = oklabPlanes(b);
  const { width, height } = a;
  const c2 = (0.03 * 255) ** 2;
  let total = 0;
  let windows = 0;

  for (let top = 0; top + window <= height; top += 1) {
    for (let x = 0; x + window <= width; x += 1) {
      const at: number[] = [];
      for (let dy = 0; dy < window; dy += 1) {
        for (let dx = 0; dx < window; dx += 1) at.push((top + dy) * width + x + dx);
      }
      const count = at.length;
      const mean = (plane: Float64Array) => at.reduce((sum, index) => sum + (plane[index] ?? 0), 0) / count;
      let apart = 0;
      let varA = 0;
      let varB = 0;
      let covariance = 0;
      for (const component of components) {
        const meanA = mean(left[component]);
        const meanB = mean(right[component]);
        apart += (meanA - meanB) ** 2;
        for (const index of at) {
          const offA = (left[component][index] ?? 0) - meanA;
          const offB = (right[component][index] ?? 0) - meanB;
          varA += (offA * offA) / (count - 1);
          varB += (offB * offB) / (count - 1);
          covariance += (offA * offB) / (count - 1);
        }
      }
      total += ((1 / Math.cosh(Math.sqrt(apart) / 89.35)) * (2 * covariance + c2)) / (varA + varB + c2);
      windows += 1;
    }
  }

  return windows === 0 ? 1 : total / windows;
}

/** A flat 16 × 16 opaque swatch of one colour. */
function swatch([r, g, b]: readonly [number, number, number]): ImageData {
  return imageFrom(16, 16, () => ({ r, g, b, a: 255 }));
}

/** The scaled OKLab distance between two sRGB colours. */
function oklabDistance(
  one: readonly [number, number, number],
  other: readonly [number, number, number],
): number {
  const a = srgbToOklab(...one);
  const b = srgbToOklab(...other);
  return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b);
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

/** The image with every pixel of its darkest colour cleared to transparency, keeping what was under it. */
function outlineCleared(image: ImageData): ImageData {
  return imageFrom(image.width, image.height, (x, y) => {
    const at = (y * image.width + x) * 4;
    const pixel = { r: image.data[at] ?? 0, g: image.data[at + 1] ?? 0, b: image.data[at + 2] ?? 0 };
    return { ...pixel, a: pixel.r + pixel.g + pixel.b < 60 ? 0 : (image.data[at + 3] ?? 0) };
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

  it('answers the same from one reference however many images are scored against it', () => {
    // What the auto-tune sweep relies on when it measures each crop once: a reference is read and
    // never written, so the tenth image scored against it gets the figure a fresh one would give.
    const others = [soften(ART), towardFlat(ART, 1), outlineCleared(ART), ART, soften(ART)];
    const reference = ssimReference(ART);

    expect(others.map((other) => ssimAgainst(reference, other))).toEqual(
      others.map((other) => meanSsim(ART, other)),
    );
  });

  it('agrees with the same index summed directly, window by window', () => {
    // The cross-check the integral tables are worth having: they agree to ten decimals on artwork,
    // on a degraded copy of it, on a copy with no structure left at all, and on one with its contour
    // cleared, which is the case the coverage channel is there for.
    for (const other of [ART, soften(ART), towardFlat(ART, 1), outlineCleared(ART)]) {
      expect(meanSsim(ART, other)).toBeCloseTo(directSsim(ART, other), 10);
    }
  });

  it('falls monotonically as an image is degraded further', () => {
    const ladder = [0, 0.25, 0.5, 0.75, 1].map((share) => meanSsim(ART, towardFlat(ART, share)));

    expect(ladder).toEqual([...ladder].sort((a, b) => b - a));
    expect(ladder[0]).toBeCloseTo(1, 12);
    // Over half of what the index can lose is gone by the time nothing of the artwork is left.
    expect(ladder[4]).toBeLessThan(0.5);
  });

  it('adds nothing for coverage where both images are opaque everywhere', () => {
    // The promise that lets coverage in without moving a sweep over an opaque sheet: a component that
    // is one constant on both sides adds nothing to a distance, a spread or a covariance.
    for (const other of [ART, soften(ART), towardFlat(ART, 0.5), towardFlat(ART, 1)]) {
      expect(meanSsim(ART, other)).toBeCloseTo(directSsim(ART, other, ['L', 'a', 'b']), 10);
    }
  });

  it('charges a flat shift the same at black as in the mid-tones, for the same OKLab distance', () => {
    // The defect this replaced. The paper's luminance term compares two means by their ratio, so run
    // on OKLab lightness it scored the first pair here at 0.7554 and the second at 0.9986. Each pair
    // is chosen for a distance near 17 — black, mid grey, and a hue shift in a blue fill — and each
    // is measured rather than assumed.
    const pairs = [
      [
        [0, 0, 0],
        [1, 1, 1],
      ],
      [
        [128, 128, 128],
        [148, 148, 148],
      ],
      [
        [40, 70, 170],
        [40, 95, 170],
      ],
    ] as const;
    const distances = pairs.map(([one, other]) => oklabDistance(one, other));
    const costs = pairs.map(([one, other]) => 1 - meanSsim(swatch(one), swatch(other)));

    for (const distance of distances) expect(distance).toBeCloseTo(17, 0);
    // A flat swatch has no spread, so its cost is the level term alone, which is a function of the
    // distance alone: the costs differ only as far as the three distances do.
    const perSquaredDistance = costs.map((cost, index) => cost / (distances[index] ?? 1) ** 2);
    expect(Math.max(...perSquaredDistance) / Math.min(...perSquaredDistance)).toBeLessThan(1.01);
    expect(Math.min(...costs)).toBeGreaterThan(0.01);
  });

  it('charges a small step at mid lightness what the paper charged for it there', () => {
    // Where the level scale is matched: at the middle of the lightness axis, sRGB 99, a step of two
    // code values costs what the paper's own luminance term priced it at on the code values.
    const c1 = (0.01 * 255) ** 2;
    const paper = 1 - (2 * 99 * 101 + c1) / (99 ** 2 + 101 ** 2 + c1);
    const cost = 1 - meanSsim(swatch([99, 99, 99]), swatch([101, 101, 101]));

    expect(cost / paper).toBeGreaterThan(0.97);
    expect(cost / paper).toBeLessThan(1.03);
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

  it('scores a sprite well below 1 against itself with its outline cleared to transparency', () => {
    // The defect this replaced. With a cleared pixel read as unlit, deleting a black contour to
    // transparency left every plane where it was and scored 0.9999999999998 — so the reading stage,
    // the sprite-edge cleanup and the silhouette anti-aliasing could trade a dark edge for coverage,
    // or the reverse, for nothing.
    const sprite = imageFrom(32, 32, (x, y) => {
      const inset = Math.min(x, y, 31 - x, 31 - y);
      if (inset < 6) return { r: 255, g: 0, b: 255, a: 0 };
      if (inset < 8) return { r: 0, g: 0, b: 0, a: 255 };
      return { r: 200, g: 40, b: 40, a: 255 };
    });
    const cleared = imageFrom(32, 32, (x, y) => {
      const at = (y * 32 + x) * 4;
      const outline = (sprite.data[at] ?? 0) === 0 && (sprite.data[at + 3] ?? 0) === 255;
      return outline
        ? { r: 0, g: 0, b: 0, a: 0 }
        : {
            r: sprite.data[at] ?? 0,
            g: sprite.data[at + 1] ?? 0,
            b: sprite.data[at + 2] ?? 0,
            a: sprite.data[at + 3] ?? 0,
          };
    });

    expect(meanSsim(sprite, cleared)).toBeLessThan(0.8);
  });

  it('tells a half-covered colour from the darker opaque one it used to read as', () => {
    // A half-alpha red was read as a darker red: its planes were the opaque red's scaled by its
    // opacity, which is the same point in OKLab as this opaque colour. So a fringe of partial
    // coverage, which is what silhouette anti-aliasing writes, read as a darkening of the art.
    const red = srgbToOklab(200, 40, 40);
    const share = 128 / 255;
    const darker = oklabToSrgb({ L: red.L * share, a: red.a * share, b: red.b * share });
    const patch = (inside: { r: number; g: number; b: number; a: number }) =>
      imageFrom(16, 16, (x, y) =>
        x >= 4 && x < 12 && y >= 4 && y < 12 ? inside : { r: 200, g: 40, b: 40, a: 255 },
      );

    expect(meanSsim(patch({ r: 200, g: 40, b: 40, a: 128 }), patch(darker))).toBeLessThan(0.9);
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
