import type { GridMesh, LeadingCellShift, PixelGrid } from '../types/quantiser.ts';

/**
 * The mesh's leading-cell placement, in the terms the comparison view draws with.
 *
 * The panes draw the result at one uniform magnification, so what they need from the mesh is how far
 * its first interior cut on each axis sits from where a full leading cell would put it — the second
 * start, against `grid`. A mesh whose cells drift can put any interior cut a pixel or two off the
 * uniform position, which a uniformly scaled canvas cannot represent; the leading cell dominates the
 * error, and correcting it keeps the panes within the drift itself, exact whenever the art is regular.
 *
 * **Both directions are corrected.** A leading cell narrower than the grid is art inset from the
 * corner, and one wider is an end band `boundEndCells` folded into the first cell, or a leading cell
 * the mesh walk took at up to `grid` plus its tolerance. Reporting only the narrower kind left every
 * sheet of the wider kind drawn one or two source pixels off its source.
 *
 * **It reads a bound cell, not an arbitrary one**, and that is what keeps the correction a rendering
 * matter rather than a compensation for the result itself. `boundEndCells` merges an end band of
 * fewer than three source pixels into the cell beside it, so what this reports is a cell that holds a
 * band of the sheet — never the one-pixel band that used to reach here, which this view nudged the
 * pane for while the exported file carried it as an ordinary row.
 */
export function leadingCellShift(mesh: GridMesh, grid: PixelGrid): LeadingCellShift {
  const along = (starts: readonly number[]): number => {
    const second = starts[1];
    return second === undefined ? 0 : second - grid;
  };
  return { x: along(mesh.x), y: along(mesh.y) };
}
