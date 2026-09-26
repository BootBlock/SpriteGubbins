import { integralImage, rectangleSum } from './integralImage.ts';
import { oklabPlanes } from './oklabPlanes.ts';

/**
 * How alike two images are, structurally — the structural similarity index of Wang, Bovik, Sheikh
 * and Simoncelli, *Image Quality Assessment: From Error Visibility to Structural Similarity* (IEEE
 * Transactions on Image Processing, 2004), measured on each pixel's OKLab colour and its coverage,
 * taken together as one vector.
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
 * **Colour rather than lightness alone, and that is not a refinement.** The paper's index is defined
 * on a single channel and is very often applied to luma alone; here that would make the score blind
 * to the one thing this tab exists to change. Two hues at one lightness read as identical to a
 * lightness-only measure, so discarding a palette costs nothing — measured on the reference sheet, a
 * luma-only version of this took a sweep from 60 colours to 11 for a hundredth of a point of
 * likeness, because the hue it threw away was invisible to the thing judging it. OKLab is the space
 * every other colour gate in the app measures in, so the score and the dials it ranks speak the same
 * units; see `oklabPlanes`.
 *
 * **Coverage is a fourth component, because on a keyed sheet it is half of what the art is.** The
 * colour planes read a cleared pixel as one fixed neutral, so on their own they cannot tell a contour
 * that was deleted to transparency from one redrawn in grey, and the reading stage, the sprite-edge
 * cleanup and the silhouette anti-aliasing all trade exactly that: they move pixels across the edge
 * between drawn and cleared, or give the edge a fringe of partial alpha. `alpha` is in the colour
 * planes' own units, 0 to 255, so it enters every distance and every spread below on the same footing
 * as the other three. Where both images are opaque everywhere it is one constant on both sides, adds
 * nothing to any of them, and so moves no figure at all.
 *
 * **The paper's luminance term is replaced, because it measures in the wrong space.** It compares two
 * window means as `(2μxμy + C1) / (μx² + μy² + C1)`, which with C1 set aside is `sech(ln(μy / μx))`:
 * the distance between the two means on a *logarithmic* scale. That is the paper's reading of Weber's
 * law for raw brightness (§III.B, eqs. 6–8), and it is wrong twice over here. OKLab lightness is
 * already perceptually even, so a logarithm on top of it charges a step near black many times what
 * the same step costs in the mid-tones; and a chroma axis has no zero to take a ratio from at all.
 * Run once per channel, it scored a flat black swatch against one a single sRGB step lighter at
 * 0.7554, and a flat mid grey against one twenty steps lighter at 0.9986, though both moved 17 OKLab
 * units. {@link level} keeps the paper's curve and measures its argument where it belongs — the OKLab
 * distance between the two windows' mean colours, with coverage beside it — so one distance costs the
 * same wherever it falls.
 *
 * **Contrast and structure are read over the same vector**, as the paper's combined `c·s` term with
 * the variances and the covariance summed across the four components. A window's spread is then how
 * far its pixels sit from their mean colour, which is the quantity a Euclidean distance implies, and
 * it depends on no component's zero — which the per-channel luminance term did.
 *
 * **The window is a uniform 8 × 8, not the paper's 11 × 11 Gaussian, and the reason is cost.** With
 * a uniform window every quantity below is a rectangle sum, so a handful of summed-area tables answer
 * every window position in constant time; a Gaussian window is a separable convolution over those
 * planes and costs several times that, on a sweep that runs this once per candidate per crop. What
 * the Gaussian buys in the paper is a *map* free of blocking artefacts — §III.B says so in as many
 * words — and this returns a mean over the whole image rather than a map, which is the one use that
 * cannot see the difference. An 8 × 8 square is the baseline the paper states its own window against.
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
 * **Everything the index needs of one image depends on that image alone** — its four planes, the
 * summed-area table of each, and the table of each pixel's squared length. Only the table of the two
 * images' *dot product* needs both. So a caller that scores many images against one keeps this
 * rather than asking {@link meanSsim} to measure the same image again for each of them: the auto-tune
 * sweep scores every candidate against the same crop, and rebuilding that crop's side was one of every
 * comparison's two conversions into OKLab and five of its eleven tables.
 */
export interface SsimReference {
  readonly width: number;
  readonly height: number;
  readonly side: SideSums;
}

/** One image's planes, and the summed-area tables that depend on it alone. */
interface SideSums {
  /** Lightness, the two chroma axes and coverage, in that order. */
  readonly planes: readonly Float64Array[];
  /** The summed-area table of each plane, in the same order. */
  readonly sums: readonly Float64Array[];
  /** The summed-area table of each pixel's squared length across all four planes. */
  readonly squares: Float64Array;
}

/** The side of a comparison that depends on `image` alone — see {@link SsimReference}. */
export function ssimReference(image: ImageData): SsimReference {
  return { width: image.width, height: image.height, side: sideSums(image) };
}

/**
 * {@link meanSsim} with its first image already measured.
 *
 * The same figure to the last bit rather than a close one, because it is the same arithmetic in the
 * same order: `meanSsim` is this function handed a reference it built a moment before.
 */
export function ssimAgainst(reference: SsimReference, image: ImageData): number {
  const { width, height, side: left } = reference;
  if (image.width !== width || image.height !== height) {
    throw new Error('Structural similarity is only defined between two images of the same size');
  }

  const right = sideSums(image);
  // The one table that needs both images, and so the one a reference cannot build ahead of time.
  const products = integralImage(dotPlane(left.planes, right.planes), width, height);

  // The window is shrunk on an image too small to hold one rather than refused: a crop of a sheet at
  // a coarse grid can be a handful of pixels across, and "these seven rows are alike" is still the
  // question being asked.
  const window = Math.min(SSIM_WINDOW, width, height);
  const count = window * window;
  // The unbiased estimator the paper uses. At a window of one there is no spread to estimate, so the
  // spread terms are held at zero and the comparison falls back to the level term alone.
  const spread = count > 1 ? count - 1 : 1;
  const over = (table: Float64Array, x: number, top: number) =>
    rectangleSum(table, width, x, top, window, window);

  let total = 0;
  let windows = 0;

  for (let top = 0; top + window <= height; top += 1) {
    for (let x = 0; x + window <= width; x += 1) {
      // Each summed across the four components, from the two windows' sums: the squared distance
      // between them, their squared lengths, and their dot product.
      let apart = 0;
      let lengthA = 0;
      let lengthB = 0;
      let dot = 0;
      for (let component = 0; component < COMPONENTS; component += 1) {
        const sa = over(left.sums[component] ?? EMPTY, x, top);
        const sb = over(right.sums[component] ?? EMPTY, x, top);
        apart += (sa - sb) ** 2;
        lengthA += sa * sa;
        lengthB += sb * sb;
        dot += sa * sb;
      }

      // Each is a difference of two large sums, and floating point can put a variance a few parts in
      // 10^15 below zero on a perfectly flat window, so each variance is clamped at zero and the
      // covariance to the bound the two variances set on it. Clamping only the variances left an
      // image scored against itself a hair under 1, because its covariance kept the error they lost.
      const varA = count > 1 ? Math.max(0, (over(left.squares, x, top) - lengthA / count) / spread) : 0;
      const varB = count > 1 ? Math.max(0, (over(right.squares, x, top) - lengthB / count) / spread) : 0;
      const bound = Math.sqrt(varA * varB);
      const covariance =
        count > 1 ? Math.min(bound, Math.max(-bound, (over(products, x, top) - dot / count) / spread)) : 0;

      total += (level(Math.sqrt(apart) / count) * (2 * covariance + C2)) / (varA + varB + C2);
      windows += 1;
    }
  }

  // Unreachable while the window is clamped to the image above, and stated rather than assumed
  // because the alternative is a silent NaN travelling into a comparison.
  return windows === 0 ? 1 : total / windows;
}

/** Lightness, the two chroma axes and coverage. */
const COMPONENTS = 4;

/** What an absent table reads as, which no index below {@link COMPONENTS} ever reaches. */
const EMPTY = new Float64Array(0);

/** An image's four planes, and the tables built from it alone. */
function sideSums(image: ImageData): SideSums {
  const { width, height } = image;
  const { L, a, b, alpha } = oklabPlanes(image);
  const planes = [L, a, b, alpha];
  return {
    planes,
    sums: planes.map((plane) => integralImage(plane, width, height)),
    squares: integralImage(dotPlane(planes, planes), width, height),
  };
}

/** Each pixel's dot product across the four components of two same-sized images. */
function dotPlane(left: readonly Float64Array[], right: readonly Float64Array[]): Float64Array {
  const dots = new Float64Array(left[0]?.length ?? 0);
  for (let component = 0; component < COMPONENTS; component += 1) {
    const one = left[component] ?? EMPTY;
    const other = right[component] ?? EMPTY;
    for (let index = 0; index < dots.length; index += 1) {
      dots[index] = (dots[index] ?? 0) + (one[index] ?? 0) * (other[index] ?? 0);
    }
  }
  return dots;
}

/** The square window every quantity is measured over — see the note on the Gaussian above. */
const SSIM_WINDOW = 8;

/**
 * The stabilising constant of the contrast-and-structure term, at the paper's own K2 = 0.03 of the
 * 0–255 range the lightness and coverage planes occupy.
 *
 * It keeps the ratio finite where a window is flat in both images: with no spread the numerator and
 * the denominator both vanish, and the paper's answer is to add a small fraction of the dynamic range
 * to each rather than to special-case it. The paper's C1 has no counterpart, because {@link level}
 * divides by nothing.
 */
const C2 = (0.03 * 255) ** 2;

/**
 * The OKLab distance between two window means that one unit of the paper's logarithmic distance
 * stands for, matched at the middle of the lightness axis.
 *
 * The two scales cannot agree everywhere, because the defect being corrected is that one is a
 * logarithm of the other's input. They are matched at one level, and the middle of the lightness
 * axis is the one that favours neither end — the argument `CLEARED_LIGHTNESS` makes for the same
 * point. On the grey axis, lightness 127.5 is sRGB 99.09, where one code value moves lightness by
 * 0.9018, so one unit of the logarithm of the code value there is 99.09 × 0.9018 = 89.35. A small
 * step at mid lightness therefore costs what the paper charged for it, and costs the same anywhere
 * else. `ssim.test.ts` recomputes the figure from the sRGB transfer curve.
 */
const LEVEL_SCALE = 89.35;

/**
 * The paper's level comparison, handed the distance between two window means rather than their ratio.
 *
 * `sech` because it is the paper's own curve: where C1 is negligible its term is exactly `sech` of
 * the logarithm of the two means' ratio. Handed a Euclidean distance in OKLab and coverage instead, a
 * shift of one visible size costs the same at black, in the mid-tones and along a chroma axis.
 */
function level(distance: number): number {
  return 1 / Math.cosh(distance / LEVEL_SCALE);
}
