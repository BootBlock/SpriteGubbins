import { FULLY_TRANSPARENT } from './imageData.ts';
import type { MutableOklab } from './oklab.ts';

/**
 * How far one pixel sits from another, across colour **and** coverage, in scaled OKLab.
 *
 * Four axes rather than three, on the same scale, because a sprite sheet's most consequential
 * losses are losses of *alpha*: a keyed field eroding a contour, or a soft edge coming back opaque.
 * Scaled OKLab already runs 0–255 from black to white, so an alpha byte is a fourth axis of the same
 * span with no weight to choose — which is the same footing `applyPalette` puts it on.
 *
 * **A fully transparent pixel's colour is not compared**, on either side. `ImageData` carries
 * whatever bytes happened to sit under a cleared pixel — usually zeroes, sometimes the colour it was
 * before it was keyed — and none of it is visible, so measuring it would report a difference between
 * two things nobody can see. Where one side is clear the distance is the coverage alone, which is
 * {@link FULLY_OPAQUE} at its widest: a pixel that vanished is exactly as far from its source as
 * black is from white.
 *
 * **One definition, two questions.** `differenceMap` asks how far each output pixel sits from the
 * patch of source it replaced; `duplicateSprites` asks how far one sprite's pixel sits from the
 * matching pixel of another. Those are different questions about the same quantity, and a second
 * copy of the metric is a second answer free to drift from the first — which would put the
 * heatmap's ramp and the duplicate tolerance on two scales while both were stated in the same units.
 *
 * Takes the two colours already converted, and their two alphas separately, because that is what
 * both callers hold: each keeps a scratch {@link MutableOklab} per side and a cache in front of it,
 * so nothing here allocates and nothing here decides how often the conversion is paid.
 */
export function pixelDistance(
  left: MutableOklab,
  leftAlpha: number,
  right: MutableOklab,
  rightAlpha: number,
): number {
  if (leftAlpha === FULLY_TRANSPARENT || rightAlpha === FULLY_TRANSPARENT) {
    return leftAlpha === rightAlpha ? 0 : Math.abs(leftAlpha - rightAlpha);
  }
  const dL = left.L - right.L;
  const dA = left.a - right.a;
  const dB = left.b - right.b;
  const dAlpha = leftAlpha - rightAlpha;
  return Math.sqrt(dL * dL + dA * dA + dB * dB + dAlpha * dAlpha);
}
