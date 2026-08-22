/**
 * Which side of a boundary the crossing edge at one end of a run sits on.
 *
 * `LOW` and `HIGH` name the two sides of the boundary line rather than up and down, because the
 * same walk is run along both axes: for a boundary between two rows the low side is the upper row,
 * and for one between two columns it is the left column. Naming them by direction would make one of
 * the two callers read backwards.
 *
 * `NONE` is both the run reaching the image border and the pattern being ambiguous — a crossing edge
 * on *both* sides, which is what a one-pixel spur or a corner of three regions produces. Neither
 * gives the reconstruction a direction to take, and inventing one is how a morphological pass puts a
 * fringe on a shape that has no slope.
 */
export type RunTurn = 'LOW' | 'HIGH' | 'NONE';

/**
 * One boundary line's worth of reconstructed sub-pixel coverage — the geometry at the heart of
 * morphological anti-aliasing.
 *
 * The line is an abstraction over one row of a sheet's horizontal discontinuities or one column of
 * its vertical ones: `separated(index)` says whether the two pixels either side of the boundary
 * differ there, and `turnAt(index)` says which side the boundary crosses to in the gap *before*
 * `index` — so `turnAt(0)` and `turnAt(span)` are the image border and answer `NONE`.
 *
 * **What it reconstructs.** A maximal run of `separated` indices is a straight step of a contour
 * that is really a slope. Reshetov's *Morphological Antialiasing* (HPG 2009) recovers that slope
 * from how the run terminates: the run is split at its midpoint and each half is treated as an
 * L-shape terminated by one crossing edge, which is what makes the Z and U cases fall out rather
 * than needing arithmetic of their own. For a half of length `h` whose end turns, the reconstructed
 * boundary runs from the discontinuity line at the split point to half a pixel clear of it at the
 * turning end, so the area it cuts off the pixel whose centre sits `d` from the split point is
 * `0.5 · d / h`. A half whose end does not turn contributes nothing.
 *
 * **The sign is which pixel the area belongs to.** Positive says the low-side pixel is really part
 * of the high side by that fraction, so it is the one to blend; negative says the reverse. The
 * magnitude is strictly below `0.5`, because the farthest pixel centre from the split sits half a
 * pixel short of the run's end.
 *
 * **A run one pixel long blends nothing, and that is the right answer here.** Its only pixel centre
 * sits exactly on the split point, so `d` is zero. A perfect 45° staircase is made entirely of such
 * runs, which is the known behaviour of plain morphological anti-aliasing on diagonals — the reason
 * SMAA added explicit diagonal patterns for the real-time case. A clean 45° line is the one contour
 * a pixel artist does not anti-alias, so leaving it alone is the behaviour this pass wants.
 *
 * `shortestRun` drops runs below a length outright, which is the reader's control over how short a
 * step is worth softening at all. `onCoverage` is called only where the coverage is non-zero.
 *
 * Pure, and allocation-free: no run is ever built as an object, because a contoured sheet of the
 * 16.8 million pixels this app admits would build millions of them.
 */
export function walkEdgeRuns(
  span: number,
  shortestRun: number,
  separated: (index: number) => boolean,
  turnAt: (index: number) => RunTurn,
  onCoverage: (index: number, coverage: number) => void,
): void {
  let start = 0;

  while (start < span) {
    if (!separated(start)) {
      start += 1;
      continue;
    }

    let end = start + 1;
    while (end < span && separated(end)) end += 1;

    const length = end - start;
    if (length >= shortestRun) {
      emit(start, length, turnAt(start), turnAt(end), onCoverage);
    }
    start = end;
  }
}

/**
 * One run's pixels, each with the signed area the reconstructed boundary cuts off it.
 *
 * The midpoint is in continuous coordinates, where index `i` occupies `[i, i + 1)` and its centre is
 * `i + 0.5` — so a run of even length splits between two pixels and one of odd length splits through
 * the middle pixel, whose centre then sits on the split and takes no coverage. Both are the
 * geometry rather than a case: the reconstructed boundary crosses the discontinuity at the run's
 * centre, and a pixel the crossing bisects has as much of itself on one side as the other.
 */
function emit(
  start: number,
  length: number,
  before: RunTurn,
  after: RunTurn,
  onCoverage: (index: number, coverage: number) => void,
): void {
  if (before === 'NONE' && after === 'NONE') return;

  const middle = start + length / 2;
  const half = length / 2;

  for (let index = start; index < start + length; index += 1) {
    const centre = index + 0.5;
    const turn = centre < middle ? before : after;
    if (turn === 'NONE') continue;

    const area = (0.5 * Math.abs(centre - middle)) / half;
    if (area > 0) onCoverage(index, turn === 'LOW' ? area : -area);
  }
}
