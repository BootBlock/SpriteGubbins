import type { PixelGrid } from '../types/quantiser.ts';

/**
 * How far a cut may sit from where the mesh expected it: a third of a cell, rounded down.
 *
 * `meshAxis` accepts a detected line within this of the position its walk expects and re-anchors on
 * it, and `patchAxis` snaps a patch's cut to a line within it, so every interior cell either of them
 * cuts is between `grid − tolerance` and `grid + tolerance` wide. A module of its own because both
 * read it, and two spellings of the window would let the walk and the patches disagree about which
 * line is a boundary.
 *
 * **Always less than half a cell, and that is the whole of the bound.** A line half a cell from the
 * expected position is half a cell from the next boundary as well, so a capture there cannot tell
 * which of the two cells it closes. At a grid of 2 the window this replaced, `max(1, ⌊g/3⌋)`, was
 * exactly half a cell: every line on the axis sat within reach of some expected position, each
 * capture could move every cut after it by a pixel, and on the keyed corpus the walk scored worse
 * than a plain lattice on all four sheets measured at grid 2 (#482). At a grid of 2 the window is
 * now 0, so the walk takes a line only where it lands exactly, and at every larger grid it is what
 * it was.
 */
export function axisTolerance(grid: PixelGrid): number {
  return Math.floor(grid / 3);
}
