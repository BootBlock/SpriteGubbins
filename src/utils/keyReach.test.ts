import { describe, expect, it } from 'vitest';
import { BACKGROUND_KEY_COLORS } from '../constants/backgroundKeyColors.ts';
import { PALETTES } from '../constants/palettes/index.ts';
import { DEFAULT_KEY_TOLERANCE } from '../constants/quantiser.ts';
import { imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { fixedPaletteColors } from './paletteEntries.ts';
import { keyBackground } from './keyBackground.ts';
import { keyReaches } from './keyReach.ts';

/** Every key that is a colour, since a transparent field reaches nothing and names no colour. */
const COLOURED_KEYS = Object.entries(BACKGROUND_KEY_COLORS).flatMap(([id, key]) =>
  key === null ? [] : [{ id, key }],
);

/** Every colour a fixed palette lists — the colours the prompt decides whether to offer. */
const LISTED = Object.values(PALETTES).flatMap((palette) =>
  palette === null || palette.space.kind !== 'FIXED' ? [] : fixedPaletteColors(palette.space.entries),
);

/**
 * What `keyBackground` does to one opaque pixel of this colour at the tab's opening tolerance.
 *
 * A single pixel has no neighbours, so the fringe pass cannot reach it and the answer is the field
 * pass alone — which is exactly the question `keyReaches` claims to answer.
 */
function keyedOnItsOwn(key: Rgba, color: Rgba): boolean {
  const image = imageFrom(1, 1, () => color);
  return keyBackground(image, { color: key, tolerance: DEFAULT_KEY_TOLERANCE }).keyedPixels === 1;
}

describe('keyReaches', () => {
  it('has fixed palettes to measure, and every coloured key', () => {
    // Both loops below pass vacuously on an empty list, so the lists are held to having something.
    expect(LISTED.length).toBeGreaterThan(0);
    expect(COLOURED_KEYS.map(({ id }) => id).sort()).toStrictEqual([
      'MAGENTA_FF00FF',
      'PURE_BLACK',
      'PURE_WHITE',
    ]);
  });

  it.each(COLOURED_KEYS)(
    'gives the answer the keying pass reaches, on every listed colour, under $id',
    ({ key }) => {
      // The prompt's promise is only worth making if it is the tab's own answer, so the two are compared
      // rather than each being checked against a figure of its own.
      const disagreements = LISTED.filter((color) => keyReaches(key, color) !== keyedOnItsOwn(key, color));
      expect(disagreements).toStrictEqual([]);
    },
  );

  it.each(COLOURED_KEYS)('always takes the key itself, under $id', ({ key }) => {
    expect(keyReaches(key, key)).toBe(true);
  });

  it('takes the colours the prompt names as its examples, and not the nearest hue that is not the key', () => {
    const magenta = BACKGROUND_KEY_COLORS.MAGENTA_FF00FF;
    const white = BACKGROUND_KEY_COLORS.PURE_WHITE;
    if (magenta === null || white === null) throw new Error('both keys should be colours');

    // The Spectrum's dim magenta is the key shaded, which is the direction the field's own drift runs.
    expect(keyReaches(magenta, { r: 0xd8, g: 0x00, b: 0xd8, a: 255 })).toBe(true);
    expect(keyReaches(white, { r: 0xff, g: 0xf1, b: 0xe8, a: 255 })).toBe(true);
    // Rose sits at 40 from the recommended magenta, past every rung short of the top — see
    // `KEY_TOLERANCES` — so it stays a colour a component may wear, and a tolerance loosened past it
    // fails here.
    expect(keyReaches(magenta, { r: 0xff, g: 0x00, b: 0x80, a: 255 })).toBe(false);
  });
});
