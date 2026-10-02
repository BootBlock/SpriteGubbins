import type { ComponentEntry, SheetPlan } from '../../types/components.ts';
import type { IconLook } from '../../types/iconRoster.ts';
import { componentTotal } from '../../utils/componentTotal.ts';
import { spellNumber, spellNumberCapitalised } from '../../utils/numberWords.ts';
import { ICON_GRID_COLUMNS } from '../iconCatalogue/iconSheetLimits.ts';

/** What one look writes into an icon sheet; everything else about the sheet is the same under both. */
interface IconSheetWording {
  readonly assembly: string;
  readonly scaleExample: string;
  readonly componentClass: string;
  /** Said after the grid sentence, closing on the colon the entries follow. */
  readonly intro: string;
  /** The sentences the outro opens with: how every icon fills its square. */
  readonly agreement: string;
}

/**
 * Each look's wording, beside the one place that reads it.
 *
 * **The full-bleed tile's backdrop is described here and declared on the plan** (`backdrop`), because
 * the two do different work: this prose tells the generator what a tile is, and the declaration is what
 * moves section 0's background item, ICON's exclusions and the wrappers' negatives to agree with it.
 * Its outro answers *Subject Framing* without naming the field, which may be cleared: however loose the
 * subject sits, the backdrop fills the rest, so a padded margin never leaves part of a square unpainted.
 *
 * **"Tile" stays out of the component class**, which `sheetClaims.test.ts` reads for component kinds a
 * sheet lists none of — and `tile` is TERRAIN's kind, the piece meant to repeat against its own copy.
 */
const WORDING: Readonly<Record<IconLook, IconSheetWording>> = {
  FULL_BLEED_TILE: {
    assembly:
      'a full grid of square icons at one size — each painted edge to edge with its subject and its own backdrop, every subject filling its square to the same margin at the same visual weight, readable from its silhouette against that backdrop at the smallest size the player sees it, and swappable one for another inside the frame the interface draws without the grid changing character.',
    scaleExample:
      'one icon and the icon beside it are drawn to the same weight, each square painted to its edge and each subject filling its square to the same margin',
    componentClass: 'one icon of this one set, a square painted to its edge with its own backdrop',
    intro: `Each entry is a different icon of this one set, and each is a square tile painted edge to edge:
the subject and its own backdrop together, with no frame, border or bevel along the tile’s edge,
because the interface draws the frame. The backdrop is a soft field of colour, light and texture behind
the subject, never a scene with a horizon, and it keeps a clear gap in value from the subject so the
subject’s silhouette reads against it. The set agrees on weight, margin, outline, light and backdrop
treatment; an entry marked ×2 is one icon drawn once in each of its two states, in the order it names
them. A colour an entry names is that icon’s own, and outranks the set’s primary and accent colours for
it:`,
    agreement: `Every tile is the same square at the same size, and every subject fills its tile to the same margin,
carries the same outline weight, and is lit from the same direction as every other icon of the set, on
this sheet and on every other sheet of it — an icon that is heavier, larger or lit differently reads as
belonging to another pack. However close or loose a subject sits, its backdrop fills the rest of the
square to the edge, and nothing of the icon crosses that edge.`,
  },
  ISOLATED_MARK: {
    assembly:
      'a full grid of icons at one cell size — every member filling the same margin at the same visual weight, readable from its silhouette alone at the smallest size the player sees it, and swappable one for another without the grid changing character.',
    scaleExample:
      'one icon and the icon beside it are drawn to the same weight, each filling its own cell to the same margin',
    componentClass: 'one icon of this one set',
    intro: `Each entry is a different icon of this one set, drawn so the set agrees on weight, margin, outline and
light; an entry marked ×2 is one icon drawn once in each of its two states, in the order it names them.
A colour an entry names is that icon’s own, and outranks the set’s primary and accent colours for it:`,
    agreement: `Every icon fills the same cell to the same margin, carries the same outline weight, and is lit from
the same direction as every other icon of the set, on this sheet and on every other sheet of it — an
icon that is heavier, larger or lit differently reads as belonging to another pack.`,
  },
};

/**
 * One icon sheet of an ICON series: a run of the reader's roster, drawn as a grid of whole icons in the
 * set's look.
 *
 * **Built rather than written**, because what it draws is the reader's list: the entries are the picks
 * this sheet holds, and the intro states the grid from their count, so a short last sheet says it is
 * short rather than promising sixteen. Every icon sheet of a series shares one `assembly` sentence, which
 * is what lets `capabilityRuns` in `utils/seriesCapability.ts` fold them into one run when section 6
 * states what the series delivers — and a series has one look, so the look never splits that run.
 *
 * **It counts drawings, not icons.** A two-state entry is one icon drawn twice and takes two cells, so the
 * grid is stated in drawings and the intro says what a ×2 line is; a sheet holding a sound toggle and a
 * potion is three drawings of two icons.
 *
 * `first` is the roster position of this sheet's first drawing, counted in components from one, and with
 * the count it names the sheet — `Icons 17–32`, or `Icon 17` for a sheet of one — so the split drawer
 * tells two sheets of one set apart.
 */
export function iconSheet(entries: readonly ComponentEntry[], first: number, look: IconLook): SheetPlan {
  const count = componentTotal(entries);
  const wording = WORDING[look];
  return {
    name: count === 1 ? `Icon ${String(first)}` : `Icons ${String(first)}–${String(first + count - 1)}`,
    facings: 'run',
    assembly: wording.assembly,
    targetQuantity: 'COMPONENT',
    extent: 'WHOLE',
    // A two-state entry is drawn once per state, which is the inventory settling a change of position.
    posing: entries.some((entry) => entry.count > 1) ? 'PER_POSITION' : 'UNSTATED',
    // The agreement shape, for EFFECT's reason: these icons are not pieces of each other, so what has to
    // hold is that no member arrives at half the weight of the one beside it.
    scaleExample: wording.scaleExample,
    scaleUnit: 'one icon',
    componentClass: wording.componentClass,
    // The overlay sheet draws the *Applied Overlay*; an icon here is drawn bare, for the engine to lay
    // the overlay on at runtime.
    drawnElsewhere: 'clothing',
    ...(look === 'FULL_BLEED_TILE' ? { backdrop: 'OWN_SQUARE' } : {}),
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
        intro: `${gridSentence(count)}\n${wording.intro}`,
        entries,
        outro: `${wording.agreement}
No icon carries a letter, a numeral, a stack count or a key name: those are drawn by the engine at
runtime over the top of the sprite.`,
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
