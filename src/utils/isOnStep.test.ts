import { describe, expect, it } from 'vitest';
import { isOnStep } from './isOnStep.ts';

/**
 * The grid half of a range, asked by both boundaries that take one: `NumberField`, of a figure a
 * reader typed, and `db/readers.ts`, of a figure that reached storage without a control at all.
 */
describe('isOnStep', () => {
  it('counts from `min`, not from zero', () => {
    // The anti-aliasing strength's own grid: it opens at 10 and moves in fives, so 35 is a position
    // the slider has and 37 is not — and neither answer follows from 37 by itself.
    expect(isOnStep(35, 10, 5)).toBe(true);
    expect(isOnStep(37, 10, 5)).toBe(false);
    expect(isOnStep(10, 10, 5)).toBe(true);
  });

  it('accepts a tenth that binary floating point cannot represent', () => {
    // `(0.3 - 0) / 0.1` is 2.9999999999999996, so an exact comparison would refuse a position the
    // slider itself produces. Every tenth of the trim strength's range, and every tenth of the line
    // strength's offset one.
    for (let position = 0; position <= 30; position += 1) {
      expect(isOnStep(position / 10, 0, 0.1)).toBe(true);
      expect(isOnStep(1 + position / 10, 1, 0.1)).toBe(true);
    }
  });

  it('refuses a figure between two tenths', () => {
    expect(isOnStep(2.34567, 1, 0.1)).toBe(false);
    expect(isOnStep(0.71828, 0, 0.1)).toBe(false);
    expect(isOnStep(0.05, 0, 0.1)).toBe(false);
  });

  it('refuses a fraction on a grid that counts in ones', () => {
    expect(isOnStep(16.5, 16, 1)).toBe(false);
    expect(isOnStep(17, 16, 1)).toBe(true);
  });

  it('treats a step of zero or less as no grid at all', () => {
    // A control declaring no step is declaring a continuous range, which is the honest reading —
    // rather than a guard bolted on to avoid dividing by zero.
    expect(isOnStep(2.34567, 1, 0)).toBe(true);
    expect(isOnStep(2.34567, 1, -1)).toBe(true);
  });
});
