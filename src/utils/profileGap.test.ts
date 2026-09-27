import { describe, expect, it } from 'vitest';
import { profileGap } from './profileGap.ts';

describe('profileGap', () => {
  it('is zero for one profile laid over itself', () => {
    expect(profileGap(Int32Array.of(5, 7, 2), Int32Array.of(5, 7, 2), 0)).toBe(0);
  });

  it('reads everything outside either profile as nothing', () => {
    // Laid one place on, the second overhangs by one at the end and leaves the first's head alone:
    // |5 − 0| + |7 − 5| + |2 − 7| + |0 − 2|.
    expect(profileGap(Int32Array.of(5, 7, 2), Int32Array.of(5, 7, 2), 1)).toBe(5 + 2 + 5 + 2);
    // And one place back, the mirror of it.
    expect(profileGap(Int32Array.of(5, 7, 2), Int32Array.of(5, 7, 2), -1)).toBe(5 + 2 + 5 + 2);
  });

  it('measures profiles of different lengths over the span either covers', () => {
    expect(profileGap(Int32Array.of(4), Int32Array.of(1, 1, 1), -1)).toBe(1 + 3 + 1);
  });
});
