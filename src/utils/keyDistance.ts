import {
  KEY_LATITUDE_FLOOR,
  KEY_SHADING_LATITUDE,
  KEY_TINT_OFF_HUE,
  KEY_TINT_SHARE,
} from '../constants/quantiser.ts';
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
 * a diagonal to be projected out — it *is* the L axis, `(1, 0, 0)`. So the plane is spanned by the
 * L axis and the key's hue on the `a`/`b` plane, and a difference's part in it is its change of
 * lightness together with its change of chroma along that hue. The same construction in RGB
 * held those two properties only approximately, on top of a metric that crowds dark colours and
 * spreads light ones; here the geometry the discount reasons about is the geometry the space
 * actually has. Measured in it, a painted field's drift reads 12 to 21 — the far end a wash
 * halfway to white — while the nearest hues that are not the key, rose and purple, read 40 and
 * 49. OKLab alone separates those sets where RGB overlapped them; the discount is what turns a
 * close call into a two-to-one margin, and what keeps a field shaded deeper than the fixtures
 * cheap while a hue drift never is.
 *
 * **The plane is unbounded, so the discount is bounded by the key's hue.** Shading and washing
 * reach only the triangle black–key–white, but the plane also holds every grey and every colour on
 * the far side of the grey axis — greens and teals against a magenta key. None of those is a
 * variation of the key, and while the whole plane was discounted each measured about half its
 * distance: mid grey read 43 and a mid green 64, so the ladder's top rung took the field and, with
 * it, 41% to 86% of the artwork on the three test sheets it was measured on. What a variation keeps
 * and they lack is the key's hue, so a pixel is discounted only while it carries at least
 * {@link KEY_LATITUDE_FLOOR} of the key's chroma along the key's own hue, and is measured straight
 * below that. The plane says which differences are cheap and the floor says for which pixels.
 * Neither says any difference is free.
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
 * is why the key's hue is worked out once by {@link keyBasis}, and why {@link keyDistanceSquared}
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
 * Below this, the key's chroma is treated as having no direction at all.
 *
 * It does not arrive as an exact zero when it should, because Ottosson's matrix rows do not sum to
 * exactly one, so the test has to be a threshold rather than an equality. The key's chroma runs 0
 * to about 80 and is zero only for the achromatic keys — `PURE_WHITE`, `PURE_BLACK` and any grey.
 * Their noise reaches 9.5e-6, which is what `PURE_WHITE` computes to, while the smallest chroma any
 * non-grey byte triple carries is 0.27. The constant has to sit between those two figures, and 1e-4
 * is ten times above the first and more than two thousand times below the second.
 */
const NO_DIRECTION = 1e-4;

/**
 * The key colour together with its hue, worked out once per image.
 *
 * The hue is a unit direction on the `a`/`b` plane, and it is all either reader needs.
 * {@link keyDistanceSquared} takes the plane of the key's own variation as that direction together
 * with the L axis: the two are perpendicular and of unit length, so a difference's part in the plane
 * is the sum of two squared dot products, and one of them is the difference's own `L`.
 * {@link carriesKeyTint} needs the direction alone, because a blend of the key with something
 * achromatic keeps the key's hue exactly and loses its length — a fact about the two chroma axes.
 *
 * Zero chroma — `PURE_WHITE`, `PURE_BLACK`, any grey — names no direction, and all three hue fields
 * are left at zero for it. That zero is what both readers test to refuse such a key its latitude and
 * its tint.
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
  /** How much chroma the key carries, and which way on the `a`/`b` plane. Zeroes for an achromatic key. */
  readonly chroma: number;
  readonly hueA: number;
  readonly hueB: number;
}

/** The key's position and hue, as {@link KeyBasis} describes them — with no hue for a key that has none. */
export function keyBasis(color: Rgba): KeyBasis {
  const key = srgbToOklab(color.r, color.g, color.b);
  const chroma = Math.hypot(key.a, key.b);
  if (chroma < NO_DIRECTION) return { L: key.L, a: key.a, b: key.b, chroma: 0, hueA: 0, hueB: 0 };
  return { L: key.L, a: key.a, b: key.b, chroma, hueA: key.a / chroma, hueB: key.b / chroma };
}

/**
 * The pixel being measured, converted in place — one object for the life of the module rather than
 * one per call.
 *
 * Safe because nothing can interleave: the conversion and the arithmetic below complete within one
 * synchronous call, JavaScript preempts nothing, and neither step calls out to anything that could
 * re-enter. **Two functions share it** — {@link keyDistanceSquared} and {@link carriesKeyTint} — and
 * that costs nothing beyond the same rule: each writes it and reads it back inside its own call, so
 * neither can be looking at the other's pixel. `keyBackground` calls the two in one short-circuit
 * `||` on a single offset, strictly in sequence, and `despillKey` keeps a scratch of its own for the
 * pixel it rewrites. What the scratch buys is real — the pair runs up to
 * three times per pixel of a sixteen-megapixel sheet, and an allocation per call is fifty million
 * short-lived objects fed to the collector mid-pass.
 */
const PIXEL: MutableOklab = { L: 0, a: 0, b: 0 };

/**
 * The squared distance from the key to the pixel at `offset`, with the key's own plane discounted
 * for a pixel that still carries the key's hue.
 *
 * Squared, so the caller compares against a squared radius and no square root is taken sixteen
 * million times. Alpha is not a channel here: a key field is opaque by definition, so a pixel's own
 * alpha says nothing about whether it is background — `keyBackground` reads that separately.
 *
 * **The result cannot be negative.** The L axis and the key's hue are orthonormal, so the squares of
 * the difference's two components along them sum to at most the whole squared length, and what is
 * taken away is a fraction of that sum.
 */
export function keyDistanceSquared(data: Uint8ClampedArray, offset: number, basis: KeyBasis): number {
  srgbToOklabInto(PIXEL, data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0);
  const dL = PIXEL.L - basis.L;
  const da = PIXEL.a - basis.a;
  const db = PIXEL.b - basis.b;
  const straight = dL * dL + da * da + db * db;

  // No hue, no plane: the achromatic keys are measured straight. Otherwise the pixel's own chroma
  // along the key's hue decides whether it is a variation of the key at all — a grey carries none of
  // it and a green carries less than none, and both lie in the plane. See `KEY_LATITUDE_FLOOR`.
  if (basis.chroma === 0) return straight;
  const onAxis = PIXEL.a * basis.hueA + PIXEL.b * basis.hueB;
  if (onAxis < KEY_LATITUDE_FLOOR * basis.chroma) return straight;

  // From the difference rather than as `onAxis − chroma`: the two are equal in exact arithmetic, but
  // only this one is exactly zero for the key itself and never longer than the difference it is
  // taken from, which is what keeps the result at or above zero.
  const hue = da * basis.hueA + db * basis.hueB;
  return straight - PLANE_DISCOUNT * (dL * dL + hue * hue);
}

/**
 * Whether the pixel at `offset` carries the key's own hue — the question a *blend* answers, where
 * {@link keyDistanceSquared} answers the question a *field* answers.
 *
 * The two are different questions, and the second one cannot be asked with a radius. A pixel on an
 * anti-aliased silhouette is a mixture of the key and whatever lies beside it, so how far it sits
 * from the key is decided mostly by how far *that* is — and the further down the mixture runs, the
 * more of the answer the partner supplies. Three parts key is safe whatever the partner:
 * `FRINGE_TOLERANCE_CEILING`'s own derivation measures the worst of them at 21, and the radius
 * takes it. **Half and below is where the partner decides.** Half the recommended magenta into a mid
 * grey measures 19 and the radius still takes it; the same half into the near-black this app's
 * reference sheet is mostly made of measures **37**, and a quarter measures **57**.
 *
 * There is no radius that separates those from the sprite, because the sprite is what those numbers
 * are mostly measuring the distance to: the nearest colour to the key that is not a blend of it sits
 * at **40**, between the two. A ceiling loose enough to reach the dark half-blend reaches unblended
 * artwork in the same step, and the sheet comes back a pixel thinner on every silhouette — which is
 * the failure the ceiling was introduced to stop. The radius is correctly placed, and it cannot be
 * the whole test.
 *
 * What a mixture does keep is the key's **hue**. Mixing the key with something achromatic scales its
 * `a` and `b` together and moves neither off the direction they point in, so the pixel's chroma
 * stays on the key's own axis and only shortens. That is the measurement here, in two parts:
 *
 * - **The share** — how much of the key's chroma the pixel carries along that axis, as a fraction.
 *   1 is the key itself and 0 is any grey. It tracks the mixing fraction rather than equalling it:
 *   OKLab's cube root is not affine, so three parts key over white reads 0.91 and over near-black
 *   0.81. Monotone is all the floor needs. {@link KEY_TINT_SHARE} is that floor.
 * - **The hue angle** — whatever chroma is left once the key's axis is taken out, as a fraction of
 *   what lies *along* it. A mixture with a grey has none at any depth. A colour of its own turns a
 *   long way: the armour plate's red projects 0.56 of its chroma onto magenta's axis and 0.83 off it.
 *   {@link KEY_TINT_OFF_HUE} is the ceiling, and its docblock records why the ratio is taken against
 *   the pixel's own on-axis chroma rather than against the key's.
 *
 * **It is not a licence to erode, and it is not asked everywhere.** `keyBackground` asks it only of
 * a pixel that is 4-adjacent to the keyed field, and the erosion is one pixel deep. `despillKey`
 * asks it a few pixels further in, and only to recolour. Asked of the whole sheet it would take
 * every faintly key-tinted pixel of the artwork with it.
 *
 * **Adjacency is a bound and not a proof, which is the honest limit here.** On a keyed sheet every
 * silhouette pixel touches the field, so the restriction stops the pass reaching *into* a sprite but
 * cannot tell a sprite's outermost pixel from the halo over it. Only colour can, and colour runs out
 * exactly where a sprite is painted in the key's own hue at reduced chroma — which is what the key
 * mixed with white *is*. {@link KEY_TINT_OFF_HUE} names the three palette entries this costs and the
 * setting that gets them back.
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

  // Whatever chroma the pixel carries that is not on the key's axis, measured against the pixel's
  // *own* on-axis chroma rather than the key's. That ratio is the tangent of the angle between the
  // two hues, so the test is one angle at every chroma — see `KEY_TINT_OFF_HUE` for why measuring it
  // against the key's chroma instead opened the cone wide at the bottom of the share range.
  const onAxis = share * basis.chroma;
  const offA = PIXEL.a - onAxis * basis.hueA;
  const offB = PIXEL.b - onAxis * basis.hueB;
  return Math.hypot(offA, offB) <= KEY_TINT_OFF_HUE * onAxis;
}
