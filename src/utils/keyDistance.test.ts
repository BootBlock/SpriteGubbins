import { describe, expect, it } from 'vitest';
import { FRINGE_TOLERANCE_CEILING, KEY_TOLERANCES } from '../constants/quantiser.ts';
import type { Rgba } from '../types/quantiser.ts';
import { fromHex } from './imageData.ts';
import { keyBasis, keyDistanceSquared } from './keyDistance.ts';
import { srgbToOklab } from './oklab.ts';

/**
 * A colour from the `#RRGGBB` a reader recognises, through the app's own strict reader.
 *
 * `fromHex` returns `null` on anything malformed rather than a fallback colour, and every literal
 * below is written by hand — so the throw is what stops a typo becoming a silent black that the
 * assertions then pass against.
 */
function rgb(hex: string): Rgba {
  const color = fromHex(hex);
  if (color === null) throw new Error(`not a colour: ${hex}`);
  return color;
}

const MAGENTA = rgb('#FF00FF');
const WHITE = rgb('#FFFFFF');
const BLACK = rgb('#000000');

/** The distance the keying actually measures, unsquared so the numbers read as the ladder's do. */
function distance(key: Rgba, color: Rgba): number {
  const pixel = Uint8ClampedArray.from([color.r, color.g, color.b, color.a]);
  return Math.sqrt(keyDistanceSquared(pixel, 0, keyBasis(key)));
}

/**
 * The straight RGB Euclidean distance the keying began with, kept here and nowhere else.
 *
 * Not a second implementation of anything shipped — it is the *subject* of the first case below,
 * which states the defect the file exists to fix. Deleting it would leave that case asserting the
 * new metric works without saying what it works better than.
 */
function plainDistance(key: Rgba, color: Rgba): number {
  return Math.hypot(color.r - key.r, color.g - key.g, color.b - key.b);
}

/**
 * The straight OKLab distance — the metric with its latitude removed, which is what an achromatic
 * key is measured by and what the discount is judged against.
 */
function straightDistance(key: Rgba, color: Rgba): number {
  const a = srgbToOklab(key.r, key.g, key.b);
  const b = srgbToOklab(color.r, color.g, color.b);
  return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b);
}

/**
 * A magenta field as a generator actually returns one — painted at varying purity and lightness
 * rather than filled, then squeezed through a lossy encode.
 *
 * Every one of these is unmistakably the field to a reader looking at the sheet, and the last is the
 * far end of it: the key colour washed halfway to white.
 */
const FIELD = ['#FA05FA', '#E754D8', '#C41BB4', '#FF33CC', '#E020B0', '#FF7FFF'].map(rgb);

/**
 * Colours a sprite is made of, including the two that sit nearest the recommended key.
 *
 * Rose and purple are the pair that matters: both are exactly 127 from `#FF00FF` in a straight line,
 * which is where a washed-out field sits too.
 */
const ARTWORK = ['#FFFFFF', '#C0C0C0', '#808080', '#FF0080', '#8000FF', '#FF0000', '#14B43C', '#D9A07A', '#4A3B33'].map(rgb); // prettier-ignore

describe('keyDistance', () => {
  it('separates a painted field from the artwork, where a straight distance cannot', () => {
    // The whole defect, as one assertion. Measured plainly the two sets *overlap* — a field washed
    // toward white lands on top of rose and purple — so no tolerance existed that took the field and
    // left the sprite, whichever rung the user tried.
    const plainField = FIELD.map((color) => plainDistance(MAGENTA, color));
    const plainArtwork = ARTWORK.map((color) => plainDistance(MAGENTA, color));
    expect(Math.max(...plainField)).toBeGreaterThanOrEqual(Math.min(...plainArtwork));

    // With the key's own plane discounted they come apart, and a rung of the ladder falls in the gap.
    const field = FIELD.map((color) => distance(MAGENTA, color));
    const artwork = ARTWORK.map((color) => distance(MAGENTA, color));
    expect(Math.max(...field)).toBeLessThan(Math.min(...artwork));
    expect(KEY_TOLERANCES.some((rung) => Math.max(...field) <= rung && rung < Math.min(...artwork))).toBe(
      true,
    );
  });

  it('is zero for the key colour itself', () => {
    expect(distance(MAGENTA, MAGENTA)).toBe(0);
    expect(distance(WHITE, WHITE)).toBe(0);
    expect(distance(BLACK, BLACK)).toBe(0);
  });

  it('charges less for shading and washing than for the same journey into another hue', () => {
    // Two colours the same 127 from the key along a straight RGB line: one is the key washed toward
    // white, the other is rose. The discount is what tells them apart — the wash lies in the key's
    // own plane, so it is charged at the latitude, and the hue change is not.
    const washed = rgb('#FF7FFF');
    const rose = rgb('#FF0080');
    expect(plainDistance(MAGENTA, washed)).toBe(plainDistance(MAGENTA, rose));
    expect(distance(MAGENTA, washed)).toBeLessThan(distance(MAGENTA, rose));
    // And the discount is genuinely the discount doing it, not OKLab alone: measured straight in
    // OKLab the wash reads about twice what it reads discounted.
    expect(distance(MAGENTA, washed)).toBeLessThan(straightDistance(MAGENTA, washed) / 1.9);
  });

  it('keeps the latitude bounded, so the key’s plane is cheap rather than free', () => {
    // Pure green lies *in* the magenta plane — both have red equal to blue — so nothing about the
    // direction of the difference counts against it. It is still beyond every tolerance the control
    // offers, because halving a very large distance leaves a large one.
    expect(distance(MAGENTA, rgb('#00FF00'))).toBeGreaterThan(Math.max(...KEY_TOLERANCES));
  });

  it('gives a key with no hue no latitude, so it is measured straight', () => {
    // The case that makes the rule a rule rather than a plane applied everywhere. White and black sit
    // *on* the achromatic axis, so the plane collapses onto it — and moving along that axis away from
    // white is not the field varying, it is every grey in the sheet. Discounting it would discount the
    // one direction that separates those keys from artwork, so they get no discount at all: the
    // measurement is the straight OKLab distance, undiscounted.
    for (const key of [WHITE, BLACK]) {
      for (const sample of ['#DBDBDB', '#808080', '#242424', '#FF6363', '#005300', '#14B43C']) {
        expect(distance(key, rgb(sample))).toBeCloseTo(straightDistance(key, rgb(sample)), 9);
      }
    }

    // Black is also the key with no direction of its own — scaling it toward black leaves it where it
    // was — so it reaches that answer through a different guard than white does. Same answer, and
    // neither divides by a zero-length vector on the way.
    expect(keyBasis(BLACK)).toEqual(keyBasis({ ...BLACK }));
    expect(distance(BLACK, BLACK)).toBe(0);
  });

  it('keeps the fringe ceiling between the halo it must take and the artwork it must not', () => {
    // The ceiling's whole derivation, machine-checked, because it is stated as two numbers in a
    // comment and both of them move if the latitude does. It has to sit ABOVE every blend that is
    // mostly key colour — or the halo the fringe pass exists to erode survives — and BELOW every
    // colour that is not the key's own hue, or the pass eats a pixel of the sprite's contour.
    const worstHalo = Math.max(
      ...ARTWORK.map((art) =>
        distance(MAGENTA, {
          r: 0.75 * MAGENTA.r + 0.25 * art.r,
          g: 0.75 * MAGENTA.g + 0.25 * art.g,
          b: 0.75 * MAGENTA.b + 0.25 * art.b,
          a: 255,
        }),
      ),
    );

    expect(worstHalo).toBeLessThanOrEqual(FRINGE_TOLERANCE_CEILING);
    expect(FRINGE_TOLERANCE_CEILING).toBeLessThan(Math.min(...ARTWORK.map((art) => distance(MAGENTA, art))));
  });

  it('never reports a negative distance, whatever the key and the pixel', () => {
    // The projections are orthonormal, so what is discounted is a fraction of the whole rather than
    // possibly more than it. Walked rather than argued, because the guarantee is what lets the caller
    // compare a squared distance against a squared radius without a floor.
    for (const key of [MAGENTA, WHITE, BLACK, rgb('#14B43C')]) {
      const basis = keyBasis(key);
      for (let channel = 0; channel <= 255; channel += 5) {
        const pixel = Uint8ClampedArray.from([channel, 255 - channel, (channel * 2) % 256, 255]);
        expect(keyDistanceSquared(pixel, 0, basis)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
