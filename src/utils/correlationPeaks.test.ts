import { describe, expect, it } from 'vitest';
import { divisionsOf, windowCentroid } from './correlationPeaks.ts';

describe('divisionsOf', () => {
  it('asks every whole division of a peak, finest first', () => {
    // 54 is the seventh multiple of 7.75 — no half or third of it lands near the pitch (#479).
    const divisions = divisionsOf(54, 200);

    expect(divisions).toContain(7);
    expect(divisions).toContain(27);
    expect(divisions).toContain(18);
    expect([...divisions].sort((a, b) => a - b)).toStrictEqual(divisions);
  });

  it('asks nothing below the correlation floor, at or above the peak, or past the ceiling', () => {
    expect(divisionsOf(4, 200)).toStrictEqual([2, 3]);
    expect(divisionsOf(40, 12).every((lag) => lag >= 2 && lag <= 12)).toBe(true);
  });
});

describe('windowCentroid', () => {
  /** A correlation series holding `values` from lag 0. */
  const series = (...values: number[]) => Float64Array.from(values);

  it('reads the fraction a split peak rounds away', () => {
    // A quarter of the evidence at 6 and three quarters at 7: art at 6.75.
    expect(windowCentroid(series(0, 0, 0, 0, -0.4, -0.1, 0.25, 0.75, -0.2), 7)).toBeCloseTo(6.75, 10);
  });

  it('reads a peak between two troughs as exactly its own lag', () => {
    // Exactly, because a floor of 6.9999 would take a pixel off an integer pitch.
    expect(windowCentroid(series(0, 0, 0, 0, 0, 0, -0.3, 0.9, -0.4), 7)).toBe(7);
  });

  it('never weighs lag 1, which differencing makes a trough on every image', () => {
    expect(windowCentroid(series(0, 0.9, 0.6, -0.2), 2)).toBe(2);
  });
});
