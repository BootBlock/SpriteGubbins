import { integralImage, rectangleSum } from './integralImage.ts';
import { oklabPlanes, type OklabPlanes } from './oklabPlanes.ts';

/**
 * How alike two images are, structurally — the structural similarity index of Wang, Bovik, Sheikh
 * and Simoncelli, *Image Quality Assessment: From Error Visibility to Structural Similarity* (IEEE
 * Transactions on Image Processing, 2004), measured on each OKLab axis and on coverage, and averaged.
 *
 * **Why a structural measure rather than a per-pixel one.** The auto-tune sweep compares a
 * candidate's result against the artwork it was read from, and a mean squared error answers that
 * question badly: a reading that keeps a contour but shifts its tone scores worse than one that
 * deletes the contour and leaves the surrounding fill exactly right, because the second disagrees
 * with fewer pixels. SSIM reads local mean, local contrast and local correlation instead, so a
 * missing line is a structural loss wherever the fill around it lands. That is the Öztireli and
 * Gross objective — keep what a viewer perceives rather than what a subtractor measures — turned
 * into a scorer.
 *
 * **Three channels rather than one of lightness, and that is not a refinement.** The paper's index
 * is defined on a single channel and is very often applied to luma alone; here that would make the
 * score blind to the one thing this tab exists to change. Two hues at one lightness read as
 * identical to a lightness-only measure, so discarding a palette costs nothing — measured on the
 * reference sheet, a luma-only version of this took a sweep from 60 colours to 11 for a hundredth of
 * a point of likeness, because the hue it threw away was invisible to the thing judging it. OKLab is
 * the space every other colour gate in the app measures in, so the score and the dials it ranks
 * speak the same units; see `oklabPlanes`, which also says why the chroma axes are offset.
 *
 * **Coverage is a fourth channel, because on a keyed sheet it is half of what the art is.** The
 * colour channels read a cleared pixel as one fixed neutral, so on their own they cannot tell a
 * contour that was deleted to transparency from one redrawn in grey, and the reading stage, the
 * sprite-edge cleanup and the silhouette anti-aliasing all trade exactly that: they move pixels
 * across the edge between drawn and cleared, or give the edge a fringe of partial alpha. `alpha` is
 * in the colour planes' own units, 0 to 255, so the stabilising constants below are the same fraction
 * of it, and it is averaged in on the same footing as the other three. On a sheet where every pixel
 * of both images is opaque it is a flat window everywhere and scores 1, so there it lifts every
 * candidate by the same share and changes no ranking.
 *
 * **The window is a uniform 8 × 8, not the paper's 11 × 11 Gaussian, and the reason is cost.** With
 * a uniform window every quantity below is a rectangle sum, so five summed-area tables answer every
 * window position of a channel in constant time; a Gaussian window is a separable convolution over
 * those five planes and costs several times that, on a sweep that runs this once per candidate per
 * crop. What the Gaussian buys in the paper is a *map* free of blocking artefacts — §III.B says so
 * in as many words — and this returns a mean over the whole image rather than a map, which is the
 * one use that cannot see the difference. An 8 × 8 square is the baseline the paper states its own
 * window against.
 *
 * The two images must be the same size; a caller holding two that are not has a bug in what it
 * cropped rather than a comparison to make. Returns 1 for two identical images and falls toward 0 as
 * they diverge. It can go slightly negative where two images are locally anti-correlated, which is a
 * real reading rather than an error, and the callers rank it rather than reading its sign.
 */
export function meanSsim(a: ImageData, b: ImageData): number {
  return ssimAgainst(ssimReference(a), b);
}

/**
 * One side of a comparison, measured once so that many images can be compared against it.
 *
 * **Everything the index needs of one image depends on that image alone** — its four planes, and the
 * summed-area tables of each plane and of its square. Only the table of the *product* needs both. So
 * a caller that scores many images against one keeps this rather than asking {@link meanSsim} to
 * measure the same image again for each of them: the auto-tune sweep scores every candidate against
 * the same crop, and rebuilding that crop's side was one of every comparison's two conversions into
 * OKLab and two of its five tables.
 */
export interface SsimReference {
  readonly width: number;
  readonly height: number;
  readonly channels: { readonly [Channel in keyof OklabPlanes]: ChannelSums };
}

/** One channel's plane, and the two summed-area tables that depend on it alone. */
interface ChannelSums {
  readonly plane: Float64Array;
  readonly sum: Float64Array;
  readonly squares: Float64Array;
}

/** The side of a comparison that depends on `image` alone — see {@link SsimReference}. */
export function ssimReference(image: ImageData): SsimReference {
  const { width, height } = image;
  const planes = oklabPlanes(image);
  return {
    width,
    height,
    channels: {
      L: channelSums(planes.L, width, height),
      a: channelSums(planes.a, width, height),
      b: channelSums(planes.b, width, height),
      alpha: channelSums(planes.alpha, width, height),
    },
  };
}

/**
 * {@link meanSsim} with its first image already measured.
 *
 * The same figure to the last bit rather than a close one, because it is the same arithmetic in the
 * same order: `meanSsim` is this function handed a reference it built a moment before.
 */
export function ssimAgainst(reference: SsimReference, image: ImageData): number {
  const { width, height } = reference;
  if (image.width !== width || image.height !== height) {
    throw new Error('Structural similarity is only defined between two images of the same size');
  }

  const planes = oklabPlanes(image);
  const channel = (name: keyof OklabPlanes) =>
    channelSsim(reference.channels[name], channelSums(planes[name], width, height), width, height);

  // Averaged rather than weighted, because the four channels are already commensurate: `oklab.ts`
  // scales the three colour axes so a step means the same distance on each, which is the property
  // every colour dial in this tab is calibrated against, and coverage is read on the same 0–255 range.
  return (channel('L') + channel('a') + channel('b') + channel('alpha')) / 4;
}

/** A plane with the two tables built from it alone: its sum, and the sum of its square. */
function channelSums(plane: Float64Array, width: number, height: number): ChannelSums {
  return {
    plane,
    sum: integralImage(plane, width, height),
    squares: integralImage(plane, width, height, plane),
  };
}

/** The square window every quantity is measured over — see the note on the Gaussian above. */
const SSIM_WINDOW = 8;

/** The range the two stabilising constants are a fraction of, which all four channels share. */
const DYNAMIC_RANGE = 255;

/**
 * The stabilising constants, at the paper's own K1 = 0.01 and K2 = 0.03.
 *
 * They are what keeps the ratio finite where a window is flat in both images: with no mean and no
 * variance the numerator and the denominator both vanish, and the paper's answer is to add a small
 * fraction of the dynamic range to each rather than to special-case it.
 */
const C1 = (0.01 * DYNAMIC_RANGE) ** 2;
const C2 = (0.03 * DYNAMIC_RANGE) ** 2;

/** The index over one channel, averaged across every window position that fits. */
function channelSsim(left: ChannelSums, right: ChannelSums, width: number, height: number): number {
  // The window is shrunk on an image too small to hold one rather than refused: a crop of a sheet at
  // a coarse grid can be a handful of pixels across, and "these seven rows are alike" is still the
  // question being asked.
  const window = Math.min(SSIM_WINDOW, width, height);
  const count = window * window;
  // The unbiased estimator the paper uses. At a window of one there is no spread to estimate, so the
  // variance terms are held at zero and the comparison falls back to the luminance term alone.
  const spread = count > 1 ? count - 1 : 1;

  const { sum: sumA, squares: sumAA } = left;
  const { sum: sumB, squares: sumBB } = right;
  // The one table that needs both images, and so the one a reference cannot build ahead of time.
  const sumAB = integralImage(left.plane, width, height, right.plane);

  let total = 0;
  let windows = 0;

  for (let top = 0; top + window <= height; top += 1) {
    for (let x = 0; x + window <= width; x += 1) {
      const sa = rectangleSum(sumA, width, x, top, window, window);
      const sb = rectangleSum(sumB, width, x, top, window, window);
      const saa = rectangleSum(sumAA, width, x, top, window, window);
      const sbb = rectangleSum(sumBB, width, x, top, window, window);
      const sab = rectangleSum(sumAB, width, x, top, window, window);

      const meanA = sa / count;
      const meanB = sb / count;
      // Clamped at zero: a variance is a difference of two large sums, and floating point can put it
      // a few parts in 10^15 below zero on a perfectly flat window.
      const varA = count > 1 ? Math.max(0, (saa - (sa * sa) / count) / spread) : 0;
      const varB = count > 1 ? Math.max(0, (sbb - (sb * sb) / count) / spread) : 0;
      const covariance = count > 1 ? (sab - (sa * sb) / count) / spread : 0;

      total +=
        ((2 * meanA * meanB + C1) * (2 * covariance + C2)) /
        ((meanA * meanA + meanB * meanB + C1) * (varA + varB + C2));
      windows += 1;
    }
  }

  // Unreachable while the window is clamped to the image above, and stated rather than assumed
  // because the alternative is a silent NaN travelling into a comparison.
  return windows === 0 ? 1 : total / windows;
}
