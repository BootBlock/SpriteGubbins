import { describe, expect, it } from 'vitest';
import { channels, imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { mergeColors } from './mergeColors.ts';

const GREEN: Rgba = { r: 40, g: 140, b: 60, a: 255 };
/** A near-duplicate ten steps away — a dithered fill's second entry, not a shade. */
const NEAR: Rgba = { r: 46, g: 146, b: 66, a: 255 };
const INK: Rgba = { r: 16, g: 14, b: 18, a: 255 };

describe('mergeColors', () => {
  it('folds dense dither into the surface’s dominant colour — the case no pixel pass reaches', () => {
    // A strict checkerboard: every pixel alternates, so no pixel is ever a lone dissenter and a
    // neighbourhood cleanup leaves the whole field exactly as it is. The redundancy is in the
    // palette, and folding it there settles every pixel at once — onto the more-used colour.
    const sheet = imageFrom(6, 6, (x, y) => ((x + y) % 2 === 0 ? GREEN : NEAR));
    // 18 of each: an exact tie, which the packed-value rank breaks toward the darker green.
    expect(channels(mergeColors(sheet, 24))).toEqual(channels(imageFrom(6, 6, () => GREEN)));
  });

  it('keeps genuinely distinct tones apart, linework above all', () => {
    const sheet = imageFrom(6, 6, (x, y) => (y < 2 ? INK : (x + y) % 2 === 0 ? GREEN : NEAR));
    const merged = mergeColors(sheet, 24);
    const expected = imageFrom(6, 6, (_x, y) => (y < 2 ? INK : GREEN));
    expect(channels(merged)).toEqual(channels(expected));
  });

  it('folds satellites onto the most-used colour, never the other way round', () => {
    // Twenty-eight greens and eight near-greens: population decides the keeper, so the surface's
    // dominant shade absorbs its satellite whichever was counted first.
    const sheet = imageFrom(6, 6, (x, y) => (y === 0 && x < 4 ? NEAR : GREEN));
    for (let offset = 0; offset < 6 * 6 * 4; offset += 4) {
      const merged = mergeColors(sheet, 24);
      expect(merged.data[offset]).toBe(GREEN.r);
    }
  });

  it('leaves transparency alone and keeps a repainted pixel’s own alpha', () => {
    const sheet = imageFrom(6, 6, (x, y) => {
      void y;
      if (x === 0) return { r: 0, g: 0, b: 0, a: 0 };
      return (x + y) % 2 === 0 ? { ...GREEN, a: 254 } : NEAR;
    });
    const merged = mergeColors(sheet, 24);
    for (let y = 0; y < 6; y += 1) {
      const edge = y * 6 * 4;
      expect(merged.data[edge + 3]).toBe(0);
    }
    // Colours tally across their alphas — 254 and 255 greens are one colour — and each pixel
    // keeps the alpha it arrived with.
    const soft = (0 * 6 + 2) * 4;
    expect(merged.data[soft + 3]).toBe(254);
  });

  it('returns the input bytes unchanged at a tolerance of zero, and is deterministic', () => {
    const sheet = imageFrom(8, 8, (x, y) => ((x * 7 + y * 13) % 3 === 0 ? NEAR : GREEN));
    expect(channels(mergeColors(sheet, 0))).toEqual(channels(sheet));
    expect(channels(mergeColors(sheet, 24))).toEqual(channels(mergeColors(sheet, 24)));
  });
});
