import { describe, expect, it } from 'vitest';
import type { PixelShift } from '../types/quantiser.ts';
import { driftAt, fitLattice, slotOf } from './frameLattice.ts';

/** A row of horizontal shifts, which is the axis every case here varies. */
function along(...values: readonly number[]): readonly PixelShift[] {
  return values.map((x) => ({ x, y: 0 }));
}

/** How far each frame sits from its own slot — the figure the whole pass reports. */
function drifts(shifts: readonly PixelShift[]): readonly number[] {
  const lattice = fitLattice(shifts);
  return shifts.map((shift) => driftAt(lattice, shift).x);
}

/** Where each frame lands once its own drift is taken out — the slot, as a whole pixel. */
function slots(shifts: readonly PixelShift[]): readonly number[] {
  const lattice = fitLattice(shifts);
  return shifts.map((shift) => shift.x - driftAt(lattice, shift).x);
}

describe('fitLattice', () => {
  it('finds the spacing of an evenly laid-out row and reports no drift in it', () => {
    expect(fitLattice(along(0, 20, 40, 60)).pitch).toBe(20);
    expect(drifts(along(0, 20, 40, 60))).toEqual([0, 0, 0, 0]);
  });

  it('recovers a fractional pitch from a row that can only sit on whole pixels', () => {
    // 128 source pixels a frame read at a grid of 6 is 21⅓ drawn pixels, and five frames land at 0,
    // 21, 43, 64, 85. The rejected estimator — the median of the gaps between neighbours — is the
    // median of 21, 22, 21, 21, which is a whole 21; fitted against the same origin median and read
    // through `driftAt`, that lattice reports the first two frames as a pixel out and a snap at the
    // strictest tolerance would move two frames of an evenly spaced row.
    //
    // **Five frames, not four**: at four the origin median lands on a half and the truncation takes
    // both estimators to zero, so a four-frame row cannot tell them apart.
    const row = along(0, 21, 43, 64, 85);

    // Strictly between 21 and 22, so it is not the whole-pixel spacing the gaps would have given.
    expect(fitLattice(row).pitch).toBeGreaterThan(21);
    expect(fitLattice(row).pitch).toBeLessThan(22);
    expect(slots(row)).toEqual([0, 21, 43, 64, 85]);
    expect(drifts(row)).toEqual([0, 0, 0, 0, 0]);
  });

  it('keeps a long fractional row still, where the neighbour gaps would drift it further and further', () => {
    // Nine frames of the same 21⅓ spacing. The gap median stays a whole 21, so its lattice falls a
    // pixel behind every three frames and the far end reports a drift of two — a snap would spread
    // the row out. The fitted pitch tracks the fraction and nothing drifts at all.
    const row = along(0, 21, 43, 64, 85, 107, 128, 149, 171);

    expect(fitLattice(row).pitch).toBeCloseTo(64 / 3, 3);
    expect(drifts(row)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
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

  it('numbers each frame by the slot nearest to it, so an empty slot re-spaces nothing', () => {
    // Slot 3 of six is empty. Numbered by list position, the row fits a pitch of 40 and three
    // correct frames are reported 8 and 16 pixels out.
    const gapped = along(0, 32, 64, 128, 160);
    const lattice = fitLattice(gapped);

    expect(lattice.pitch).toBe(32);
    expect(gapped.map((shift) => slotOf(lattice, shift.x))).toEqual([0, 1, 2, 4, 5]);
    expect(drifts(gapped)).toEqual([0, 0, 0, 0, 0]);
  });

  it('leaves the first frame alone when the slot after it is the empty one', () => {
    // Numbered by list position, frame zero is blamed for the whole empty slot and carried 32 pixels.
    expect(fitLattice(along(0, 64, 96, 128, 160)).pitch).toBe(32);
    expect(drifts(along(0, 64, 96, 128, 160))).toEqual([0, 0, 0, 0, 0]);
  });

  it('reads a row of three with an empty slot as two steps of the shorter gap', () => {
    // The gaps are 32 and 64. Their plain median, 48, would fit a pitch the row does not keep; an
    // empty slot can only lengthen a gap, so the shorter one is the step.
    expect(fitLattice(along(0, 32, 96)).pitch).toBe(32);
    expect(drifts(along(0, 32, 96))).toEqual([0, 0, 0]);
  });

  it('lets a stray piece share a slot rather than push every later frame along by one', () => {
    // A speck ten pixels right of the second frame. It is numbered into that frame's slot and
    // reported ten pixels out; the frames after it keep their own slots and report nothing.
    const crowded = along(0, 32, 42, 64, 96, 128);

    expect(fitLattice(crowded).pitch).toBe(32);
    expect(drifts(crowded)).toEqual([0, 0, 10, 0, 0, 0]);
  });

  it('keeps a long fractional row on its count to the far end', () => {
    // Forty frames of 21⅓. Dividing each position by the whole gap of 21 would lose count from
    // frame 33 on; walking the gaps cannot.
    const row = along(...Array.from({ length: 40 }, (_, index) => Math.floor((index * 64) / 3)));

    expect(fitLattice(row).pitch).toBeCloseTo(64 / 3, 3);
    expect(drifts(row).every((drift) => drift === 0)).toBe(true);
  });

  it('fits the row a shared baseline rather than a slope, so a sag is blamed on the frames that sag', () => {
    // Six frames at heights 0, 0, 1, 2, 3, 4 relative to the first. A fitted slope of one pixel a
    // frame reads the creep as the layout and reports only the level first frame as out.
    const sagging = [0, 0, 1, 2, 3, 4].map((y, index) => ({ x: index * 32, y }));
    const lattice = fitLattice(sagging);

    expect(lattice.origin.y).toBe(1.5);
    expect(sagging.map((shift) => driftAt(lattice, shift).y)).toEqual([-1, -1, 0, 0, 1, 2]);
  });

  it('reads a row that alternates between two gaps as sitting on the average of them', () => {
    // Frames laid out alternately 21 and 22 apart: the row keeps to 21.5, and either whole number
    // would be a claim the row does not support — one of them would leave every other frame drifting.
    expect(fitLattice(along(0, 21, 43, 64, 86)).pitch).toBe(21.5);
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
    // A row spaced 21.5 apart sits at 0, 21, 43, 64, 86 and its slots fall at 0, 21.5, 43, 64.5, 86:
    // the odd-numbered frames are half a pixel from theirs, which is the closest a whole-pixel grid
    // lets them get. Rounding that half away from zero would report them as a pixel out, and a snap
    // at the strictest tolerance would shuffle a row that was already as even as it can be.
    expect(drifts(along(0, 21, 43, 64, 86))).toEqual([0, 0, 0, 0, 0]);
    expect(slots(along(0, 21, 43, 64, 86))).toEqual([0, 21, 43, 64, 86]);
  });

  it('reports a whole pixel of drift once a frame is a whole pixel out', () => {
    // The same 21.5 row with one frame moved two pixels further: half a pixel is nothing and two and
    // a half is two, so the move available to it is the two the artwork can actually be carried.
    expect(drifts(along(0, 21, 45, 64, 86))).toEqual([0, 0, 2, 0, 0]);
  });
});
