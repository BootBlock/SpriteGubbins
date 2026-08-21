import { describe, expect, it } from 'vitest';
import { BLUE_NOISE_LEVELS, BLUE_NOISE_TILE } from '../constants/quantiser.ts';
import { ditherMatrix } from './ditherMatrix.ts';

describe('ditherMatrix', () => {
  it('has no tile for the off position', () => {
    expect(ditherMatrix('NONE')).toBeNull();
  });

  it.each(['BAYER_4', 'BAYER_8', 'BLUE_NOISE'] as const)('builds %s once and holds it', (pattern) => {
    const first = ditherMatrix(pattern);
    expect(first).not.toBeNull();
    // Identity rather than equality: the blue-noise tile costs a scan of the whole tile per rank,
    // and the pipeline re-runs on every keystroke of the grid box.
    expect(ditherMatrix(pattern)).toBe(first);
  });

  it.each([
    ['BAYER_4', 4, 16],
    ['BAYER_8', 8, 64],
    ['BLUE_NOISE', BLUE_NOISE_TILE, BLUE_NOISE_LEVELS],
  ] as const)('gives %s a %i-square tile over %i levels', (pattern, size, levels) => {
    const matrix = ditherMatrix(pattern);
    expect(matrix?.size).toBe(size);
    expect(matrix?.levels).toBe(levels);
    expect(matrix?.ranks.length).toBe(size * size);
  });

  it('folds the blue-noise ranks into equally-held levels', () => {
    const matrix = ditherMatrix('BLUE_NOISE');
    expect(matrix).not.toBeNull();
    if (matrix === null) return;

    // Every level holding the same number of positions is what carries the even spread the ranking
    // was computed for through the fold: a ratio of `k / levels` still lands on exactly that share
    // of the tile, and each level's positions are still the well-spread ones.
    const counts = new Map<number, number>();
    for (const rank of matrix.ranks) counts.set(rank, (counts.get(rank) ?? 0) + 1);
    expect(counts.size).toBe(BLUE_NOISE_LEVELS);
    expect([...new Set(counts.values())]).toEqual([(BLUE_NOISE_TILE * BLUE_NOISE_TILE) / BLUE_NOISE_LEVELS]);
    expect(Math.min(...matrix.ranks)).toBe(0);
    expect(Math.max(...matrix.ranks)).toBe(BLUE_NOISE_LEVELS - 1);
  });
});
