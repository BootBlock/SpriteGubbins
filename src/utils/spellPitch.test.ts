import { describe, expect, it } from 'vitest';
import { spellPitch } from './spellPitch.ts';

describe('spellPitch', () => {
  it('offers a fractional pitch as the whole scale below it, never the nearer one above', () => {
    // 4.75 is nearer 5, and 5 merges a cell in every twenty of art drawn at 4.75 (#479).
    expect(spellPitch(4.75, 512)).toBe(4);
    expect(spellPitch(6.5, 512)).toBe(6);
    expect(spellPitch(8.25, 512)).toBe(8);
  });

  it('offers a whole pitch as itself', () => {
    expect(spellPitch(7, 512)).toBe(7);
  });

  it('takes the integer above where the difference slips less than a pixel across the sheet', () => {
    // A softened sheet at 7 measured 6.99991: a slip of 512 / 7 × 0.00009 ≈ 0.007 pixels, where a
    // bare floor offered 6.
    expect(spellPitch(6.99991, 512)).toBe(7);
    // At exactly a pixel of slip the lattice of 7 misses a boundary, so it is coarser than the art.
    expect(spellPitch(7 - 7 / 512, 512)).toBe(6);
  });

  it('widens the margin as the sheet shrinks', () => {
    // 0.1 under 5 slips 0.64 pixels across 32 and 10.2 across 512.
    expect(spellPitch(4.9, 32)).toBe(5);
    expect(spellPitch(4.9, 512)).toBe(4);
  });
});
