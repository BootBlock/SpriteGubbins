import { KEY_SHADING_LATITUDE } from '../constants/quantiser.ts';
import type { Rgba } from '../types/quantiser.ts';

/**
 * How far a pixel sits from the background key, measured so that the ways a key *field* varies cost
 * less than the ways a different colour differs.
 *
 * The straight Euclidean distance this began as could not express that, and the failure it produced
 * was not a near miss. On a returned sheet whose magenta field had been painted rather than filled,
 * the drifted field pixels measured 90 to 99 from `#FF00FF` — while rose `#FF0080` and purple
 * `#8000FF` measured 127. Both of those numbers fall inside the same rung of the tolerance ladder,
 * so **no threshold existed** that took the field and left the artwork: every setting loose enough
 * to clear the field was one step away from eating hues that were never the key, and the setting
 * below it left the field on screen. That is what a user sees as "the keying does not work".
 *
 * What tells the two apart is the *direction* the difference points in, not its length. A field
 * drifts by being **shaded** (the key mixed toward black) or **washed out** (mixed toward white),
 * and both of those stay in the plane spanned by the key colour and the achromatic axis — the plane
 * that holds black, the key and white. A pixel that is a different colour leaves that plane. So the
 * difference is split into the part lying in the plane and the part standing off it, and only the
 * part standing off it is measured at full weight; the rest is divided by
 * {@link KEY_SHADING_LATITUDE}.
 *
 * Against the same colours that measured 90 to 99, this reads 48 to 54, and leaves rose and purple
 * at 100. The ladder now has a rung and a half of daylight where it had none.
 *
 * **The latitude is bounded, and that is what stops the plane being a licence.** Pure green lies
 * *in* the magenta plane — both have red equal to blue — and is keyed at no tolerance the control
 * offers, because halving a distance of 441 still leaves 220. The plane says which differences are
 * cheap. It never says any of them are free.
 *
 * **It degenerates correctly for the two neutral keys, rather than needing a case for them.** White
 * and black are already on the achromatic axis, so the plane collapses to that one line: their
 * latitude is lightness alone and every trace of colour is measured at full weight, which is exactly
 * the right rule for a key that has no hue to be told apart by. Nothing here branches on which key
 * it was handed.
 *
 * Pure, and called once or twice for every pixel of an image that may be `MAX_IMAGE_PIXELS` — which
 * is why the plane is worked out once by {@link keyBasis} and {@link keyDistanceSquared} reads a
 * pixel's channels in place rather than taking an `Rgba` it would have to allocate.
 */

/**
 * The share of an in-plane difference the latitude gives back, derived from the latitude itself.
 *
 * Reaching `λ` times as far along an axis means dividing that axis's contribution by `λ²` before it
 * is compared against a squared radius, and `d² − (1 − 1/λ²)·p²` is that same statement written so
 * the whole distance is computed once and only the projection is discounted. Derived rather than
 * written down, because the two are one number said twice and a hand-kept second copy is free to
 * drift from the constant the control's guidance actually names.
 */
const PLANE_DISCOUNT = 1 - 1 / (KEY_SHADING_LATITUDE * KEY_SHADING_LATITUDE);

/** Each component of the unit achromatic axis — the direction black, every grey and white share. */
const GREY_AXIS = 1 / Math.sqrt(3);

/**
 * Below this, a vector is treated as having no direction at all.
 *
 * Two vectors reach it. A **black key** has zero length, so it names no direction to be shaded
 * along — mixing black toward black leaves it where it was — and the achromatic axis takes its
 * place. A **white or black key** then leaves nothing over once that axis is projected out, and the
 * exact zero the arithmetic wants arrives as a value near 1e-17 rather than as one, so the test has
 * to be a threshold. It is far below any residual a key with real colour in it produces: magenta's
 * is 0.577.
 */
const NO_DIRECTION = 1e-6;

/**
 * The key colour together with the plane its own variation lies in, worked out once per image.
 *
 * Two orthonormal vectors rather than the key and the grey axis themselves, because the projection
 * that {@link keyDistanceSquared} takes is only the sum of two squared dot products when the vectors
 * it takes them against are perpendicular and of unit length. The second is `null` — carried as
 * zeroes, which contribute nothing to either dot product — where the key is already achromatic and
 * the plane is a line.
 *
 * Flat fields rather than tuples: `noUncheckedIndexedAccess` makes every array read a `| undefined`
 * that would need discharging inside the per-pixel loop, which is the one place in this app where
 * that costs something real.
 */
export interface KeyBasis {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  /** The direction shading runs along: the key's own, or the grey axis where the key has none. */
  readonly shadeR: number;
  readonly shadeG: number;
  readonly shadeB: number;
  /** The direction washing runs along, perpendicular to the above. Zeroes for an achromatic key. */
  readonly veilR: number;
  readonly veilG: number;
  readonly veilB: number;
}

/** The plane a key's own variation lies in, as the orthonormal pair {@link KeyBasis} describes. */
export function keyBasis(color: Rgba): KeyBasis {
  const length = Math.hypot(color.r, color.g, color.b);
  const scale = length < NO_DIRECTION ? 0 : 1 / length;
  const shadeR = length < NO_DIRECTION ? GREY_AXIS : color.r * scale;
  const shadeG = length < NO_DIRECTION ? GREY_AXIS : color.g * scale;
  const shadeB = length < NO_DIRECTION ? GREY_AXIS : color.b * scale;

  // Gram-Schmidt: whatever is left of the achromatic axis once the shading direction is taken out of
  // it. For a chromatic key that is the direction the colour washes toward white along; for a key
  // that is already grey it is nothing, which is the degenerate case below.
  const dot = GREY_AXIS * (shadeR + shadeG + shadeB);
  const residualR = GREY_AXIS - dot * shadeR;
  const residualG = GREY_AXIS - dot * shadeG;
  const residualB = GREY_AXIS - dot * shadeB;
  const residual = Math.hypot(residualR, residualG, residualB);
  const veil = residual < NO_DIRECTION ? 0 : 1 / residual;

  return {
    r: color.r,
    g: color.g,
    b: color.b,
    shadeR,
    shadeG,
    shadeB,
    veilR: residualR * veil,
    veilG: residualG * veil,
    veilB: residualB * veil,
  };
}

/**
 * The squared distance from the key to the pixel at `offset`, with the key's own plane discounted.
 *
 * Squared, so the caller compares against a squared radius and no square root is taken sixteen
 * million times. Alpha is not a channel here: a key field is opaque by definition, so a pixel's own
 * alpha says nothing about whether it is background — `keyBackground` reads that separately.
 *
 * **The result cannot be negative.** The two projections are orthonormal, so their squares sum to at
 * most the whole squared length, and what is taken away is a fraction of that sum.
 */
export function keyDistanceSquared(data: Uint8ClampedArray, offset: number, basis: KeyBasis): number {
  const dr = (data[offset] ?? 0) - basis.r;
  const dg = (data[offset + 1] ?? 0) - basis.g;
  const db = (data[offset + 2] ?? 0) - basis.b;

  const shade = dr * basis.shadeR + dg * basis.shadeG + db * basis.shadeB;
  const veil = dr * basis.veilR + dg * basis.veilG + db * basis.veilB;

  return dr * dr + dg * dg + db * db - PLANE_DISCOUNT * (shade * shade + veil * veil);
}
