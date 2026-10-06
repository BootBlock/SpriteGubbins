import type { SpriteBox } from '../types/quantiser.ts';
import type { SpriteCell, SpritePlacement } from '../types/spriteCell.ts';
import { latticeCellOf } from './latticeCellOf.ts';

/**
 * Where a piece of a placement sheet lands in its file under `IN_PLACE`, or `null` where the sheet's
 * cells were not read or no cell holds the piece.
 *
 * **The square the piece was placed against becomes the cell.** The cell is the lattice cell whose
 * region holds the piece's box centre (`latticeCellOf`) — a piece the reader joined across two cells is
 * placed against the cell its centre falls in, reaches past that square, and is refused by `outOfPlace`
 * — and its square is that piece's own box squared where it spans the tile, the tile square where it
 * keeps a place of its own, or a square of the cell's side on an isolated look (`LatticeCell.square`). One factor
 * maps the square's width onto the file's, `f`, and the piece's own box is drawn at `f` times its size,
 * `f` times its offset from the square's corner in. So a corner badge drawn in the top-right of the tile
 * square is the top-right of the file, every piece that keeps its place is scaled alike, and a halo
 * drawn larger than the veil still fills its file. Each edge is rounded rather than the offset and the
 * size apart, so a piece flush with its square's edge is flush with the file's, never a pixel past it.
 *
 * **`f` is 1 on a sheet with a pixel scale** (`SpriteCell.resamples`, from `resizingFitAllowed`): the
 * lattice reading has brought pixel art down to one file pixel per drawn pixel, and resampling it would
 * blend the pixels apart. Nothing is recentred; a piece that leaves the file by more than
 * `PLACE_OVERSHOOT` is refused by `oversizedSprites` before the writer reaches here, and `placeInCell`
 * clips the slight overshoot of the rest.
 */
export function inPlacePlacement(box: SpriteBox, cell: SpriteCell): SpritePlacement | null {
  const square = latticeCellOf(box, cell)?.square;
  if (square === undefined || square.width <= 0) return null;
  const factor = cell.resamples ? cell.width / square.width : 1;
  const x = Math.round((box.left - square.left) * factor);
  const y = Math.round((box.top - square.top) * factor);
  return {
    source: { left: box.left, top: box.top, width: box.width, height: box.height },
    x,
    y,
    width: Math.max(1, Math.round((box.left + box.width - square.left) * factor) - x),
    height: Math.max(1, Math.round((box.top + box.height - square.top) * factor) - y),
  };
}
