import type { SpriteBox } from '../types/quantiser.ts';
import type { SpriteCell } from '../types/spriteCell.ts';
import { evenScale } from './evenScale.ts';
import { median } from './median.ts';

/**
 * What the cell panel's chip says: how many pieces will not fit, or else the cell in force and, under
 * a fit that resizes, what it will do to the sprites — the panel's preview of the cut, since the
 * files themselves are written only at the press.
 *
 * The cell is named in every branch so the chip is worth reading in any — a reader who has just
 * typed a size wants to see the size they typed, whether or not it worked. `Scale evenly` states its
 * one factor as a percentage, which is the figure a reader checks against the sheet: a set drawn on a
 * 300-pixel step into a 128 px cell reads 43%, and a figure far from what they expected says the
 * sheet's pitch was measured from something other than the grid they drew.
 *
 * **Kept to the length of a chip rather than written as a sentence**, because `Badge` carries
 * `whitespace-nowrap` and is an inline-flex item that cannot shrink below its own text. Below
 * `--breakpoint-quantise` the panel is the page width, so a sentence here would spill past the
 * panel's border on a phone and give the body a horizontal scroll. The sentence a reader needs
 * exists twice already — the guidance behind the ⓘ, and the refusal the press itself reports, which
 * names the offending piece rather than only counting the pieces.
 *
 * **`Keep place` states its factor too**: on a full-bleed look the tile square's, the cell's shorter side over
 * `CellLattice.tileSide`, which every piece that keeps a place of its own is drawn at — a piece drawn
 * to the whole tile is fitted to its own box, so the chip names the square rather than every piece;
 * on an isolated look the cell's, which every piece shares; or that each piece keeps its drawn size on
 * a sheet with a pixel scale, whose square is centred in the cell. A piece out of place is one past its
 * square or past the cell (`inPlaceOvershoot`). Where the sheet's cells could not be read it says so, since every piece
 * is then refused.
 *
 * Pure, as everything in this directory is.
 */
export function cellBadgeText(cell: SpriteCell, boxes: readonly SpriteBox[], over: number): string {
  const size = `${String(cell.width)} × ${String(cell.height)}`;
  if (cell.fit === 'IN_PLACE') return inPlaceText(cell, size, over);
  if (over > 0) return `${over === 1 ? '1 sprite' : `${String(over)} sprites`} larger than ${size}`;
  if (cell.fit === 'SCALE_SET') return `${size} cell at ${String(Math.round(evenScale(boxes, cell) * 100))}%`;
  if (cell.fit === 'FILL_SQUARE') return `${size} cell, each square filled`;
  return `${size} cell`;
}

/** The chip under `Keep place`: the lattice failure, the pieces out of place, or the one factor. */
function inPlaceText(cell: SpriteCell, size: string, over: number): string {
  const lattice = cell.lattice;
  if (lattice?.kind !== 'CELLS') return 'Cells not found on this sheet';
  if (over > 0) return `${over === 1 ? '1 sprite' : `${String(over)} sprites`} out of place in ${size}`;
  if (!cell.resamples) return `${size} cell, each tile square centred as drawn`;
  // The side the square is drawn at in the file (`squareInFile`).
  const fill = Math.min(cell.width, cell.height);
  if (lattice.tileSide !== null) {
    return `${size} cell, tile square at ${String(Math.round((fill / lattice.tileSide) * 100))}%`;
  }
  const side = median(lattice.cells.map((latticeCell) => latticeCell.square.width));
  return `${size} cell, each piece in place at ${String(Math.round((fill / side) * 100))}%`;
}
