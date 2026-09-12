import { describe, expect, it } from 'vitest';
import { DETAILED_STARTS, detailedMarks, detailedSheet } from '../test/detailedSheet.ts';
import { boundaryClusters } from './boundaryClusters.ts';
import { stepProfile, type BoundaryEvidence } from './stepProfile.ts';

/** The interior boundaries a detected list has to account for — position 0 is never a candidate. */
const INTERIOR = DETAILED_STARTS.slice(1);

/** How far the nearest detected line sits from the boundary it should be standing on. */
function worstMiss(found: readonly number[]): number {
  return Math.max(...INTERIOR.map((boundary) => Math.min(...found.map((line) => Math.abs(line - boundary)))));
}

/** Both axes' line positions for a detailed sheet with its detail wherever the caller puts it. */
function linesOf(mark: (cellX: number, cellY: number) => boolean): {
  columns: number[];
  rows: number[];
} {
  const profile = stepProfile(detailedSheet(mark));
  return {
    columns: boundaryClusters(profile.columnEvidence).map((line) => line.position),
    rows: boundaryClusters(profile.rowEvidence).map((line) => line.position),
  };
}

/** An axis handed over as a resampled sheet's magnitude. */
const magnitude = (values: Float64Array): BoundaryEvidence => ({ values, reading: 'MAGNITUDE' });

/** An axis handed over as a crisp sheet's transitions. */
const transitions = (values: Float64Array): BoundaryEvidence => ({ values, reading: 'TRANSITIONS' });

/** The line positions an axis reads to. */
const positions = (evidence: BoundaryEvidence): number[] =>
  boundaryClusters(evidence).map((line) => line.position);

describe('boundaryClusters', () => {
  it('finds every boundary of a drifting sheet that carries no interior detail at all', () => {
    // The control, and the reading that showed the floor was wrong before the detail was ever
    // added: this sheet's only complications are a contour ring, per-pixel wobble and a softening
    // pass, and against the axis mean it gave up eleven of its nineteen boundaries — the ring's own
    // strong edges were enough to lift the floor past the plain ones. Against the background the
    // whole lattice comes back, to the pixel.
    const { columns, rows } = linesOf(() => false);

    expect(columns).toEqual([...INTERIOR]);
    expect(rows).toEqual([...INTERIOR]);
  });

  it('keeps every boundary of a detailed sheet, whose marks used to displace them', () => {
    // The reported defect. The interior marks carry several times what a cell boundary carries, so
    // an axis-mean floor sat above the boundaries themselves: the genuine lines dropped out while
    // the detail that displaced them stayed in, and the mesh walked a list that was partly detail
    // and partly missing. Every boundary is now within a pixel of a detected line — the pixel being
    // what a mark's own edge pulls a merged cluster's centre off by, which is inside the mesh's
    // tolerance and inside what the modal vote absorbs.
    const { columns, rows } = linesOf(detailedMarks);

    expect(worstMiss(columns)).toBeLessThanOrEqual(1);
    expect(worstMiss(rows)).toBeLessThanOrEqual(1);
    // No mark survives as a line of its own: the list is the lattice, not the lattice plus detail.
    expect(columns.length).toBeLessThanOrEqual(INTERIOR.length);
    expect(rows.length).toBeLessThanOrEqual(INTERIOR.length);
  });

  it('reads the same sheet wherever the marks fall, not just where the fixture put them', () => {
    // A floor calibrated to one mark placement rather than to the two levels of the axis would
    // answer the fixture and miss its phase shift, which is a coin flip wearing a threshold's
    // clothes. The marks move a cell each way on both axes; the lattice is read the same.
    const { columns, rows } = linesOf((cellX, cellY) => cellX % 4 === 3 && cellY % 3 === 0);

    expect(worstMiss(columns)).toBeLessThanOrEqual(1);
    expect(worstMiss(rows)).toBeLessThanOrEqual(1);
  });

  it('stays usable where detail fills half the cells on an axis, which no per-axis floor separates', () => {
    // The density at which the two populations genuinely overlap: a mark in every second cell puts
    // as many strong off-grid edges on the axis as there are boundaries, and a mark's edge one
    // pixel from a boundary merges with it whatever the floor is. The claim here is weaker on
    // purpose — every boundary still has a line inside half a cell of it, and the count is still
    // the lattice's — because that is what the mesh needs to anchor, and claiming the pixel would
    // be claiming a separation the axis does not contain. The polluted axis's *pitch* has its own
    // coverage in `profilePeriod.test.ts`, which reads it without the line list at all.
    const { columns, rows } = linesOf((cellX, cellY) => cellX % 2 === 0 && cellY % 2 === 0);

    expect(worstMiss(columns)).toBeLessThanOrEqual(3);
    expect(columns.length).toBeGreaterThanOrEqual(INTERIOR.length - 2);
    expect(columns.length).toBeLessThanOrEqual(INTERIOR.length + 2);
    // The rows axis carries marks two cells apart rather than every mark's pair of edges, so it is
    // the clean reading beside the polluted one — and the two must not be read together.
    expect(worstMiss(rows)).toBe(0);
  });

  it('reports nothing on an axis whose change is spread evenly, however much of it there is', () => {
    // What the multiple over the background is for. A gradient hands every position the same step,
    // so no position carries a multiple of what the others carry, and a confident line here would
    // be an edge the artwork does not have.
    expect(
      boundaryClusters(magnitude(Float64Array.from({ length: 64 }, (_, index) => (index === 0 ? 0 : 900)))),
    ).toEqual([]);
  });

  it('reports nothing where the change is noise around a level rather than structure on it', () => {
    // The same demand under scatter: a floor that split whatever it was given into two classes
    // would call the upper half of a noise band "structure" and hand back thirty lines.
    const noisy = Float64Array.from({ length: 64 }, (_, index) =>
      index === 0 ? 0 : 900 + (((index * 2654435761) >>> 8) % 200),
    );

    expect(boundaryClusters(magnitude(noisy))).toEqual([]);
  });

  it('keeps a sliver of interior detail out of an axis whose background is exactly nothing', () => {
    // What the halfway demand is for. Flat-shaded art repeats its colours exactly, so its
    // non-boundary columns carry nothing at all — and a multiple of nothing is nothing, which would
    // make a stray step worth a fiftieth of a cell boundary a line in its own right. Worse, the
    // sliver here sits beside a boundary, so admitting it merges the two into one cluster whose
    // centre is neither.
    const axis = new Float64Array(24);
    for (const boundary of [6, 12, 18]) axis[boundary] = 672;
    for (const sliver of [7, 8, 9, 10, 11]) axis[sliver] = 12;

    expect(positions(magnitude(axis))).toEqual([6, 12, 18]);
  });

  it('lets one silhouette edge stand over the boundaries without lifting the floor onto them', () => {
    // What the structure level being a *geometric* mean is for. A sheet's strongest edge is often
    // worth many times a cell boundary — a dark contour against a keyed field, a sprite's own
    // outline — and averaging it in arithmetically drags the halfway demand up past the boundaries
    // it was meant to sit under. Twenty boundaries of 100 beside one edge of 5000 average to 333,
    // putting the floor at 167 and taking every boundary with it; they multiply out to 120, which
    // leaves the floor at 60 and the lattice intact.
    const axis = new Float64Array(130).fill(1);
    axis[0] = 0;
    const boundaries = Array.from({ length: 20 }, (_, cell) => (cell + 1) * 6);
    for (const boundary of boundaries) axis[boundary] = 100;
    axis[63] = 5000;

    const found = positions(magnitude(axis));

    for (const boundary of boundaries) {
      expect(found, `lost the boundary at ${String(boundary)}`).toContain(boundary);
    }
  });

  /**
   * A crisp axis at a grid of 3 with a stray in the middle of every cell: boundaries at 3, 6, … 15,
   * and the stray's two transitions on the lines between them, under half of a boundary's evidence.
   * The flat stretch past the art is the background every real axis has, and without it nothing would
   * clear the floor at all.
   */
  function strayedAxis(): Float64Array {
    const axis = new Float64Array(40);
    for (const boundary of [3, 6, 9, 12, 15]) axis[boundary] = 2.54;
    for (const stray of [4, 5, 7, 8, 10, 11, 13, 14]) axis[stray] = 0.97;
    return axis;
  }

  it('reads two crisp changes a pixel apart as two lines, not one between them', () => {
    // A boundary at a grid of 3 touches the transitions of a stray in the middle of its cell, so every
    // position in the run clears the floor. Merged, the run was one line off every boundary in it;
    // the strays sit at under half of the boundaries either side of them, which is the gap between two
    // changes, and each boundary now reads where it is.
    expect(positions(transitions(strayedAxis()))).toEqual([3, 6, 9, 12, 15]);
  });

  it('merges the same run whole on an axis read by magnitude, where it is a ramp', () => {
    // A resampled sheet's neighbouring candidates are the ramp a boundary was spread across, so the
    // valley test is the crisp reading's alone — here the run is one line, as it always was.
    expect(positions(magnitude(strayedAxis()))).toEqual([9]);
  });

  it('keeps a softened ramp one line on either reading, since nothing inside it sits under half of both sides', () => {
    // The shape the merge exists for. A three-tap ramp rises to its middle and falls away, and its
    // shoulders carry half the peak on one side only.
    const axis = new Float64Array(24);
    for (const boundary of [6, 12, 18]) {
      axis[boundary - 1] = 0.25;
      axis[boundary] = 0.5;
      axis[boundary + 1] = 0.25;
    }

    expect(positions(transitions(axis))).toEqual([6, 12, 18]);
    expect(positions(magnitude(axis))).toEqual([6, 12, 18]);
  });

  it('has nothing to report for an axis too short to hold a candidate', () => {
    expect(boundaryClusters(magnitude(new Float64Array(1)))).toEqual([]);
    expect(boundaryClusters(transitions(new Float64Array(0)))).toEqual([]);
  });
});
