import { describe, expect, it } from 'vitest';
import { bitCount } from './bitCount.ts';

describe('bitCount', () => {
  it('counts the set bits of a word, including the sign bit', () => {
    expect(bitCount(0)).toBe(0);
    expect(bitCount(1)).toBe(1);
    expect(bitCount(0x80000000)).toBe(1);
    expect(bitCount(0xffffffff)).toBe(32);
    expect(bitCount(0xf0f0f0f0)).toBe(16);
    expect(bitCount(0x12345678)).toBe(13);
  });

  it('reads a negative word as the same bit pattern as its unsigned twin', () => {
    // An OR that sets bit 31 comes back negative from JavaScript's bitwise operators.
    expect(bitCount(-1)).toBe(32);
    expect(bitCount(1 << 31)).toBe(1);
  });
});
