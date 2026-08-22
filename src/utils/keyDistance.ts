import { KEY_SHADING_LATITUDE, KEY_TINT_OFF_HUE, KEY_TINT_SHARE } from '../constants/quantiser.ts';
import type { Rgba } from '../types/quantiser.ts';
import { type MutableOklab, srgbToOklab, srgbToOklabInto } from './oklab.ts';

/**
 * How far a pixel sits from the background key, measured so that the ways a key *field* varies cost
 * less than the ways a different colour differs.
 *
 * The straight Euclidean distance this began as could not express that, and the failure it produced
 * was not a near miss. On a returned sheet whose magenta field had been painted rather than filled,
 * the drifted field pixels and the sprite's rose and purple fell inside the same rung of the
 * tolerance ladder, so **no threshold existed** that took the field and left the artwork: every
 * setting loose enough to clear the field was one step away from eating hues that were never the
 * key, and the setting below it left the field on screen. That is what a user sees as "the keying
 * does not work".
 *
 * What tells the two apart is the *direction* the difference points in, not its length. A field
 * drifts by being **shaded** (the key mixed toward black) or **washed out** (mixed toward white),
 * and both of those stay in the plane spanned by the key colour and the achromatic axis — the plane
 * that holds black, the key and white. A pixel that is a different colour leaves that plane. So the
 * difference is split into the part lying in the plane and the part standing off it, and only the
 * part standing off it is measured at full weight; the rest is divided by
 * {@link KEY_SHADING_LATITUDE}.
 *
 * **The measurement is taken in scaled OKLab, and the plane is at home there.** In OKLab a shade
 * series is not approximately a direction, it is exactly one: scaling a colour's linear light by
 * `s` scales all three cone responses by `s`, so every coordinate scales by the one factor `s^⅓`
 * and the whole series lies on the ray from black through the key. And the achromatic axis is not
 * a diagonal to be projected out — it *is* the L axis, `(1, 0, 0)`. The same construction in RGB
 * held those two properties only approximately, on top of a metric that crowds dark colours and
 * spreads light ones; here the geometry the discount reasons about is the geometry the space
 * actually has. Measured in it, a painted field's drift reads 12 to 21 — the far end a wash
 * halfway to white — while the nearest hues that are not the key, rose and purple, read 40 and
 * 49. OKLab alone separates those sets where RGB overlapped them; the discount is what turns a
 * close call into a two-to-one margin, and what keeps a field shaded deeper than the fixtures
 * cheap while a hue drift never is.
 *
 * **The latitude is bounded, and that is what stops the plane being a licence.** Pure green lies
 * *in* the magenta plane — its difference from magenta has almost no component off it — and is
 * keyed at no tolerance the control offers, because halving a distance of 163 still leaves 82.
 * The plane says which differences are cheap. It never says any of them are free.
 *
 * **A key with no hue gets no latitude, and that is the same rule rather than an exception to it.**
 * What the plane holds is the variations that keep the key's *hue* — which is what makes them cheap,
 * because hue is what the key is being told apart by. `PURE_WHITE` and `PURE_BLACK` have none. For
 * them the plane collapses onto the L axis, and moving along that axis from white is not the field
 * varying, it is the artwork: shading white is how you get every grey in the sheet. So the discount
 * would run along precisely the direction that distinguishes key from art, and the answer is that
 * there is nothing to discount. Both keys fall back to the straight distance — now the straight
 * *OKLab* distance, which is the right measurement for a grey ramp in a way the RGB one never was:
 * it spaces the dark greys as far apart as a reader sees them.
 *
 * Pure, and called once or twice for every pixel of an image that may be `MAX_IMAGE_PIXELS` — which
 * is why the plane is worked out once by {@link keyBasis}, and why {@link keyDistanceSquared}
 * converts the pixel into a module-owned scratch rather than allocating an object per call.
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

/**
 * Below this, a vector is treated as having no direction at all.
 *
 * Three different vectors are tested against it, on two different scales, and one threshold serves
 * all of them with room to spare. None of them arrives as an exact zero when it should, because
 * Ottosson's matrix rows do not sum to exactly one, so each test has to be a threshold rather than
 * an equality.
 *
 * - The **key's own length** runs 0 to 255, and only `PURE_BLACK` reaches zero there: black is
 *   OKLab's origin, and the darkest key a byte can express besides it measures about 9.4.
 * - The **residual** — whatever is left of the L axis once the key's direction is projected out —
 *   runs 0 to 1, and is zero for `PURE_WHITE` and for any grey. A grey's computes to about 4e-8,
 *   and the nearest-to-grey key whole bytes can express, `#FEFFFF`, measures 1.1e-3.
 * - The key's **chroma**, which {@link carriesKeyTint} needs a direction from, runs 0 to about 80
 *   and is zero for the same achromatic keys. Their noise reaches further here than the residual's
 *   does — `PURE_WHITE` computes to 9.5e-6 — while the smallest chroma any non-grey byte triple
 *   carries is 0.27.
 *
 * Those two innermost figures are what fix the constant: it has to sit above 9.5e-6 and below
 * 1.1e-3, and 1e-4 is very nearly the geometric middle of them, leaving an order of magnitude on
 * each side. Every other margin above is thousands of times wider.
 */
const NO_DIRECTION = 1e-4;

/**
 * The key colour together with the plane its own variation lies in, worked out once per image.
 *
 * Two orthonormal vectors rather than the key and the L axis themselves, because the projection
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
  /** The key's own position, on the scaled OKLab axes every gate measures along. */
  readonly L: number;
  readonly a: number;
  readonly b: number;
  /** The direction shading runs along — the ray from black through the key. Zeroes for an achromatic key. */
  readonly shadeL: number;
  readonly shadeA: number;
  readonly shadeB: number;
  /** The direction washing runs along, perpendicular to the above. Zeroes for an achromatic key. */
  readonly veilL: number;
  readonly veilA: number;
  readonly veilB: number;
  /**
   * How much chroma the key itself carries, and which way on the `a`/`b` plane it carries it.
   *
   * {@link carriesKeyTint} is the only reader, and it needs the key's hue as a *direction* rather
   * than as the plane above: a blend of the key with something achromatic keeps the key's hue
   * exactly and loses its length, which is a fact about the two chroma axes alone. Zero chroma —
   * `PURE_WHITE`, `PURE_BLACK`, any grey — names no direction, and the two components are left at
   * zero for it.
   */
  readonly chroma: number;
  readonly hueA: number;
  readonly hueB: number;
}

/**
 * The plane a key's own variation lies in, as the orthonormal pair {@link KeyBasis} describes — or no
 * plane at all, where the key has no hue for one to preserve.
 *
 * Both early returns hand back the same thing: a basis of zeroes, which contributes nothing to either
 * dot product and leaves {@link keyDistanceSquared} computing the straight distance. They are two
 * routes to one answer rather than two cases, because a key that is achromatic *by having no length*
 * and a key that is achromatic *by lying on the L axis* are the same key as far as this is
 * concerned.
 */
export function keyBasis(color: Rgba): KeyBasis {
  const key = srgbToOklab(color.r, color.g, color.b);
  // Worked out before either early return, because it is a different question from the plane's and
  // is answered for keys the plane is not: a key with a hue has one whether or not the Gram-Schmidt
  // below leaves a direction to wash along. An achromatic key has none, and the zeroes say so.
  const chroma = Math.hypot(key.a, key.b);
  const hue =
    chroma < NO_DIRECTION
      ? { chroma: 0, hueA: 0, hueB: 0 }
      : { chroma, hueA: key.a / chroma, hueB: key.b / chroma };
  const straight: KeyBasis = {
    L: key.L,
    a: key.a,
    b: key.b,
    shadeL: 0,
    shadeA: 0,
    shadeB: 0,
    veilL: 0,
    veilA: 0,
    veilB: 0,
    ...hue,
  };

  // `PURE_BLACK` is the origin, so it names no direction to be shaded along — mixing black toward
  // black leaves it where it was — and dividing by its length would be dividing by zero. It is
  // achromatic besides, so it wants the same answer the second guard gives white.
  const length = Math.hypot(key.L, key.a, key.b);
  if (length < NO_DIRECTION) return straight;

  const shadeL = key.L / length;
  const shadeA = key.a / length;
  const shadeB = key.b / length;

  // Gram-Schmidt: whatever is left of the achromatic axis once the key's own direction is taken out
  // of it. The axis is simply `(1, 0, 0)` here — L is what achromatic means in this space — so the
  // dot product collapses to the shade vector's own L component. For a key with a hue the residual
  // is the direction it washes toward white along.
  const residualL = 1 - shadeL * shadeL;
  const residualA = -shadeL * shadeA;
  const residualB = -shadeL * shadeB;
  const residual = Math.hypot(residualL, residualA, residualB);

  // Nothing left over means the key *is* the achromatic axis — `PURE_WHITE`, or any grey. It has no
  // hue, so it has no plane of hue-preserving variation, so it has no latitude to give.
  if (residual < NO_DIRECTION) return straight;

  return {
    L: key.L,
    a: key.a,
    b: key.b,
    shadeL,
    shadeA,
    shadeB,
    veilL: residualL / residual,
    veilA: residualA / residual,
    veilB: residualB / residual,
    ...hue,
  };
}

/**
 * The pixel being measured, converted in place — one object for the life of the module rather than
 * one per call.
 *
 * Safe because nothing can interleave: the conversion and the arithmetic below complete within one
 * synchronous call, JavaScript preempts nothing, and neither step calls out to anything that could
 * re-enter. What the scratch buys is real — {@link keyDistanceSquared} runs up to twice per pixel
 * of a sixteen-megapixel sheet, and an allocation per call is thirty-three million short-lived
 * objects fed to the collector mid-pass.
 */
const PIXEL: MutableOklab = { L: 0, a: 0, b: 0 };

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
  srgbToOklabInto(PIXEL, data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0);
  const dL = PIXEL.L - basis.L;
  const da = PIXEL.a - basis.a;
  const db = PIXEL.b - basis.b;

  const shade = dL * basis.shadeL + da * basis.shadeA + db * basis.shadeB;
  const veil = dL * basis.veilL + da * basis.veilA + db * basis.veilB;

  return dL * dL + da * da + db * db - PLANE_DISCOUNT * (shade * shade + veil * veil);
}

/**
 * Whether the pixel at `offset` carries the key's own hue — the question a *blend* answers, where
 * {@link keyDistanceSquared} answers the question a *field* answers.
 *
 * The two are different questions, and the second one cannot be asked with a radius. A pixel on an
 * anti-aliased silhouette is a mixture of the key and whatever lies beside it, so how far it sits
 * from the key is decided mostly by how far *that* is: three-quarters of the recommended magenta
 * mixed into a mid-tone measures about 21, and the same three-quarters mixed into the near-black
 * this app's reference sheet is mostly made of measures past 60. There is no radius between those
 * two and the artwork they are blends of, because the artwork is what the second number is measuring
 * the distance to. Widening the radius until it reaches the dark blends reaches the dark artwork in
 * the same step, and the sheet comes back a pixel thinner on every silhouette.
 *
 * What a mixture does keep is the key's **hue**. Mixing the key with something achromatic scales its
 * `a` and `b` together and moves neither off the direction they point in, so the pixel's chroma
 * stays on the key's own axis and only shortens. That is the measurement here, in two parts:
 *
 * - **The share** — how much of the key's chroma the pixel carries along that axis, as a fraction.
 *   1 is the key itself, 0 is any grey, and a mixture with a grey lands at the mixing fraction.
 *   {@link KEY_TINT_SHARE} is the floor.
 * - **The off-hue chroma** — whatever chroma is left once the key's axis is taken out, in the same
 *   units. A mixture with a grey has none. A colour of its own has plenty, which is what keeps the
 *   red of an armour plate — whose chroma projects nearly halfway onto magenta's axis — out of this.
 *   {@link KEY_TINT_OFF_HUE} is the ceiling.
 *
 * **It is not a licence to erode, and it is not asked everywhere.** `keyBackground` asks it only of
 * a pixel that is 4-adjacent to the keyed field, which is what makes a hue test safe: a pixel
 * touching the field and carrying the field's hue is a blend by construction. Asked of the whole
 * sheet it would take every faintly magenta-tinted pixel of the artwork with it.
 *
 * **An achromatic key is answered `false` rather than approximately.** `PURE_WHITE` and `PURE_BLACK`
 * have no hue for a blend to keep, so there is nothing here to measure — the same rule, and the same
 * reason, as the latitude they are refused above. For them the fringe pass keeps the radius alone,
 * which is the right instrument for a grey ramp.
 */
export function carriesKeyTint(data: Uint8ClampedArray, offset: number, basis: KeyBasis): boolean {
  if (basis.chroma === 0) return false;

  srgbToOklabInto(PIXEL, data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0);
  const share = (PIXEL.a * basis.hueA + PIXEL.b * basis.hueB) / basis.chroma;
  if (share < KEY_TINT_SHARE) return false;

  // Whatever chroma the pixel carries that is not on the key's axis, measured as a fraction of the
  // key's own chroma so the ceiling is one number rather than one per key.
  const offA = PIXEL.a - share * basis.chroma * basis.hueA;
  const offB = PIXEL.b - share * basis.chroma * basis.hueB;
  return Math.hypot(offA, offB) <= KEY_TINT_OFF_HUE * basis.chroma;
}
