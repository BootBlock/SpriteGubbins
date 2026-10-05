import { ICON_GRID_COLUMNS } from '../iconCatalogue/iconSheetLimits.ts';

/**
 * The cell every sheet of an ICON series is drawn on, stated on each of them (audit finding T5).
 *
 * A grid stated only by its count let a generator fit the grid to the canvas, so a sheet of two drew its
 * icons in cells half the canvas wide while a full sheet's were a quarter. Every sheet names one cell, a
 * fraction of the canvas fixed by the four-across grid, so an icon is drawn at one size whichever sheet
 * holds it, and a short sheet leaves canvas empty rather than enlarging what it holds.
 *
 * **The overlay sheets state it too**, so an overlay piece is drawn in a cell the size of the icon's it
 * is laid over, and the Quantise tab finds each piece's cell again (`SheetPlan.placement`).
 */
export const ICON_CELL_SENTENCE = `Each drawing sits in a cell 1/${String(ICON_GRID_COLUMNS)} of the sheet’s width each way — the cell every sheet of this
set is drawn on, so a drawing is the same size on every sheet — and a sheet holding fewer drawings
leaves the rest of its canvas empty rather than drawing them larger.`;
