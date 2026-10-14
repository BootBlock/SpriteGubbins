import { describe, expect, it } from 'vitest';
import { SPRITE_GAP_RANGE } from '../constants/quantiser.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import { reachesAny } from './boxClearance.ts';

function box(left: number, top: number, width = 4, height = 4): SpriteBox {
  return { left, top, width, height, pixels: width * height };
}

describe('reachesAny', () => {
  it('keeps to the merge’s rule at every gap the dial offers, on both axes', () => {
    // A box as far away as the gap is one the merge would fold into this one, so the write is
    // refused: at a gap of 1, one clear pixel is enough for the labelling and not for the
    // `mergeNearby` that follows it. At a gap of 0 that is a box sitting directly against this one,
    // whose artwork is eight-connected to it — a write landing there would join two sprites into one
    // the next segmentation reports as a single larger sprite. One pixel further out is clear.
    for (let gap = SPRITE_GAP_RANGE.min; gap <= SPRITE_GAP_RANGE.max; gap += SPRITE_GAP_RANGE.step) {
      // `box(0, 0)` ends at column and row 4, so a box at `4 + gap` is `gap` away and one at
      // `5 + gap` is not.
      expect(reachesAny(box(0, 0), [box(4 + gap, 0)], null, gap)).toBe(true);
      expect(reachesAny(box(0, 0), [box(5 + gap, 0)], null, gap)).toBe(false);
      expect(reachesAny(box(0, 0), [box(0, 4 + gap)], null, gap)).toBe(true);
      expect(reachesAny(box(0, 0), [box(0, 5 + gap)], null, gap)).toBe(false);
    }
  });

  it('reaches a box that only touches it corner to corner', () => {
    expect(reachesAny(box(0, 0), [box(4, 4)], null, 0)).toBe(true);
  });

  it('ignores the box the region is replacing', () => {
    const self = box(0, 0);

    expect(reachesAny(box(0, 0, 6, 6), [self], self, 1)).toBe(false);
    expect(reachesAny(box(0, 0, 6, 6), [self], null, 1)).toBe(true);
  });

  it('is clear of an empty list', () => {
    expect(reachesAny(box(0, 0), [], null, 1)).toBe(false);
  });
});
