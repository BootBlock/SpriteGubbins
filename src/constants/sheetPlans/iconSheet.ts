import type { ComponentEntry, SheetPlan } from '../../types/components.ts';
import { componentTotal } from '../../utils/componentTotal.ts';
import { spellNumber, spellNumberCapitalised } from '../../utils/numberWords.ts';
import { ICON_GRID_COLUMNS } from '../iconCatalogue/iconSheetLimits.ts';

/**
 * One icon sheet of an ICON series: a run of the reader's roster, drawn as a grid of whole icons.
 *
 * **Built rather than written**, because what it draws is the reader's list: the entries are the picks
 * this sheet holds, and the intro states the grid from their count, so a short last sheet says it is
 * short rather than promising sixteen. Every icon sheet of a series shares one `assembly` sentence, which
 * is what lets `capabilityRuns` in `utils/seriesCapability.ts` fold them into one run when section 6
 * states what the series delivers.
 *
 * **It counts drawings, not icons.** A two-state entry is one icon drawn twice and takes two cells, so the
 * grid is stated in drawings and the intro says what a ×2 line is; a sheet holding a sound toggle and a
 * potion is three drawings of two icons.
 *
 * `first` is the roster position of this sheet's first drawing, counted in components from one, and with
 * the count it names the sheet — `Icons 17–32`, or `Icon 17` for a sheet of one — so the split drawer
 * tells two sheets of one set apart.
 */
export function iconSheet(entries: readonly ComponentEntry[], first: number): SheetPlan {
  const count = componentTotal(entries);
  return {
    name: count === 1 ? `Icon ${String(first)}` : `Icons ${String(first)}–${String(first + count - 1)}`,
    facings: 'run',
    assembly:
      'a full grid of icons at one cell size — every member filling the same margin at the same visual weight, readable from its silhouette alone at the smallest size the player sees it, and swappable one for another without the grid changing character.',
    targetQuantity: 'COMPONENT',
    extent: 'WHOLE',
    // A two-state entry is drawn once per state, which is the inventory settling a change of position.
    posing: entries.some((entry) => entry.count > 1) ? 'PER_POSITION' : 'UNSTATED',
    // The agreement shape, for EFFECT's reason: these icons are not pieces of each other, so what has to
    // hold is that no member arrives at half the weight of the one beside it.
    scaleExample:
      'one icon and the icon beside it are drawn to the same weight, each filling its own cell to the same margin',
    scaleUnit: 'one icon',
    componentClass: 'one icon of this one set',
    // The overlay sheet draws the *Applied Overlay*; an icon here is drawn bare, for the engine to lay
    // the overlay on at runtime.
    drawnElsewhere: 'clothing',
    assemblyFailure: {
      instruction:
        'Do not draw the icons placed on a hotbar or set into a finished screen anywhere on the sheet, including as a reference or key.',
      exclusion:
        'The icons arranged on a hotbar or any other finished screen, and any picture of the set in use.',
      audit: 'nothing on the sheet is a hotbar or a finished screen with the icons placed on it',
    },
    groups: [
      {
        heading: null,
        intro: `${gridSentence(count)}
Each entry is a different icon of this one set, drawn so the set agrees on weight, margin, outline and
light; an entry marked ×2 is one icon drawn once in each of its two states, in the order it names them.
A colour an entry names is that icon’s own, and outranks the set’s primary and accent colours for it:`,
        entries,
        outro: `Every icon fills the same cell to the same margin, carries the same outline weight, and is lit from
the same direction as every other icon of the set, on this sheet and on every other sheet of it — an
icon that is heavier, larger or lit differently reads as belonging to another pack. No icon carries a
letter, a numeral, a stack count or a key name: those are drawn by the engine at runtime over the top
of the sprite.`,
      },
    ],
  };
}

/**
 * How the drawings sit on the sheet, from their count — `Sixteen drawings, four across and four down, in
 * the reading order below.` A short last row says how many it holds, so a sheet of seven is not read as a
 * grid with a gap to fill.
 */
function gridSentence(count: number): string {
  if (count === 1) return 'One drawing, alone in the middle of the sheet.';
  const across = Math.min(count, ICON_GRID_COLUMNS);
  const down = Math.ceil(count / ICON_GRID_COLUMNS);
  const remainder = count % ICON_GRID_COLUMNS;
  const lastRow = down > 1 && remainder !== 0 ? `, the last row holding ${spellNumber(remainder)}` : '';
  return `${spellNumberCapitalised(count)} drawings, ${spellNumber(across)} across and ${spellNumber(down)} down${lastRow}, in the reading order below.`;
}
