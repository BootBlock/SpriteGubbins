import { describe, expect, it } from 'vitest';
import { FRAME_DRIFT_SEARCH, FRAME_SWEEP_BUDGET } from '../constants/quantiser.ts';
import type { CoverageMask } from '../types/quantiser.ts';
import { affordableDriftReach } from './affordableDriftReach.ts';

/** A mask of the given box size. Only its extent is read, so its bits are left empty. */
function maskOf(width: number, height: number): CoverageMask {
  const stride = Math.ceil(width / 32);
  return { left: 0, top: 0, width, height, stride, bits: new Uint32Array(stride * height) };
}

/** The words every candidate reads across the sheet, at a reach: what the budget bounds. */
function sweepWords(strips: readonly (readonly CoverageMask[])[], reach: number): number {
  const words = strips
    .flatMap((strip) => strip.slice(1))
    .reduce((sum, frame) => sum + frame.height * frame.stride, 0);
  return (2 * reach + 1) ** 2 * words;
}

describe('affordableDriftReach', () => {
  it('leaves a sheet of ordinary sprites at the full reach', () => {
    const strips = [
      Array.from({ length: 8 }, () => maskOf(48, 48)),
      Array.from({ length: 8 }, () => maskOf(48, 48)),
    ];

    expect(affordableDriftReach(strips)).toBe(FRAME_DRIFT_SEARCH);
    expect(affordableDriftReach([])).toBe(FRAME_DRIFT_SEARCH);
  });

  it('reads the sheet of issue #470 at a reach of six, inside the budget, where seven would cross it', () => {
    // Four painted frames 1000 × 1001 in one strip: the first is the reference and is never searched,
    // so three frames of 1001 rows of 32 words each are what every candidate reads.
    const strip = Array.from({ length: 4 }, () => maskOf(1000, 1001));

    expect(affordableDriftReach([strip])).toBe(6);
    expect(sweepWords([strip], 6)).toBe(3 * 5_413_408);
    expect(sweepWords([strip], 6)).toBeLessThanOrEqual(FRAME_SWEEP_BUDGET);
    expect(sweepWords([strip], 7)).toBeGreaterThan(FRAME_SWEEP_BUDGET);
  });

  it('never counts the reference frame, which is never searched', () => {
    const small = maskOf(32, 32);
    const huge = maskOf(4096, 4096);

    expect(affordableDriftReach([[huge, small, small]])).toBe(FRAME_DRIFT_SEARCH);
  });

  it('reads a sheet whose frames cannot afford one ring of candidates at their corner differences', () => {
    // A reach of one is nine candidates, so frames whose words come to more than a ninth of the
    // budget get none. Narrow frames are the way there, because each row of one costs a whole word
    // however few of its 32 pixels the frame fills.
    const strips = Array.from({ length: 200 }, () => Array.from({ length: 4 }, () => maskOf(1, 4096)));

    expect(sweepWords(strips, 1)).toBeGreaterThan(FRAME_SWEEP_BUDGET);
    expect(affordableDriftReach(strips)).toBe(0);
  });
});
