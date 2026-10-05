import type { ResolutionProfile } from '../../types/output.ts';

/**
 * How much of its cell's width and height the one square of a fixed-grid sheet takes, as a percentage,
 * per resolution profile: the tile square an ICON set draws every icon to, and every overlay piece
 * within (`SheetPlan.placement`).
 *
 * **One exact figure, never a range**, because the Quantise tab has to find that square again. A range
 * let a generator draw the icons of one sheet at 55% and the overlay pieces of the next at 64%, and an
 * overlay piece placed against a square of the wrong size lands off the corner it marks. So section 2
 * states the figure on every sheet of an icon set, icon and overlay sheets alike (`shareText`), and
 * `cellLattice` measures the square from the full-tile pieces and checks it against the same figure.
 *
 * **Inside each share rung's range**, so a profile still means what its guidance says it does: high
 * resolution draws the square larger than mid. The two profiles that state no share of their own — a
 * target size, and the 16-bit scale's height — take the high rung's figure, which stays under the
 * `1 / SHEET_CELL_PITCH` a pixel-art sheet's native grid is seated against (`nativeGridScale`), so the
 * enlargement section 2 asks for still fits the square inside its cell.
 */
export const TILE_SHARE: Readonly<Record<ResolutionProfile, number>> = {
  HIGH_RESOLUTION: 60,
  MID_RESOLUTION: 45,
  RETRO_16_BIT: 60,
  CUSTOM: 60,
};
