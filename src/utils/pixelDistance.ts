import { FULLY_TRANSPARENT } from './imageData.ts';
import type { MutableOklab } from './oklab.ts';

/**
 * How far one pixel sits from another, across colour **and** coverage, in scaled OKLab.
 *
 * Four axes rather than three, on the same scale, because a sprite sheet's most consequential
 * losses are losses of *alpha*: a keyed field eroding a contour, or a soft edge coming back opaque.
 * Scaled OKLab already runs 0–255 from black to white, so an alpha byte is a fourth axis of the
 * same span with no weight to choose — which is the same footing `applyPalette` puts it on.
 *
 * **A fully transparent pixel's colour is not compared**, on either side. `ImageData` carries
 * whatever bytes happened to sit under a cleared pixel — usually zeroes, sometimes the colour it was
 * before it was keyed — and none of it is visible, so measuring it would report a difference between
 * two things nobody can see. Where one side is clear the distance is the coverage alone, which is
 * `FULLY_OPAQUE` at its widest: a pixel that vanished is exactly as far from its source as black is
 * from white.
 *
 * **Its own file because two passes now ask the same question of two different pairs of pixels.**
 * `differenceMap` asks it of a source pixel and the result pixel that replaced it; `symmetryAxis`
 * asks it of a pixel and its mirror partner. Both are stated in the units every colour dial on the
 * quantise tab is stated in, and a second copy of this would be one of them free to be corrected
 * alone — which would leave two dials measuring in two different spaces while both said "distance".
 *
 * Takes the two colours already converted, because both callers convert far fewer colours than they
 * compare: the difference map holds one cell colour across a whole cell, and the axis search reuses
 * one conversion of each pixel across every candidate axis.
 */
export function pixelDistance(
  first: MutableOklab,
  firstAlpha: number,
  second: MutableOklab,
  secondAlpha: number,
): number {
  if (firstAlpha === FULLY_TRANSPARENT || secondAlpha === FULLY_TRANSPARENT) {
    return firstAlpha === secondAlpha ? 0 : Math.abs(firstAlpha - secondAlpha);
  }
  const dL = first.L - second.L;
  const dA = first.a - second.a;
  const dB = first.b - second.b;
  const dAlpha = firstAlpha - secondAlpha;
  return Math.sqrt(dL * dL + dA * dA + dB * dB + dAlpha * dAlpha);
}
