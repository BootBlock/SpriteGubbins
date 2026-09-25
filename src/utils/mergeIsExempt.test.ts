import { describe, expect, it } from 'vitest';
import { DITHER_PATTERNS, type ColorReduction, type Rgba } from '../types/quantiser.ts';
import { mergeIsExempt } from './mergeIsExempt.ts';

/**
 * When the sheet-wide colour merge is held back.
 *
 * Three callers ask this — the pipeline, the auto-tune sweep and the Colour merge slider — so its
 * answer for every reduction and every dither is the one thing all three agree on. Held back only
 * where the reader stated the palette and no dither moves the palette step past the merge.
 */

const white: Rgba = { r: 255, g: 255, b: 255, a: 255 };

const REDUCTIONS: readonly (ColorReduction | null)[] = [
  null,
  { kind: 'MAX_COLORS', maxColors: 16 },
  { kind: 'CHANNEL_DEPTH', bitsPerChannel: 4 },
  { kind: 'PALETTE', entries: [white] },
  { kind: 'LOCKED', entries: [white], snap: 21 },
];

describe('mergeIsExempt', () => {
  it('holds the merge back under a pinned or a locked palette with no dither, and nowhere else', () => {
    for (const reduction of REDUCTIONS) {
      const stated = reduction?.kind === 'PALETTE' || reduction?.kind === 'LOCKED';
      for (const dither of DITHER_PATTERNS) {
        expect(mergeIsExempt({ reduction, dither }), `${reduction?.kind ?? 'none'} / ${dither}`).toBe(
          stated && dither === 'NONE',
        );
      }
    }
  });
});
