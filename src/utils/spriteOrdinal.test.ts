import { describe, expect, it } from 'vitest';
import { SCATTERED_SPRITE_CEILING } from '../constants/quantiser.ts';
import { spriteOrdinal } from './spriteOrdinal.ts';

/** Every ordinal a sheet of `count` sprites produces, in the sheet's own reading order. */
function ordinals(count: number): readonly string[] {
  return Array.from({ length: count }, (_, index) => spriteOrdinal(index, count));
}

describe('spriteOrdinal', () => {
  it('counts from one, as the manifest’s own index does', () => {
    expect(ordinals(3)).toStrictEqual(['1', '2', '3']);
  });

  it('pads to the width the sheet’s own count needs, and no wider', () => {
    expect(spriteOrdinal(0, 9)).toBe('1');
    expect(spriteOrdinal(0, 10)).toBe('01');
    expect(spriteOrdinal(0, 99)).toBe('01');
    expect(spriteOrdinal(0, 100)).toBe('001');
  });

  it('sorts a listing into reading order at every count the segmentation admits', () => {
    // The defect this replaced: a literal two-digit pad, which held to ninety-nine and then put
    // `100` between `10` and `11`. The ceiling is 512, and the Quantise tab reads whatever sheet the
    // reader drops in — a tileset ten across and eleven down is a hundred and ten sprites.
    for (const count of [1, 9, 10, 11, 99, 100, 110, SCATTERED_SPRITE_CEILING]) {
      const listing = ordinals(count);
      expect([...listing].sort()).toStrictEqual(listing);
    }
  });
});
