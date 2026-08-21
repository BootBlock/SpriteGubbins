import { describe, expect, it } from 'vitest';
import type { PixelShift } from '../types/quantiser.ts';
import { driftAt, fitLattice } from './frameLattice.ts';

/** A row of horizontal shifts, which is the axis every case here varies. */
function along(...values: readonly number[]): readonly PixelShift[] {
  return values.map((x) => ({ x, y: 0 }));
}

/** How far each frame sits from its own slot — the figure the whole pass reports. */
function drifts(shifts: readonly PixelShift[]): readonly number[] {
  const lattice = fitLattice(shifts);
  return shifts.map((shift, index) => driftAt(lattice, index, shift).x);
}

/** Where each frame lands once its own drift is taken out — the slot, as a whole pixel. */
function slots(shifts: readonly PixelShift[]): readonly number[] {
  const lattice = fitLattice(shifts);
  return shifts.map((shift, index) => shift.x - driftAt(lattice, index, shift).x);
}

describe('fitLattice', () => {
  it('finds the spacing of an evenly laid-out row and reports no drift in it', () => {
    expect(fitLattice(along(0, 20, 40, 60)).pitch.x).toBe(20);
    expect(drifts(along(0, 20, 40, 60))).toEqual([0, 0, 0, 0]);
  });

  it('recovers a fractional pitch from a row that can only sit on whole pixels', () => {
    // 128 source pixels a frame read at a grid of 6 is 21⅓ drawn pixels, and the frames land at 0,
    // 21, 43, 64. A pitch built from the gaps between neighbours would be the median of 21, 22, 21 —
    // a whole 21, which gives the last two frames a drift apiece and would have a snap at the
    // strictest tolerance pull an evenly spaced row out of true.
    const row = along(0, 21, 43, 64);

    // The estimator lands within half a pixel of the true 21⅓ — which is all a whole-pixel row can
    // ever pin down, and is what matters: every frame is then inside a pixel of its own slot, so the
    // row reports as the evenly spaced row it is.
    expect(fitLattice(row).pitch.x).toBeGreaterThan(21);
    expect(fitLattice(row).pitch.x).toBeLessThan(21.5);
    expect(slots(row)).toEqual([0, 21, 43, 64]);
    expect(drifts(row)).toEqual([0, 0, 0, 0]);
  });

  it('is unmoved by one frame that wandered, which least squares would not be', () => {
    // Seven frames on a pitch of 20 and one four pixels out. The median step ignores the two spoiled
    // gaps; a least-squares line would tilt toward the outlier and give every frame after it a drift
    // of its own.
    expect(drifts(along(0, 20, 40, 64, 80, 100, 120, 140))).toEqual([0, 0, 0, 4, 0, 0, 0, 0]);
  });

  it('fits where the row starts as well as how it steps, so a drifting first frame is the one blamed', () => {
    // Frame zero three pixels to the left of a row that is otherwise perfectly spaced. Pinning the
    // lattice to frame zero would report the other three as the ones that moved.
    expect(drifts(along(-3, 20, 40, 60))).toEqual([-3, 0, 0, 0]);
  });

  it('measures the two axes separately', () => {
    const lattice = fitLattice([
      { x: 0, y: 0 },
      { x: 20, y: 1 },
      { x: 40, y: 2 },
    ]);

    expect(lattice.pitch).toEqual({ x: 20, y: 1 });
  });

  it('reads a row that alternates between two gaps as sitting on the average of them', () => {
    // Frames laid out alternately 21 and 22 apart: the row keeps to 21.5, and either whole number
    // would be a claim the row does not support — one of them would leave every other frame drifting.
    expect(fitLattice(along(0, 21, 43, 64, 86)).pitch.x).toBe(21.5);
  });

  it('holds its answer when a third of a long row has wandered', () => {
    // Siegel's estimator needs half the frames to be wrong before it moves. Three of nine here are,
    // each in a different direction, and the six that are not still decide both the spacing and the
    // start.
    expect(drifts(along(0, 20, 45, 60, 80, 96, 120, 140, 163))).toEqual([0, 0, 5, 0, 0, -4, 0, 0, 3]);
  });
});

describe('driftAt', () => {
  it('truncates toward zero, so a frame as close to its slot as pixels allow has no drift', () => {
    // A row spaced 21.5 apart sits at 0, 21, 43, 64: each frame is half a pixel from its slot, which
    // is the closest a whole-pixel grid lets it get. Rounding that half away from zero would report
    // alternate frames as a pixel out and a snap at the strictest tolerance would shuffle a row that
    // was already as even as it can be.
    expect(drifts(along(0, 21, 43, 64, 86))).toEqual([0, 0, 0, 0, 0]);
    expect(slots(along(0, 21, 43, 64, 86))).toEqual([0, 21, 43, 64, 86]);
  });

  it('reports a whole pixel of drift once a frame is a whole pixel out', () => {
    // The same 21.5 row with one frame moved two pixels further: half a pixel is nothing and two and
    // a half is two, so the move available to it is the two the artwork can actually be carried.
    expect(drifts(along(0, 21, 45, 64, 86))).toEqual([0, 0, 2, 0, 0]);
  });
});
