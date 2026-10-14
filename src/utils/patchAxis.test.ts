import { describe, expect, it } from 'vitest';
import { patchAxis } from './patchAxis.ts';

/** Boundary evidence along a patch from `origin` to `end`, a spike at each absolute position given. */
function evidence(origin: number, end: number, lines: readonly number[]): Float64Array {
  const axis = new Float64Array(end - origin);
  for (const line of lines) axis[line - origin] = 100;
  return axis;
}

/** Every cut from `from` to below `to`, `step` apart. */
function lattice(from: number, to: number, step: number): number[] {
  const cuts: number[] = [];
  for (let cut = from; cut < to; cut += step) cuts.push(cut);
  return cuts;
}

describe('patchAxis', () => {
  it('moves every interior cut to the sprite’s own phase, keeping the count and the first cut', () => {
    // The sheet's cuts every 6 from 0, a sprite whose boundaries sit 2 later.
    const cuts = lattice(0, 60, 6);
    const placed = patchAxis(cuts, 60, evidence(0, 60, lattice(8, 60, 6)), 6);

    expect(placed).toEqual([0, ...lattice(8, 60, 6)]);
  });

  it('takes a shift backwards as well, the first cell giving up the difference', () => {
    const cuts = lattice(12, 72, 6);
    const placed = patchAxis(cuts, 72, evidence(12, 72, lattice(16, 72, 6)), 6);

    expect(placed).toEqual([12, ...lattice(16, 66, 6)]);
  });

  it('pulls a shift back rather than squeeze an edge cell that is already narrow', () => {
    // A two-pixel first cell — the sheet's end band — and a sprite 2 earlier than the cuts: taking
    // the whole shift would close the first cell entirely.
    const cuts = [0, 2, 8, 14, 20, 26];
    const placed = patchAxis(cuts, 32, evidence(0, 32, [6, 12, 18, 24]), 6);

    expect(placed[1]).toBe(2);
    expect(placed).toHaveLength(cuts.length);
    for (const [index, cut] of placed.entries()) {
      expect((placed[index + 1] ?? 32) - cut, `cell ${String(index)}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('lets an edge cell of the grid’s width shrink to half a cell and no further', () => {
    // At a grid of 2, a sprite one pixel out of phase leaves a field cell one pixel wide.
    const cuts = lattice(0, 20, 2);
    const placed = patchAxis(cuts, 20, evidence(0, 20, lattice(3, 20, 2)), 2);

    expect(placed).toEqual([0, ...lattice(3, 20, 2)]);
  });

  it('snaps each cut to a drifting line within the window, holding its neighbours to the grid', () => {
    // Boundaries every 6, then every 7 from the fourth on: the drift a single shift cannot follow.
    const lines = [6, 12, 18, 25, 32, 39];
    const placed = patchAxis(lattice(0, 42, 6), 45, evidence(0, 45, lines), 6);

    expect(placed).toEqual([0, ...lines, ...placed.slice(lines.length + 1)]);
    for (let index = 1; index < placed.length - 1; index += 1) {
      const width = (placed[index + 1] ?? 0) - (placed[index] ?? 0);
      expect(width, `cell ${String(index)}`).toBeGreaterThanOrEqual(4);
      expect(width, `cell ${String(index)}`).toBeLessThanOrEqual(8);
    }
  });

  it('leaves a line alone that would put a cell outside the grid’s tolerance', () => {
    // At a grid of 12 the window is 4 and a cell must stay 8 to 16 wide. Lines 3 after the cut at 12
    // and 3 before the one at 24 cancel as offsets, so nothing shifts, and each is within the window
    // of its cut — but once the first has taken 15, the second would leave a cell 6 wide.
    const placed = patchAxis([0, 12, 24, 36, 48], 60, evidence(0, 60, [15, 21]), 12);

    expect(placed).toEqual([0, 15, 24, 36, 48]);
  });

  it('changes nothing where the patch holds no evidence', () => {
    const cuts = lattice(0, 30, 5);

    expect(patchAxis(cuts, 30, new Float64Array(30), 5)).toEqual(cuts);
  });

  it('has nothing to move on a patch one cell long', () => {
    expect(patchAxis([10], 16, evidence(10, 16, [13]), 6)).toEqual([10]);
  });
});
