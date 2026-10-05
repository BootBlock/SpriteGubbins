import type { SheetPlan } from './components.ts';
import type { SheetRegion } from './spriteCell.ts';

/**
 * What a placement sheet's cells are read against: the sheet's size, the grid it states, where a piece
 * stands in its cell, and the tile square's stated share of the cell.
 *
 * `tileCells` are the cells the plan puts a piece that is the whole tile square in — the veil and the
 * halo (`ComponentEntry.fillsTile`) — counted from zero in reading order, which is the
 * order the prompt lays one piece to a cell. The tile square is measured from the pieces found there.
 */
export interface LatticeRequest {
  readonly width: number;
  readonly columns: number;
  readonly placement: NonNullable<SheetPlan['placement']>;
  /** The tile square's side as a fraction of the cell's (`TILE_SHARE`), which `WITHIN_CELL` ignores. */
  readonly share: number;
  readonly tileCells: readonly number[];
}

/** One occupied cell of a placement sheet. */
export interface LatticeCell {
  /** Row × columns + column, so an empty cell leaves its neighbours' indices alone. */
  readonly index: number;
  /** The cell itself, in the sheet's drawn pixels. */
  readonly region: SheetRegion;
  /**
   * The square a piece in this cell is placed against: the cell under `WITHIN_CELL`, and under
   * `WITHIN_TILE` the full-tile piece's own box where the cell holds one, or a square of the tile side
   * centred in the cell.
   */
  readonly square: SheetRegion;
}

/**
 * A placement sheet's cells as read from the gaps between its pieces, or why they could not be read.
 *
 * `cellOf` is each segmented box's cell index, in the segmentation's order. A failure names the boxes
 * it is about, by their position in that order counting from zero, and never falls back to centring:
 * a piece cut into the wrong cell is a file at the wrong place on the icon.
 */
export type CellLattice =
  | {
      readonly kind: 'CELLS';
      readonly cells: readonly LatticeCell[];
      readonly cellOf: readonly number[];
      /** The tile square's side under `WITHIN_TILE`, measured or stated; `null` under `WITHIN_CELL`. */
      readonly tileSide: number | null;
    }
  | { readonly kind: 'FAILED'; readonly reason: string; readonly boxes: readonly number[] };
