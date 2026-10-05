import type { LatticeCell } from '../types/cellLattice.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { SpriteCell, SpritePlacement } from '../types/spriteCell.ts';

/**
 * Where a piece of a placement sheet lands in its file under `IN_PLACE`, or `null` where the sheet's
 * cells were not read or no cell holds the piece.
 *
 * **The square the piece was placed against becomes the cell.** The cell is the lattice cell whose
 * region holds the piece's box centre (`latticeCellOf`) — a piece the reader joined across two cells is
 * placed against the cell its centre falls in, reaches past that square, and is refused by `outOfPlace`
 * — and its square is the tile square, or the cell itself on an isolated look (`LatticeCell.square`). One
 * factor maps the square's width onto the file's, `f`, and the piece's own box is drawn at `f` times its
 * size, `f` times its offset from the square's corner in. So a corner badge drawn in the top-right of
 * the tile square is the top-right of the file, and every piece of the set is scaled alike.
 *
 * **`f` is 1 on a sheet with a pixel scale** (`SpriteCell.resamples`, from `resizingFitAllowed`): the
 * lattice reading has brought pixel art down to one file pixel per drawn pixel, and resampling it would
 * blend the pixels apart. Nothing is recentred; a piece that leaves the file is refused by
 * `oversizedSprites` before the writer reaches here, and `placeInCell` clips whatever is handed to it.
 */
export function inPlacePlacement(box: SpriteBox, cell: SpriteCell): SpritePlacement | null {
  const square = latticeCellOf(box, cell)?.square;
  if (square === undefined || square.width <= 0) return null;
  const factor = cell.resamples ? cell.width / square.width : 1;
  return {
    source: { left: box.left, top: box.top, width: box.width, height: box.height },
    x: Math.round((box.left - square.left) * factor),
    y: Math.round((box.top - square.top) * factor),
    width: Math.max(1, Math.round(box.width * factor)),
    height: Math.max(1, Math.round(box.height * factor)),
  };
}

/** The lattice cell whose region holds this box's centre, or `undefined` for none. */
export function latticeCellOf(box: SpriteBox, cell: SpriteCell): LatticeCell | undefined {
  if (cell.lattice?.kind !== 'CELLS') return undefined;
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  return cell.lattice.cells.find(
    ({ region }) =>
      x >= region.left && x < region.left + region.width && y >= region.top && y < region.top + region.height,
  );
}
