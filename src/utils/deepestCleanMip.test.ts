import { describe, expect, it } from 'vitest';
import { deepestCleanMip } from './deepestCleanMip.ts';

describe('deepestCleanMip', () => {
  it('halves the gutter at each level, so 4 px lasts to mip 2 and not mip 3', () => {
    // The claim the calculator once made was that 4 px survives a full chain; it is half a texel by
    // mip 3.
    expect(deepestCleanMip(4)).toBe(2);
  });

  it('gives 2ⁿ px exactly n levels', () => {
    expect([1, 2, 8, 16, 2048].map(deepestCleanMip)).toEqual([0, 1, 3, 4, 11]);
  });

  it('rounds a width between powers of two down to the level it still covers', () => {
    expect(deepestCleanMip(6)).toBe(2);
    expect(deepestCleanMip(1.5)).toBe(0);
  });

  it('protects no level with a gutter narrower than a texel', () => {
    expect(deepestCleanMip(0)).toBeNull();
    expect(deepestCleanMip(0.5)).toBeNull();
  });
});
