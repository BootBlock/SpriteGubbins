import type { GridMesh } from '../types/quantiser.ts';
import { spriteSegments } from './spriteSegments.ts';

/** A rectangle of result cells: columns `[column, columnEnd)` and rows `[row, rowEnd)`. */
export interface PatchSpan {
  readonly column: number;
  readonly columnEnd: number;
  readonly row: number;
  readonly rowEnd: number;
}

/**
 * The rectangles of cells `meshPatches` re-cuts: one around each sprite on the sheet, in the mesh's
 * own cells, none overlapping another.
 *
 * **The sprites are the sheet's own connected pieces**, labelled by `spriteSegments` over what the
 * key left transparent — the same labelling the result's sprite count is read from, run here on the
 * source. A sheet with no transparency has no pieces to find and a scattered one has too many to
 * mean anything, and both answer no spans, which leaves them on the mesh alone.
 *
 * **A sprite's core is its box widened out to the mesh's cuts, and cores that share a cell merge**,
 * until none do: one cell cannot be cut on two sprites' boundaries, and a merged core reaches
 * further than either half did, so the merge repeats until a pass changes nothing. Each pass is
 * quadratic in the cores left and every pass but the last removes one, which
 * `SCATTERED_SPRITE_CEILING` keeps affordable — the bound `mergeNearby` rests on too.
 *
 * **Each core then grows by `margin` cells on every side, and two margins that meet split
 * the gap between them.** The margin puts the patch's edge cells, the ones that take up its shift, in
 * the field rather than across the sprite's outline. Merging two sprites whose margins meet would
 * make them share one shift, which is the single-lattice compromise the patches exist to undo, and
 * on a sheet packed a cell or two apart it would merge every sprite into one patch. So the two are
 * divided along the axis they are further apart on, at the middle of the gap, and neither loses a
 * cell of its core. Trimming only ever shrinks a span, so one pass over the pairs leaves none
 * overlapping. `meshPatches` passes `PATCH_MARGIN_CELLS`, which states why the margin is one cell.
 */
export function patchSpans(image: ImageData, mesh: Pick<GridMesh, 'x' | 'y'>, margin: number): PatchSpan[] {
  const segments = spriteSegments(image, 0);
  if (segments.kind !== 'SEGMENTED') return [];

  const cores = mergeCores(
    segments.boxes.map((box) => ({
      column: cellAt(mesh.x, box.left),
      columnEnd: cellAt(mesh.x, box.left + box.width - 1) + 1,
      row: cellAt(mesh.y, box.top),
      rowEnd: cellAt(mesh.y, box.top + box.height - 1) + 1,
    })),
  );
  const spans = cores.map((core) => ({
    column: Math.max(0, core.column - margin),
    columnEnd: Math.min(mesh.x.length, core.columnEnd + margin),
    row: Math.max(0, core.row - margin),
    rowEnd: Math.min(mesh.y.length, core.rowEnd + margin),
  }));

  for (const [first, a] of cores.entries()) {
    for (let second = first + 1; second < cores.length; second += 1) {
      const b = cores[second];
      const one = spans[first];
      const other = spans[second];
      if (b === undefined || one === undefined || other === undefined || !overlaps(one, other)) continue;
      const across = Math.max(b.column - a.columnEnd, a.column - b.columnEnd);
      const down = Math.max(b.row - a.rowEnd, a.row - b.rowEnd);
      if (across >= down) {
        const [left, right] = a.column < b.column ? [first, second] : [second, first];
        split(spans, cores, left, right, 'column', 'columnEnd');
      } else {
        const [top, bottom] = a.row < b.row ? [first, second] : [second, first];
        split(spans, cores, top, bottom, 'row', 'rowEnd');
      }
    }
  }
  return spans;
}

/** Cores that share a cell, merged until none do. */
function mergeCores(cores: PatchSpan[]): PatchSpan[] {
  let current = cores;
  for (let merged = true; merged;) {
    merged = false;
    const kept: PatchSpan[] = [];
    for (const core of current) {
      const index = kept.findIndex((other) => overlaps(core, other));
      const other = kept[index];
      if (other === undefined) {
        kept.push(core);
        continue;
      }
      kept[index] = {
        column: Math.min(core.column, other.column),
        columnEnd: Math.max(core.columnEnd, other.columnEnd),
        row: Math.min(core.row, other.row),
        rowEnd: Math.max(core.rowEnd, other.rowEnd),
      };
      merged = true;
    }
    current = kept;
  }
  return current;
}

/**
 * Two spans divided at the middle of the gap between their cores along one axis: `before` ends
 * there and `after` starts there. Both cores lie on their own side, so neither span loses one.
 */
function split(
  spans: PatchSpan[],
  cores: readonly PatchSpan[],
  before: number,
  after: number,
  start: 'column' | 'row',
  end: 'columnEnd' | 'rowEnd',
): void {
  const early = cores[before];
  const late = cores[after];
  const one = spans[before];
  const other = spans[after];
  if (early === undefined || late === undefined || one === undefined || other === undefined) return;
  const middle = early[end] + Math.floor((late[start] - early[end]) / 2);
  spans[before] = { ...one, [end]: Math.min(one[end], middle) };
  spans[after] = { ...other, [start]: Math.max(other[start], middle) };
}

/** The cell a source position falls in: the last cut at or before it, clamped to the axis. */
function cellAt(starts: readonly number[], position: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if ((starts[middle] ?? Infinity) <= position) low = middle;
    else high = middle - 1;
  }
  return low;
}

/** Whether two spans share a cell. */
function overlaps(a: PatchSpan, b: PatchSpan): boolean {
  return a.column < b.columnEnd && b.column < a.columnEnd && a.row < b.rowEnd && b.row < a.rowEnd;
}
