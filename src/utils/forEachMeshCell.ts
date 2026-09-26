import type { GridMesh, MeshPatch } from '../types/quantiser.ts';

/**
 * One result cell: its column and row in the result, and the source rectangle it stands for,
 * `[left, right) × [top, bottom)`.
 *
 * Positional rather than one object per cell, because this is called once for every cell of a
 * sheet — 4.2 million of them at a grid of 2 on the largest sheet the app admits — and the note at
 * the top of `imageData.ts` records what a small object handed to a hot callback costs once escape
 * analysis stops applying.
 */
export type MeshCellVisitor = (
  column: number,
  row: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
) => void;

/**
 * Every cell of the mesh, in the result's reading order, each with the source rectangle it covers.
 *
 * **The one walk every pass that reads cells takes**, which is what a mesh of one list of cuts per
 * axis used to guarantee by its shape alone: the vote, the reduction, the painting back and the
 * difference map all agree about where a cell begins because none of them works it out. With
 * patches, a cell's rectangle depends on whether a patch covers it, and six loops each deciding that
 * for themselves would be six chances to decide it differently.
 *
 * A cell a patch covers takes the patch's rectangle and every other cell takes the mesh's own. The
 * patches are disjoint and keep the mesh's cuts at their outer edges, so every source pixel is in
 * exactly one visited rectangle. Rows arrive top to bottom and columns left to right within a row,
 * the scan order the passes' own tie-breaks were written against. A rectangle is clamped to the
 * image, because a mesh cut can land on the image's own edge and close a cell over no pixels.
 *
 * Each row considers only the patches that cover it, kept in column order as the walk moves down,
 * so the cost is the cells plus the patches' rows rather than the cells times the patches.
 */
export function forEachMeshCell(mesh: GridMesh, width: number, height: number, visit: MeshCellVisitor): void {
  const pending = [...mesh.patches].sort((a, b) => a.row - b.row || a.column - b.column);
  let next = 0;
  let active: MeshPatch[] = [];

  for (const [row, meshTop] of mesh.y.entries()) {
    const before = active.length;
    active = active.filter((patch) => row < patch.row + patch.y.length);
    let changed = active.length !== before;
    while (next < pending.length && (pending[next]?.row ?? Infinity) <= row) {
      const patch = pending[next];
      if (patch !== undefined) active.push(patch);
      next += 1;
      changed = true;
    }
    if (changed) active.sort((a, b) => a.column - b.column);

    const meshBottom = Math.min(mesh.y[row + 1] ?? height, height);
    let column = 0;
    for (const patch of active) {
      for (; column < patch.column; column += 1) {
        visitMeshCell(mesh, width, column, row, meshTop, meshBottom, visit);
      }
      const local = row - patch.row;
      const top = patch.y[local] ?? meshTop;
      const bottom = Math.min(patch.y[local + 1] ?? mesh.y[patch.row + patch.y.length] ?? height, height);
      const farEdge = mesh.x[patch.column + patch.x.length] ?? width;
      for (const [index, left] of patch.x.entries()) {
        visit(column, row, left, top, Math.min(patch.x[index + 1] ?? farEdge, width), bottom);
        column += 1;
      }
    }
    for (; column < mesh.x.length; column += 1) {
      visitMeshCell(mesh, width, column, row, meshTop, meshBottom, visit);
    }
  }
}

/** One cell no patch covers, cut by the mesh's own lists. */
function visitMeshCell(
  mesh: GridMesh,
  width: number,
  column: number,
  row: number,
  top: number,
  bottom: number,
  visit: MeshCellVisitor,
): void {
  visit(column, row, mesh.x[column] ?? 0, top, Math.min(mesh.x[column + 1] ?? width, width), bottom);
}
