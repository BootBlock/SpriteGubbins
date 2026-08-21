import { describe, expect, it } from 'vitest';
import { channels, imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { mergeColors } from './mergeColors.ts';
import { quantiseImage } from './quantiseImage.ts';

const GREEN: Rgba = { r: 40, g: 140, b: 60, a: 255 };
/** A near-duplicate five steps away in scaled OKLab — a dithered fill's second entry, not a shade. */
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
    // Thirty-two greens and four near-greens: population decides the keeper, so the surface's
    // dominant shade absorbs its satellite whichever was counted first.
    const sheet = imageFrom(6, 6, (x, y) => (y === 0 && x < 4 ? NEAR : GREEN));
    const merged = mergeColors(sheet, 24);
    for (let offset = 0; offset < 6 * 6 * 4; offset += 4) {
      expect(merged.data[offset]).toBe(GREEN.r);
    }
  });

  it('stands a colour whose only in-reach colour has itself folded — one decision per colour', () => {
    // K absorbs A; B is within reach of A but not of K. B stands, because folding is judged
    // against the colours that *stand*, never against a colour already folded away — a chain
    // would let the tolerance creep arbitrarily far one hop at a time.
    // Measured in scaled OKLab: K to A is 8.2, A to B is 8.7, K to B is 17 — so a tolerance of 12
    // reaches each link of the chain and not its ends.
    const keeperTone: Rgba = { r: 100, g: 100, b: 100, a: 255 };
    const nearTone: Rgba = { r: 120, g: 100, b: 100, a: 255 };
    const farTone: Rgba = { r: 140, g: 100, b: 100, a: 255 };
    const sheet = imageFrom(6, 6, (x, y) => {
      const index = y * 6 + x;
      if (index < 20) return keeperTone;
      return index < 30 ? nearTone : farTone;
    });
    const merged = mergeColors(sheet, 12);
    const last = (6 * 6 - 1) * 4;
    expect(merged.data[0]).toBe(keeperTone.r);
    expect(merged.data[20 * 4]).toBe(keeperTone.r);
    expect(merged.data[last]).toBe(farTone.r);
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

  it('never folds a pinned palette’s entries — the pipeline exempts it', () => {
    // Two hardware shades thirteen apart in scaled OKLab — inside the dial's reach at 24 — and
    // pinned: the merge must not quietly un-pin them into one, so the pipeline skips the pass
    // entirely for a pinned palette.
    const shadeA: Rgba = { r: 139, g: 172, b: 15, a: 255 };
    const shadeB: Rgba = { r: 155, g: 188, b: 15, a: 255 };
    const sheet = imageFrom(12, 6, (x) => (x < 6 ? shadeA : shadeB));
    const result = quantiseImage(sheet, {
      grid: 6,
      key: null,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 24,
      reduction: { kind: 'PALETTE', entries: [shadeA, shadeB] },
    });
    const seen = new Set<number>();
    for (let offset = 0; offset < result.image.data.length; offset += 4) {
      seen.add(
        (result.image.data[offset] ?? 0) * 65536 +
          (result.image.data[offset + 1] ?? 0) * 256 +
          (result.image.data[offset + 2] ?? 0),
      );
    }
    expect(seen.size).toBe(2);
  });

  it('returns the input bytes unchanged at a tolerance of zero, and is deterministic', () => {
    const sheet = imageFrom(8, 8, (x, y) => ((x * 7 + y * 13) % 3 === 0 ? NEAR : GREEN));
    expect(channels(mergeColors(sheet, 0))).toEqual(channels(sheet));
    expect(channels(mergeColors(sheet, 24))).toEqual(channels(mergeColors(sheet, 24)));
  });
});
