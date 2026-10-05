import { spellNumber, spellNumberCapitalised } from '../../utils/numberWords.ts';
import { ICON_GRID_COLUMNS } from '../iconCatalogue/iconSheetLimits.ts';

/**
 * How the drawings of an ICON sheet sit on it, from their count — `Sixteen drawings, four across and
 * four down, in the reading order below.` A short last row says how many it holds, so a sheet of seven
 * is not read as a grid with a gap to fill.
 *
 * Stated on the icon sheets and the overlay sheets alike, because both lay one drawing to a cell of the
 * same grid ({@link ICON_GRID_COLUMNS}).
 */
export function iconGridSentence(count: number): string {
  if (count === 1) return 'One drawing, alone in the middle of the sheet.';
  const across = Math.min(count, ICON_GRID_COLUMNS);
  const down = Math.ceil(count / ICON_GRID_COLUMNS);
  const remainder = count % ICON_GRID_COLUMNS;
  const lastRow = down > 1 && remainder !== 0 ? `, the last row holding ${spellNumber(remainder)}` : '';
  return `${spellNumberCapitalised(count)} drawings, ${spellNumber(across)} across and ${spellNumber(down)} down${lastRow}, in the reading order below.`;
}
