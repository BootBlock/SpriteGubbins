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

/** Each reduction, and whether its colours were stated by the reader — the answer, written down. */
const REDUCTIONS: readonly (readonly [ColorReduction | null, boolean])[] = [
  [null, false],
  [{ kind: 'MAX_COLORS', maxColors: 16 }, false],
  [{ kind: 'CHANNEL_DEPTH', bitsPerChannel: 4 }, false],
  [{ kind: 'PALETTE', entries: [white] }, true],
  [{ kind: 'LOCKED', entries: [white], snap: 21 }, true],
];

describe('mergeIsExempt', () => {
  it('holds the merge back under a pinned or a locked palette with no dither, and nowhere else', () => {
    for (const [reduction, stated] of REDUCTIONS) {
      for (const dither of DITHER_PATTERNS) {
        expect(mergeIsExempt({ reduction, dither }), `${reduction?.kind ?? 'none'} / ${dither}`).toBe(
          stated && dither === 'NONE',
        );
      }
    }
  });
});
