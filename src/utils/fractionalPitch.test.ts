import { describe, expect, it } from 'vitest';
import { fractionalPitch } from './fractionalPitch.ts';

/** A correlation series of `length` lags, zero except where `peaks` says. */
function series(length: number, peaks: Record<number, number>): Float64Array {
  const r = new Float64Array(length);
  for (const [lag, value] of Object.entries(peaks)) r[Number(lag)] = value;
  return r;
}

describe('fractionalPitch', () => {
  it('reads the fraction off the tallest multiple where the fundamental leans to a whole lag', () => {
    // Crisp art at 4.75: its tooth at 5 has trough neighbours, so it centres on 5 exactly, while
    // 19 spans four pitches exactly.
    const r = series(24, { 4: -0.25, 5: 1.25, 6: -0.75, 19: 1, 18: -0.1, 20: -0.1 });

    expect(fractionalPitch(r, 19, 5)).toBe(4.75);
  });

  it('keeps the fundamental where the multiple’s count of pitches is ambiguous', () => {
    // 9 over a tooth at 6 is one and a half pitches, which rounds to two and would read 4.5.
    const r = series(12, { 6: 0.8, 9: 1 });

    expect(fractionalPitch(r, 9, 6)).toBe(6);
  });

  it('never refines a pitch off its settled peak or under the lowest readable lag', () => {
    // 5 over a tooth at 2 counts three pitches within the window, and reads 1.67.
    const r = series(8, { 2: 0.8, 5: 1 });

    expect(fractionalPitch(r, 5, 2)).toBe(2);
  });
});
