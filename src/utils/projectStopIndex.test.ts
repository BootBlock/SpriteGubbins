import { describe, expect, it } from 'vitest';
import { spectrumStopAt } from '../constants/spectrum.ts';
import { projectStopIndex } from './projectStopIndex.ts';

/**
 * A project's colour comes from its id, and the whole point of that is that it does not move.
 *
 * The list is ordered by when each project was last edited, so a colour taken from a position in it
 * would change under a rename — every card in the project changing colour because its name did. The
 * id never changes, so neither does what this returns.
 */

/** Ids in the shape the store mints them, plus the one the app writes down. */
const IDS = [
  'd0c9a5be-8f4e-4b7a-9f2d-6f1a0c3b5e77',
  '2f1c6d90-1a52-4c88-b0e3-7a9f5c2d4e10',
  '9b7e4a31-6c05-4f2a-8d17-3e6b0c9a1f52',
  'e41a7c68-2b93-4d50-a6f1-5c8e2b7d0934',
];

describe('projectStopIndex', () => {
  it('answers the same for one id however often it is asked', () => {
    for (const id of IDS) expect(projectStopIndex(id)).toBe(projectStopIndex(id));
  });

  it('returns a non-negative integer, which is what the allocator takes', () => {
    // `Math.imul` returns a signed 32-bit result, so without the unsigned shift the running value
    // goes negative — and a negative index lands every project on the pool's first stop.
    for (const id of IDS) {
      const index = projectStopIndex(id);
      expect(Number.isInteger(index)).toBe(true);
      expect(index).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives an empty id an index rather than failing', () => {
    // Not a state the app produces — every project has a GUID — but the function is total, and a
    // colour is not worth an exception.
    expect(projectStopIndex('')).toBeGreaterThanOrEqual(0);
  });

  it('separates ids that differ only in their last character', () => {
    // The realistic near-collision, since two GUIDs minted a moment apart share no structure. A
    // hash that folded the tail would put every project made in one session on one stop.
    const stops = new Set(['a', 'b', 'c', 'd'].map((tail) => spectrumStopAt(projectStopIndex(`id-${tail}`))));
    expect(stops.size).toBeGreaterThan(1);
  });

  it('spreads the ids above across the wheel rather than piling them on one stop', () => {
    // Four ids and nine stops: a collision is a normal outcome and is not what this asserts. What
    // it asserts is that the allocation is doing something at all — a hash that returned a constant
    // would leave every project in the app one colour, which is the failure that looks like a
    // design decision.
    const stops = new Set(IDS.map((id) => spectrumStopAt(projectStopIndex(id))));
    expect(stops.size).toBeGreaterThan(1);
  });
});
