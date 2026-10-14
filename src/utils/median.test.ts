import { describe, expect, it } from 'vitest';
import { median } from './median.ts';

describe('median', () => {
  it('takes the middle of an odd list, whatever order it arrives in', () => {
    expect(median([9, 1, 5])).toBe(5);
  });

  it('takes the mean of the middle pair of an even list, so a tie leans to neither side', () => {
    expect(median([22, 21, 22, 21])).toBe(21.5);
  });

  it('answers 0 for nothing, and leaves its argument in the order it was given', () => {
    const values = [3, 1, 2];

    expect(median([])).toBe(0);
    median(values);
    expect(values).toStrictEqual([3, 1, 2]);
  });
});
