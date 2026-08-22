import { describe, expect, it } from 'vitest';
import { FRINGE_TOLERANCE_CEILING, KEY_TOLERANCES } from '../constants/quantiser.ts';
import type { Rgba } from '../types/quantiser.ts';
import { fromHex } from './imageData.ts';
import { carriesKeyTint, keyBasis, keyDistanceSquared } from './keyDistance.ts';
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
 * Colours a sprite is made of, including the two that sit nearest the recommended key and the one
 * that sits furthest from it.
 *
 * Rose and purple are the pair that matters for the *radius*: both are exactly 127 from `#FF00FF` in
 * a straight line, which is where a washed-out field sits too.
 *
 * **`#101010` is the one that matters for everything else**, and it was missing while the fringe pass
 * was believed to work. A blend is measured from the key, so how far one sits is decided mostly by how
 * far the colour it blends *with* sits — and against a near-black subject, which is what the reference
 * sheet's armour is, three parts key to one part artwork lands at 37, outside the ceiling. With no
 * dark colour in this list the ceiling's derivation looked sound and the halo survived on the sheet.
 */
const ARTWORK = ['#FFFFFF', '#C0C0C0', '#808080', '#FF0080', '#8000FF', '#FF0000', '#14B43C', '#D9A07A', '#4A3B33', '#101010'].map(rgb); // prettier-ignore

/** Whether the fringe pass's hue test claims the colour as a blend of the key. */
function tint(key: Rgba, color: Rgba): boolean {
  const pixel = Uint8ClampedArray.from([color.r, color.g, color.b, color.a]);
  return carriesKeyTint(pixel, 0, keyBasis(key));
}

/** A blend of the key and an artwork colour, in the share of key an anti-aliased edge lays down. */
function blend(key: Rgba, art: Rgba, keyShare: number): Rgba {
  const mix = (a: number, b: number): number => Math.round(keyShare * a + (1 - keyShare) * b);
  return { r: mix(key.r, art.r), g: mix(key.g, art.g), b: mix(key.b, art.b), a: 255 };
}

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

  it('claims every blend that is mostly the key, whatever the artwork behind it', () => {
    // The pass's contract at the share the ceiling was derived against, machine-checked over the
    // artwork set, because it is stated as a handful of numbers in two comments and all of them move
    // if the latitude does. Three parts key is halo whatever it is blended with, so each one has to
    // be taken — by the radius, or by the hue test where the artwork is too far for a radius to reach.
    for (const art of ARTWORK) {
      const halo = blend(MAGENTA, art, 0.75);
      const taken = distance(MAGENTA, halo) <= FRINGE_TOLERANCE_CEILING || tint(MAGENTA, halo);
      expect({ art, taken }).toEqual({ art, taken: true });
    }
  });

  it('claims a blend with an achromatic colour all the way down to a quarter key', () => {
    // What the hue test buys that a radius cannot, stated as the property rather than as a figure. A
    // mixture with something achromatic keeps the key's hue at every share, so the pass can follow it
    // down — while the distance runs away with whatever the key is mixed into, which is how the halo
    // against near-black came to sit further from the key than the artwork does.
    for (const art of ['#FFFFFF', '#C0C0C0', '#808080', '#101010'].map(rgb)) {
      for (const share of [0.75, 0.5, 0.25]) {
        const halo = blend(MAGENTA, art, share);
        const taken = distance(MAGENTA, halo) <= FRINGE_TOLERANCE_CEILING || tint(MAGENTA, halo);
        expect({ art, share, taken }).toEqual({ art, share, taken: true });
      }
    }
  });

  it('claims no unblended artwork colour, by either test', () => {
    // The other side of the same contract, and the one that keeps the pass an edge clean-up: a pixel
    // that is none of the key must survive touching the field, or every silhouette on the sheet comes
    // back a pixel thinner and nothing says so.
    for (const art of ARTWORK) {
      const taken = distance(MAGENTA, art) <= FRINGE_TOLERANCE_CEILING || tint(MAGENTA, art);
      expect({ art, taken }).toEqual({ art, taken: false });
    }
  });

  it('reads a blend with something achromatic as the key’s own hue, however dark it is', () => {
    // Why the hue test exists. Mixing the key with a grey scales its chroma and turns it nowhere, so
    // the pixel keeps the key's hue all the way down — while the distance the radius measures runs
    // away with the grey. At a quarter key against near-black the distance is 57, which is further
    // from the key than the *nearest artwork colour* is — so no radius separates that blend from the
    // sprite — and the hue is still magenta's.
    for (const share of [0.75, 0.5, 0.25]) {
      const halo = blend(MAGENTA, rgb('#101010'), share);
      expect({ share, tinted: tint(MAGENTA, halo) }).toEqual({ share, tinted: true });
    }
    expect(distance(MAGENTA, blend(MAGENTA, rgb('#101010'), 0.25))).toBeGreaterThan(
      Math.min(...ARTWORK.map((art) => distance(MAGENTA, art))),
    );
  });

  it('reads a blend with a colour of its own as that colour, not as the key', () => {
    // The bound on the hue test, and the reason it measures the chroma standing off the key's axis
    // rather than only the chroma along it. Red projects nearly half its chroma onto magenta's axis,
    // so a share test alone would call the armour plate a blend of the background.
    expect(tint(MAGENTA, rgb('#FF0000'))).toBe(false);
    expect(tint(MAGENTA, rgb('#14B43C'))).toBe(false);
  });

  it('gives a key with no hue no tint test either, which is the same rule as the latitude', () => {
    // `PURE_WHITE` and `PURE_BLACK` have no hue for a blend to keep, so there is nothing to measure —
    // and the answer must be a refusal rather than a direction read out of arithmetic noise. Their
    // chroma is not exactly zero (about 9.5e-6 for white), so a threshold below that noise floor
    // hands back a random hue, against which every grey in the sheet reads as a perfect blend.
    for (const key of [WHITE, BLACK]) {
      for (const art of ARTWORK) {
        expect({ key, art, tinted: tint(key, art) }).toEqual({ key, art, tinted: false });
      }
      expect(tint(key, rgb('#870887'))).toBe(false);
    }
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
