import { describe, expect, it } from 'vitest';
import { greatestCommonDivisor } from './greatestCommonDivisor.ts';

describe('greatestCommonDivisor', () => {
  it.each([
    [21, 9, 3],
    [16, 9, 1],
    [16, 16, 16],
    [3, 12, 3],
    [7, 0, 7],
  ])('gives %i and %i a divisor of %i', (a, b, divisor) => {
    expect(greatestCommonDivisor(a, b)).toBe(divisor);
  });
});
