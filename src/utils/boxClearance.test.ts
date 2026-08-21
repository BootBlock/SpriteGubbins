import { describe, expect, it } from 'vitest';
import type { SpriteBox } from '../types/quantiser.ts';
import { reachesAny } from './boxClearance.ts';

function box(left: number, top: number, width = 4, height = 4): SpriteBox {
  return { left, top, width, height, pixels: width * height };
}

describe('reachesAny', () => {
  it('is clear of a box a whole pixel away', () => {
    expect(reachesAny(box(0, 0), [box(5, 0)], null)).toBe(false);
  });

  it('reaches a box sitting directly against it, which is one region to the labelling', () => {
    // Adjacent boxes hold artwork that is eight-connected, so a write landing here would join two
    // sprites into one the next segmentation reports as a single larger sprite.
    expect(reachesAny(box(0, 0), [box(4, 0)], null)).toBe(true);
  });

  it('reaches a box that only touches it corner to corner', () => {
    expect(reachesAny(box(0, 0), [box(4, 4)], null)).toBe(true);
  });

  it('reaches a box it overlaps', () => {
    expect(reachesAny(box(0, 0), [box(2, 2)], null)).toBe(true);
  });

  it('ignores the box the region is replacing', () => {
    const self = box(0, 0);

    expect(reachesAny(box(0, 0, 6, 6), [self], self)).toBe(false);
    expect(reachesAny(box(0, 0, 6, 6), [self], null)).toBe(true);
  });

  it('is clear of an empty list', () => {
    expect(reachesAny(box(0, 0), [], null)).toBe(false);
  });
});
