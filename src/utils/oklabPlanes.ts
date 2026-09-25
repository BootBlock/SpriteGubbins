import type { MutableOklab } from './oklab.ts';
import { srgbToOklabInto } from './oklab.ts';

/** An image as four planes, one per OKLab axis and one of coverage, in row-major order. */
export interface OklabPlanes {
  /** Lightness, 0 black to 255 white. */
  readonly L: Float64Array;
  /** The green–red axis, offset so it is non-negative — see {@link CHROMA_OFFSET}. */
  readonly a: Float64Array;
  /** The blue–yellow axis, offset the same way. */
  readonly b: Float64Array;
  /** Coverage, 0 cleared to 255 opaque — the image's own alpha, in the colour planes' units. */
  readonly alpha: Float64Array;
}

/**
 * How far the two chroma axes are shifted to make them non-negative.
 *
 * On the app's scaled OKLab axes `a` and `b` run about −80 to +71 across the sRGB gamut, and the
 * readers built on these planes want channels that behave alike. 128 is the offset an 8-bit Lab
 * image conventionally stores those axes with, and it lands the whole gamut inside 48 to 199 —
 * comfortably within the 0–255 range the lightness axis already occupies, so one dynamic range
 * covers all four planes.
 */
export const CHROMA_OFFSET = 128;

/**
 * The lightness a cleared pixel's colour is read as: the middle of the axis.
 *
 * A cleared pixel has no colour, but the colour planes need a value there, and whatever value they
 * take is a colour some drawn pixel also has. The middle is the one that favours neither end: a
 * black outline and a white highlight are the same distance from it, so clearing either one costs
 * the colour planes the same, and neither reads as "nothing is drawn here" — which is the defect the
 * old choice of black had, where deleting a dark contour cost nothing at all.
 */
export const CLEARED_LIGHTNESS = 127.5;

/**
 * The image in the colour space every other gate in this app measures in, and its coverage beside it.
 *
 * **Three colour planes rather than one of lightness**, and the difference decides whether a fidelity
 * score can see a palette at all. A lightness-only reading cannot tell one hue from another at the
 * same lightness, so merging two colours a reader plainly distinguishes costs it nothing — which on
 * this tab is not an edge case but the main event, since the quantiser's whole job is reducing a
 * palette. Measured on the reference sheet before this was three planes: the sweep took a sheet from
 * 60 colours to 11 for a hundredth of a point of likeness, because the hue it threw away was
 * invisible to the thing judging it.
 *
 * OKLab rather than sRGB for the reason `oklab.ts` gives at length: Euclidean distance there
 * approximates how far apart two colours *look*, and it is the space the sheet-wide merge, the fill
 * cleanup and the background keying already measure in. A fidelity score written in another space
 * would be ranking dials whose own thresholds are stated in this one.
 *
 * **Coverage is a plane of its own, and colour and coverage are read apart.** A keyed sheet is mostly
 * transparent and a transparent pixel's colour channels are whatever was under the key — the browser
 * does not clear them — so reading them would report structure that nothing on screen has. A cleared
 * pixel's colour is therefore one fixed neutral, {@link CLEARED_LIGHTNESS} with no chroma, and it
 * lands in the same place in both of any two images. A partly covered pixel's colour is taken that
 * far toward the same neutral, so a pixel that barely shows barely counts, and the reading does not
 * jump where a fringe fades out. What tells a cleared pixel from a drawn grey, or a half-covered red
 * from a duller opaque one, is {@link OklabPlanes.alpha}: a sheet's most consequential losses are
 * losses of alpha, so coverage is measured in its own right rather than folded into a colour.
 *
 * `Float64Array` rather than an integer plane, because every reader built on these accumulates
 * squares over the whole image: 255² times a pixel count this app admits 16.8 million of is past
 * where a 32-bit float still counts exactly.
 */
export function oklabPlanes(image: ImageData): OklabPlanes {
  const count = image.width * image.height;
  const L = new Float64Array(count);
  const a = new Float64Array(count);
  const b = new Float64Array(count);
  const alpha = new Float64Array(count);
  // One scratch object for the whole image, as the pipeline's own hot paths do: a sixteen-megapixel
  // sheet would otherwise allocate sixteen million of them.
  const color: MutableOklab = { L: 0, a: 0, b: 0 };

  for (let index = 0; index < count; index += 1) {
    const at = index * 4;
    const coverage = image.data[at + 3] ?? 0;
    const opacity = coverage / 255;
    srgbToOklabInto(color, image.data[at] ?? 0, image.data[at + 1] ?? 0, image.data[at + 2] ?? 0);
    L[index] = CLEARED_LIGHTNESS + (color.L - CLEARED_LIGHTNESS) * opacity;
    a[index] = CHROMA_OFFSET + color.a * opacity;
    b[index] = CHROMA_OFFSET + color.b * opacity;
    alpha[index] = coverage;
  }

  return { L, a, b, alpha };
}
