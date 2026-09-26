import { beforeAll, describe, expect, it } from 'vitest';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { calibrationSettings } from './calibrationSettings.ts';
import {
  DEFAULT_FILL_CLEANUP,
  DIFFERENCE_PRECISION,
  FILL_CLEANUP_RANGE,
} from '../src/constants/quantiser.ts';
import { boundaryMesh } from '../src/utils/gridMesh.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import type { VoteMethod } from '../src/types/quantiser.ts';

/**
 * The figures `DIFFERENCE_SCALES` and `differenceMap` state, re-derived from the reference sheet,
 * with the mesh every one of them is counted through. See `calibrationSettings.ts` for why the
 * docblock-figure suites exist.
 */
describe('the figures DIFFERENCE_SCALES and differenceMap state', () => {
  let sheet: ImageData;

  beforeAll(async () => {
    sheet = await loadCorpusSheet('armour.png');
  }, 120_000);

  it('lays 209 x 209 cells over the reference sheet at a grid of 6', () => {
    const mesh = boundaryMesh(sheet, 6);
    expect([mesh.x.length, mesh.y.length]).toEqual([209, 209]);
    expect(mesh.x.length * mesh.y.length).toBe(43_681);
  });

  it('DIFFERENCE_SCALES — the per-cell distance ladder the rungs are read off', () => {
    const { difference } = quantiseImage(sheet, calibrationSettings());
    const sorted = Array.from(difference.cells).sort((left, right) => left - right);
    const at = (percentile: number): number =>
      (sorted[Math.floor((percentile / 100) * sorted.length)] ?? 0) / DIFFERENCE_PRECISION;

    expect(at(50)).toBeCloseTo(0.47, 2);
    expect(at(75)).toBeCloseTo(9.5, 1);
    expect(at(90)).toBeCloseTo(52.2, 1);
    expect(at(99)).toBeCloseTo(111.4, 1);
    expect(difference.peak).toBeCloseTo(177.4, 1);
  }, 120_000);

  /** What a second cleanup pass moves: how many cells, and the largest step any one of them took. */
  function cleanupPassShift(vote: VoteMethod, fillCleanup: number): { cells: number; largest: number } {
    const once = quantiseImage(sheet, calibrationSettings({ vote, fillCleanup, cleanupPasses: 1 }));
    const twice = quantiseImage(sheet, calibrationSettings({ vote, fillCleanup, cleanupPasses: 2 }));

    let cells = 0;
    let peak = 0;
    for (let cell = 0; cell < once.difference.cells.length; cell += 1) {
      const step = Math.abs((once.difference.cells[cell] ?? 0) - (twice.difference.cells[cell] ?? 0));
      if (step > 0) cells += 1;
      if (step > peak) peak = step;
    }
    return { cells, largest: peak / DIFFERENCE_PRECISION };
  }

  it.each([
    { vote: 'DOMINANT', moved: 802, largest: 26.796875 },
    { vote: 'INK_WEIGHTED', moved: 1_171, largest: 12.890625 },
  ] satisfies readonly { vote: VoteMethod; moved: number; largest: number }[])(
    'DIFFERENCE_SCALES and differenceMap — what a second cleanup pass moves under $vote',
    ({ vote, moved, largest }) => {
      const shift = cleanupPassShift(vote, FILL_CLEANUP_RANGE.max);

      expect(shift.cells).toBe(moved);
      expect(shift.largest).toBeCloseTo(largest, 5);
    },
    240_000,
  );

  it('DIFFERENCE_SCALES — and moves nothing with the fill cleanup at its opening zero', () => {
    // The half of that claim easiest to leave unstated: the passes multiply this one dial, so the
    // figure above means nothing without the rung it was read at, and this is what says so.
    expect(cleanupPassShift('DOMINANT', DEFAULT_FILL_CLEANUP)).toEqual({ cells: 0, largest: 0 });
  }, 240_000);
});
