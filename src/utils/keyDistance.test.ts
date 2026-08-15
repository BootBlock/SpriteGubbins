import { describe, expect, it } from 'vitest';
import { KEY_TOLERANCES } from '../constants/quantiser.ts';
import type { Rgba } from '../types/quantiser.ts';
import { keyBasis, keyDistanceSquared } from './keyDistance.ts';

const MAGENTA: Rgba = { r: 255, g: 0, b: 255, a: 255 };
const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 255 };
const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 255 };

/** A colour written the way the rest of the app writes one, from the `#RRGGBB` a reader recognises. */
function rgb(hex: string): Rgba {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
    a: 255,
  };
}

/** The distance the keying actually measures, unsquared so the numbers read as the ladder's do. */
function distance(key: Rgba, color: Rgba): number {
  const pixel = Uint8ClampedArray.from([color.r, color.g, color.b, color.a]);
  return Math.sqrt(keyDistanceSquared(pixel, 0, keyBasis(key)));
}

/**
 * The straight Euclidean distance this metric replaced, kept here and nowhere else.
 *
 * Not a second implementation of anything shipped — it is the *subject* of the first case below,
 * which states the defect the file exists to fix. Deleting it would leave that case asserting the
 * new metric works without saying what it works better than.
 */
function plainDistance(key: Rgba, color: Rgba): number {
  return Math.hypot(color.r - key.r, color.g - key.g, color.b - key.b);
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
    // Three colours the same 127 from the key in a straight line. Two of them are the key shaded and
    // the key washed out; the third is a different colour. Only the third is measured at full weight.
    const washed = rgb('#FF7FFF');
    const rose = rgb('#FF0080');
    expect(plainDistance(MAGENTA, washed)).toBe(plainDistance(MAGENTA, rose));
    expect(distance(MAGENTA, washed)).toBeLessThan(distance(MAGENTA, rose));
  });

  it('keeps the latitude bounded, so the key’s plane is cheap rather than free', () => {
    // Pure green lies *in* the magenta plane — both have red equal to blue — so nothing about the
    // direction of the difference counts against it. It is still beyond every tolerance the control
    // offers, because halving a very large distance leaves a large one.
    expect(distance(MAGENTA, rgb('#00FF00'))).toBeGreaterThan(Math.max(...KEY_TOLERANCES));
  });

  it('gives an achromatic key lightness as its latitude and nothing else', () => {
    // White and black are already on the grey axis, so the plane collapses onto it: greys are what
    // they vary toward, and any trace of colour is measured whole. Strong enough to *invert* the
    // straight-line ordering — the grey below is further from white in a straight line than the pink
    // is, and nearer once the key's own axis is discounted.
    const grey = rgb('#636363');
    const pink = rgb('#FF6363');
    expect(plainDistance(WHITE, grey)).toBeGreaterThan(plainDistance(WHITE, pink));
    expect(distance(WHITE, grey)).toBeLessThan(distance(WHITE, pink));

    // Black is the case with no direction of its own at all — scaling it toward black leaves it where
    // it was — so the fallback to the grey axis is what makes it behave like white's mirror rather
    // than dividing by a zero-length vector.
    const dark = rgb('#303030');
    const green = rgb('#005300');
    expect(plainDistance(BLACK, dark)).toBeCloseTo(plainDistance(BLACK, green), 0);
    expect(distance(BLACK, dark)).toBeLessThan(distance(BLACK, green));
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
