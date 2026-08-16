import { describe, expect, it } from 'vitest';
import { BACKGROUND_KEY_COLORS } from '../constants/backgroundKeyColors.ts';
import { IDENTITY_PALETTE_SIZE } from '../constants/identityLock.ts';
import { imageFrom } from '../test/images.ts';
import { identityPalette } from './identityPalette.ts';

const MAGENTA = { r: 255, g: 0, b: 255, a: 255 };
const CHARCOAL = { r: 30, g: 30, b: 36, a: 255 };
const SLATE = { r: 51, g: 65, b: 85, a: 255 };
const AMBER = { r: 245, g: 158, b: 11, a: 255 };

/**
 * A keyed sheet: 64 magenta pixels, then charcoal, slate and amber in falling quantities.
 *
 * The proportions are the point — the key field is the largest region by area, exactly as it is on a
 * real sheet, so anything that fails to exclude it leads the digest with `#FF00FF`.
 */
const KEYED_SHEET = imageFrom(16, 8, (x, y) => {
  const n = y * 16 + x;
  if (n < 64) return MAGENTA;
  if (n < 96) return CHARCOAL;
  if (n < 118) return SLATE;
  return AMBER;
});

/**
 * Seven colours painted **smallest region first**, so scan order is the near-reverse of coverage
 * order — and one more colour than the digest holds, so the quantiser genuinely splits boxes.
 *
 * Both properties are load-bearing, and the second is the one an earlier version of this fixture
 * missed. `buildPalette` short-circuits to scan order whenever an image has no more colours than the
 * budget, so a fixture of three colours painted in descending size makes scan order *and* coverage
 * order the same answer — and a version that dropped the sort entirely still passed. The competing
 * order this has to rule out is `buildPalette`'s own, not merely the colours' numeric order.
 *
 * `NEAR_CHARCOAL` differs from `CHARCOAL` by one in a single channel, so the two share a box —
 * indeed the same histogram bin, which no cut can divide. It stands for the shading step every
 * sprite has, and its single pixel must be counted towards charcoal rather than claiming a slot of
 * its own.
 */
const NEAR_CHARCOAL = { r: 30, g: 30, b: 37, a: 255 };
const TEAL = { r: 13, g: 148, b: 136, a: 255 };
const ROSE = { r: 225, g: 29, b: 72, a: 255 };
const BASE = { r: 107, g: 114, b: 128, a: 255 };

const SMALLEST_FIRST = imageFrom(10, 10, (x, y) => {
  const n = y * 10 + x;
  if (n < 5) return AMBER; //           5 px
  if (n < 14) return ROSE; //           9 px
  if (n < 27) return SLATE; //         13 px
  if (n < 44) return TEAL; //          17 px
  if (n < 65) return CHARCOAL; //      21 px
  if (n < 66) return NEAR_CHARCOAL; //  1 px, merges into charcoal -> 22
  return BASE; //                      34 px
});

describe('identityPalette', () => {
  it('excludes the background key, so the digest describes the subject', () => {
    // The failure this exists for: on the recommended magenta the key is most of the image, and a
    // lock leading with #FF00FF tells the model the character is magenta.
    expect(identityPalette(KEYED_SHEET, MAGENTA)).toEqual(['#1E1E24', '#334155', '#F59E0B']);
  });

  it('orders by how much of the sheet each colour covers, most-used first', () => {
    // Neither scan order (amber first, it is painted first) nor the box order buildPalette returns
    // produces this answer — only totalling each entry's coverage does.
    expect(identityPalette(SMALLEST_FIRST, MAGENTA)).toEqual([
      '#6B7280',
      '#1E1E24',
      '#0D9488',
      '#334155',
      '#E11D48',
      '#F59E0B',
    ]);
  });

  it('breaks a tie by colour, so equal coverage still orders the same way every run', () => {
    // `sort` alone would only promise to leave equal entries as it found them, which is scan order —
    // so the slate painted first would lead. The explicit tie-break is what makes this repeatable.
    const evenSplit = imageFrom(8, 5, (x, y) => (y * 8 + x < 20 ? SLATE : CHARCOAL));
    expect(identityPalette(evenSplit, MAGENTA)).toEqual(['#1E1E24', '#334155']);
  });

  it('totals a colour across its opacities instead of spending slots on them', () => {
    // A soft shadow or an anti-aliased edge is one colour at many opacities — which is what models
    // return, and the reason the Quantise tab exists. Alpha is one of the four channels a group is
    // split across, so left alone those opacities are a dozen colours competing for the digest's
    // six slots, and a 14% colour can lead the 72% one. Flattened, coverage totals per colour.
    const softShadow = imageFrom(10, 10, (x, y) => {
      const n = y * 10 + x;
      if (n < 72) return { ...CHARCOAL, a: [40, 90, 140, 190, 240, 255][n % 6] ?? 255 };
      if (n < 86) return { r: 40, g: 40, b: 46, a: 255 };
      return { r: 50, g: 50, b: 56, a: 255 };
    });

    expect(identityPalette(softShadow, MAGENTA)).toEqual(['#1E1E24', '#28282E', '#323238']);
  });

  it('keeps the key colour when nothing is being keyed out', () => {
    expect(identityPalette(KEYED_SHEET, null).at(0)).toBe('#FF00FF');
  });

  it('takes TRANSPARENT to mean no colour needs excluding', () => {
    // Fully transparent pixels are already outside the histogram, so the key needs no exclusion of
    // its own — and the constant says so with null rather than inventing an RGB for it.
    expect(BACKGROUND_KEY_COLORS.TRANSPARENT).toBeNull();

    const onTransparent = imageFrom(8, 8, (x) => (x < 4 ? CHARCOAL : { r: 0, g: 0, b: 0, a: 0 }));
    expect(identityPalette(onTransparent, BACKGROUND_KEY_COLORS.TRANSPARENT)).toEqual(['#1E1E24']);
  });

  it('states no more colours than the digest holds', () => {
    const many = imageFrom(20, 10, (x, y) => {
      const n = y * 20 + x;
      return { r: (n * 7) % 256, g: (n * 13) % 256, b: (n * 29) % 256, a: 255 };
    });
    expect(identityPalette(many, MAGENTA)).toHaveLength(IDENTITY_PALETTE_SIZE);
  });

  it('answers nothing for a sheet that is only its key field', () => {
    // Better than a colour: the caller writes no `Palette:` segment at all rather than an empty one.
    const blank = imageFrom(4, 4, () => MAGENTA);
    expect(identityPalette(blank, MAGENTA)).toEqual([]);
  });

  it('matches the key exactly, so a black key does not take the outlines with it', () => {
    // PURE_BLACK is an offered key and DARK_LOCAL_CONTOUR is an offered outline, so the two coexist
    // on real sheets. Anything loose enough to swallow fringing would eat the artwork here.
    const outlined = imageFrom(8, 8, (x) => {
      if (x < 4) return { r: 0, g: 0, b: 0, a: 255 };
      if (x < 6) return { r: 8, g: 8, b: 8, a: 255 };
      return SLATE;
    });

    expect(identityPalette(outlined, BACKGROUND_KEY_COLORS.PURE_BLACK)).toEqual(['#080808', '#334155']);
  });

  it('ignores alpha when matching the key', () => {
    // A key field drawn at less than full opacity is still the key field.
    const translucent = imageFrom(8, 4, (x) => (x < 4 ? { ...MAGENTA, a: 128 } : CHARCOAL));
    expect(identityPalette(translucent, MAGENTA)).toEqual(['#1E1E24']);
  });
});
