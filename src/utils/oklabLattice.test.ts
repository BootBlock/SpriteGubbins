import { describe, expect, it } from 'vitest';
import { type Oklab, srgbToOklab } from './oklab.ts';
import { oklabLattice } from './oklabLattice.ts';
import { sequence } from '../test/sequence.ts';

/**
 * The lattice's one promise: every point within `reach` of a colour is among what `near` returns.
 *
 * It decides nothing about nearness, so what is asserted is the superset and nothing tighter. A walk
 * that missed a neighbouring cell would still pass every test of a caller whose fixtures sit in one
 * cell, so this checks it against a brute-force scan over points spread across the whole gamut, at
 * reaches from well under a cell index's stride to the widest dial the app offers.
 */

function randomColors(count: number, seed: number): Oklab[] {
  const next = sequence(seed);
  const byte = () => Math.floor(next() * 256);
  return Array.from({ length: count }, () => srgbToOklab(byte(), byte(), byte()));
}

function distance(left: Oklab, right: Oklab): number {
  return Math.hypot(left.L - right.L, left.a - right.a, left.b - right.b);
}

describe('oklabLattice', () => {
  it.each([0.5, 3, 21, 64])('returns every point within a reach of %d', (reach) => {
    const points = randomColors(600, 7);
    const lattice = oklabLattice<number>(reach);
    points.forEach((point, index) => {
      lattice.add(point, index);
    });

    const found: number[] = [];
    for (const query of randomColors(300, 11)) {
      lattice.near(query, found);
      const returned = new Set(found);
      points.forEach((point, index) => {
        if (distance(point, query) <= reach) expect(returned.has(index)).toBe(true);
      });
    }
  });

  it('replaces what the buffer held rather than adding to it', () => {
    const lattice = oklabLattice<string>(10);
    lattice.add(srgbToOklab(0, 0, 0), 'black');
    lattice.add(srgbToOklab(255, 255, 255), 'white');

    const found: string[] = ['left over'];
    lattice.near(srgbToOklab(0, 0, 0), found);
    expect(found).toEqual(['black']);

    lattice.near(srgbToOklab(255, 255, 255), found);
    expect(found).toEqual(['white']);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('refuses a reach of %d', (reach) => {
    expect(() => oklabLattice(reach)).toThrow(RangeError);
  });
});
