import type { GridMesh, LeadingCellShift, PixelGrid } from '../types/quantiser.ts';

/**
 * The mesh's leading-cell placement, in the terms the comparison view draws with.
 *
 * The panes draw the result at one uniform magnification, so what they need from the mesh is how far
 * its first interior cut on each axis sits from where a full leading cell would put it — the second
 * start, against `grid`. A mesh whose cells drift can put any interior cut a pixel or two off the
 * uniform position, which a uniformly scaled canvas cannot represent; the leading cell is the one cut
 * it can place exactly, and placing it keeps the panes within the drift itself, exact whenever the
 * art is regular.
 *
 * **The shift is signed, because the leading cell can be either side of `grid`.** One narrower is
 * art inset from the corner: the walk steps back from its anchor until the first cut is at most
 * `grid` in. One wider is an end band `boundEndCells` folded into the first cell, which puts the first
 * cut at the band plus a whole cell — 7 or 8 at a grid of 6.
 *
 * **It reads a bound cell, not an arbitrary one**, and that is what keeps the correction a rendering
 * matter rather than a compensation for the result itself. `boundEndCells` merges an end band of
 * fewer than three source pixels into the cell beside it, so what this reports is a cell that holds a
 * band of the sheet — never a one-pixel band, which the exported file would carry as an ordinary row
 * while this view moved the pane to hide it.
 */
export function leadingCellShift(mesh: GridMesh, grid: PixelGrid): LeadingCellShift {
  const along = (starts: readonly number[]): number => {
    const second = starts[1];
    return second === undefined ? 0 : second - grid;
  };
  return { x: along(mesh.x), y: along(mesh.y) };
}
