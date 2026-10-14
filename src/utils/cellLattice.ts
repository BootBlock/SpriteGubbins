import type { CellLattice, LatticeRequest } from '../types/cellLattice.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { SheetRegion } from '../types/spriteCell.ts';
import { latticeBoundaries } from './latticeBoundaries.ts';
import { latticeSquares } from './latticeSquares.ts';
import { median } from './median.ts';
import { roundedRegion } from './roundedRegion.ts';

/** One axis's cells: where each starts and how wide it is, by its index along the axis. */
interface AxisEdges {
  readonly start: (index: number) => number;
  readonly size: (index: number) => number;
}

/**
 * A placement sheet's cells, read from the gaps between its pieces (`SheetPlan.placement`).
 *
 * **Never a global lattice, and never the pieces' centres.** An overlay piece sits off centre in its
 * cell on purpose — a corner badge in its corner — so the band centres the Quantise tab reads every other
 * sheet by (`spriteBands`, `spritePitch`) cannot find these cells, and a generated sheet drifts a few
 * percent from the grid its prompt states, so the nominal grid alone cuts a piece near a boundary.
 *
 * 1. The nominal step is the sheet's width over the grid's columns, which is how the prompt states the
 *    cell, on both axes.
 * 2. The row boundaries are the empty runs nearest each nominal boundary (`latticeBoundaries`).
 * 3. The column boundaries are read the same way, row by row, from the pieces whose centres fall in it.
 * 4. A row's or column's outer edge is its inner boundary less or plus the median measured step, or the
 *    nominal step where the axis has too few boundaries to measure one between them.
 * 5. The square a piece is placed against is a square of the median cell's side under `WITHIN_CELL`.
 *    Under `WITHIN_TILE` it is the own box, squared to its longer side, of a piece drawn to the whole
 *    tile, and otherwise a square of the tile side. Each is centred where those pieces put the squares
 *    in its row and column, or where its own line's pieces allow in a line that holds none. The tile
 *    side is measured from the veil alone, held to the share the prompt states within
 *    `TILE_TOLERANCE`, or is that share where the sheet holds no veil (`latticeSquares`).
 *
 * A boundary with no gap near it, a piece past the grid's last column, or a tile that disagrees with
 * the stated share is a failure naming the boxes, never a fall back to centring. Pure.
 */
export function cellLattice(boxes: readonly SpriteBox[], request: LatticeRequest): CellLattice {
  const step = request.width / request.columns;
  const centreY = boxes.map((box) => box.top + box.height / 2);
  const rows = latticeBoundaries(
    boxes.map((box) => [box.top, box.top + box.height]),
    centreY,
    step,
  );
  if (rows.missing !== null) return straddling(boxes, rows.missing, 'top', 'height', 'row');
  const rowOf = centreY.map((centre) => rows.inner.filter((boundary) => boundary < centre).length);
  const rowEdges = edges(rows.inner, step);

  const cellOf: number[] = boxes.map(() => -1);
  const columnEdges = new Map<number, AxisEdges>();
  for (const row of new Set(rowOf)) {
    const members = boxes.flatMap((_box, index) => (rowOf[index] === row ? [index] : []));
    const centreX = members.map((index) => (boxes[index]?.left ?? 0) + (boxes[index]?.width ?? 0) / 2);
    const spans = members.map((index): [number, number] => {
      const box = boxes[index];
      return box === undefined ? [0, 0] : [box.left, box.left + box.width];
    });
    const columns = latticeBoundaries(spans, centreX, step);
    if (columns.missing !== null) {
      const among = members.map((index) => boxes[index]).filter((box) => box !== undefined);
      const failed = straddling(among, columns.missing, 'left', 'width', 'column');
      return { ...failed, boxes: failed.boxes.map((at) => members[at] ?? at) };
    }
    columnEdges.set(row, edges(columns.inner, step));
    for (const [at, index] of members.entries()) {
      const column = columns.inner.filter((boundary) => boundary < (centreX[at] ?? 0)).length;
      cellOf[index] = column >= request.columns ? -1 : row * request.columns + column;
    }
  }
  const past = cellOf.flatMap((cell, index) => (cell < 0 ? [index] : []));
  if (past.length > 0) {
    return { kind: 'FAILED', reason: `${pieces(past)} past the grid’s last column`, boxes: past };
  }

  const regions = new Map<number, SheetRegion>();
  for (const cell of new Set(cellOf)) {
    const row = Math.floor(cell / request.columns);
    const across = columnEdges.get(row);
    if (across === undefined) continue;
    const column = cell % request.columns;
    regions.set(
      cell,
      roundedRegion(across.start(column), rowEdges.start(row), across.size(column), rowEdges.size(row)),
    );
  }
  return latticeSquares(boxes, cellOf, regions, request);
}

/**
 * One axis's cells from its inner boundaries: the median step between them at the outer edges, or the
 * nominal step where there are too few boundaries to step between.
 */
function edges(inner: readonly number[], step: number): AxisEdges {
  const pitch =
    inner.length < 2 ? step : median(inner.slice(1).map((at, index) => at - (inner[index] ?? at)));
  const at = (index: number): number => {
    if (inner.length === 0) return index * step;
    if (index === 0) return (inner[0] ?? 0) - pitch;
    return inner[index - 1] ?? (inner.at(-1) ?? 0) + pitch * (index - inner.length);
  };
  return { start: at, size: (index) => at(index + 1) - at(index) };
}

/** The failure for a boundary no gap was found near, naming the boxes across it. */
function straddling(
  boxes: readonly SpriteBox[],
  at: number,
  start: 'top' | 'left',
  size: 'height' | 'width',
  axis: 'row' | 'column',
): Extract<CellLattice, { kind: 'FAILED' }> {
  const across = boxes.flatMap((box, index) =>
    box[start] < at && box[start] + box[size] > at ? [index] : [],
  );
  const named = across.length > 0 ? across : boxes.map((_box, index) => index);
  return {
    kind: 'FAILED',
    reason: `no gap between ${axis}s near ${String(Math.round(at))} drawn pixels, where ${pieces(named)} across it`,
    boxes: named,
  };
}

/** The boxes a failure names, as the preview's chips number them. */
function pieces(indices: readonly number[]): string {
  const numbers = indices.map((index) => String(index + 1));
  return numbers.length === 1 ? `sprite ${numbers[0] ?? ''} lies` : `sprites ${numbers.join(', ')} lie`;
}
