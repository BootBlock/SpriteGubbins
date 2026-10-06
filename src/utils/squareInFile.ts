import type { SheetRegion, SpriteCell } from '../types/spriteCell.ts';

/** Where a piece's tile square lands in its file under `IN_PLACE`, and the one factor it is drawn at. */
export interface SquareInFile {
  /** The square's top-left corner in the file. Negative on an axis where the file is the smaller. */
  readonly x: number;
  readonly y: number;
  /** The square's side in the file. */
  readonly side: number;
  /** File pixels per drawn pixel of the sheet. */
  readonly factor: number;
}

/**
 * Where the tile square a piece was drawn against lands in its file under `IN_PLACE`.
 *
 * **Where the fit resamples, the square is scaled onto the file**, its width onto the file's width, at
 * the file's top-left corner, so a corner badge drawn in the top-right of the square is the top-right of
 * the file.
 *
 * **On a sheet with a pixel scale the square keeps its drawn size and is centred in the file**, which is
 * the size the reader stated. Centred, because the squares of one row and one column share their centres
 * (`latticeSquares`) while their sides differ, a piece drawn to the whole tile being squared from its own
 * box: a square pinned by its corner moved each piece by half that difference, so the files of one set
 * no longer lay over one icon in register. The centre is also the pivot the manifest states for every
 * such piece (`TILE_CENTRE`). An odd slack is floored, as every centring in the cut is (`offsetFor`).
 * Where the file is smaller than the square, the square overhangs it on both sides, and `outOfPlace`
 * refuses a piece the file would clip.
 */
export function squareInFile(square: SheetRegion, cell: SpriteCell): SquareInFile {
  if (cell.resamples) return { x: 0, y: 0, side: cell.width, factor: cell.width / square.width };
  return {
    x: Math.floor((cell.width - square.width) / 2),
    y: Math.floor((cell.height - square.height) / 2),
    side: square.width,
    factor: 1,
  };
}
