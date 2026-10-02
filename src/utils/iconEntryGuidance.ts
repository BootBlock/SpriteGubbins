import { fieldLabelFor } from '../constants/categories/index.ts';
import type { IconCatalogueEntry } from '../types/iconCatalogue.ts';
import type { CustomIconEntry, IconEntry } from '../types/iconRoster.ts';
import { damageSchoolName } from './damageSchoolName.ts';
import { iconLookText } from './iconLookText.ts';
import { iconSlotNames } from './iconSlotNames.ts';
import { spokenIconState } from './spokenIconState.ts';

/**
 * The guidance card behind one catalogue row's checkbox: the slot it adds, what it is drawn as in this
 * world, the damage school a spell belongs to, and how many drawings it is.
 *
 * **Written from the entry rather than typed per entry**, because a card per entry by hand would be a
 * card for every entry of the catalogue, each free to drift from the entry it describes. The look comes
 * through `iconLookText`, the resolver the sheet's inventory line uses, so the card and the prompt
 * cannot disagree about what is drawn or in which school's colour; `world` is the subject's *World &
 * Era* as it stands, typed text included.
 *
 * **An entry of the reader's own gets a shorter card from the same parts**: the sprites it names, that
 * the look is theirs under every world and that the set and the library each hold a copy, its school
 * and its shape. Its look is not repeated, because the
 * row shows it under the label as the reader wrote it, and a look written to its limit would take the
 * card past the length a card is read at.
 */
export function iconEntryGuidance(entry: IconEntry, world: string): string {
  const field = fieldLabelFor('ICON', 'setting');
  const typed = world.trim();
  const where = typed === '' ? `With no ${field} set` : `Under your ${field}, “${typed}”`;
  if ('look' in entry) {
    return [
      ownSlotParagraph(entry),
      `${where}, the sheet draws your own look as you wrote it, as it would under any other. Unticking takes it off your set, and your library keeps its own copy.`,
      ...ownSchoolParagraph(entry, world),
      shapeParagraph(entry),
    ].join('\n\n');
  }
  return [
    slotParagraph(entry),
    `${where}, the sheet draws it as ${iconLookText(entry, world)}.`,
    ...schoolParagraph(entry, world),
    shapeParagraph(entry),
  ].join('\n\n');
}

/**
 * Why a spell's line names a colour: the school's colour is the icon's own, ahead of the set's. Nothing
 * for an entry outside a school. The school is named as `world` names it, as the line itself does.
 */
function schoolParagraph(entry: IconCatalogueEntry, world: string): readonly string[] {
  if (entry.school === undefined) return [];
  return [
    `It belongs to the ${damageSchoolName(entry.school, world)} school. Every icon of that school shares its colour, which leads the icon ahead of your set’s primary and accent colours, so a player tells the schools apart at a glance.`,
  ];
}

/** The same fact for an entry of the reader's own, said in one sentence to leave room for their words. */
function ownSchoolParagraph(entry: CustomIconEntry, world: string): readonly string[] {
  if (entry.school === undefined) return [];
  return [
    `It belongs to the ${damageSchoolName(entry.school, world)} school, whose one colour leads the icon ahead of your set’s own colours.`,
  ];
}

/** Which named slots ticking the entry adds — a pair names one per state. */
function slotParagraph(entry: IconCatalogueEntry): string {
  if (entry.states === undefined) {
    return `Ticking this adds the slot \`${entry.id}\` to your set: the name its sprite takes in the sheet’s manifest and in the sprite pack’s file names.`;
  }
  const [first, second] = entry.states;
  return `Ticking this adds two slots to your set, \`${entry.id}-${first}\` and \`${entry.id}-${second}\`: the names its two sprites take in the sheet’s manifest and in the sprite pack’s file names.`;
}

/** The sprite names an entry of the reader's own takes — one per state of a pair. */
function ownSlotParagraph(entry: CustomIconEntry): string {
  const slots = iconSlotNames(entry).map((slot) => `\`${slot}\``);
  return slots.length === 1
    ? `Your entry names its sprite ${slots.join('')} in the sheet’s manifest and the sprite pack.`
    : `Your entry names its two sprites ${slots.join(' and ')} in the sheet’s manifest and the sprite pack.`;
}

/**
 * Whether it is one drawing or a toggle pair, and whether it may show a figure.
 *
 * The figure sentence differs by origin because the flag means different things. A catalogue entry's is
 * held by the catalogue test to a look that names a figure. A custom entry's is the reader's own mark,
 * which only quiets the form's warning: no compiler code reads it, and the sheet's figure rescue is
 * unconditional, so the card says what the mark does and no more.
 */
function shapeParagraph(entry: IconEntry): string {
  const drawings =
    entry.states === undefined
      ? 'It is one drawing, and counts as one of the set’s components.'
      : `It is one icon drawn ${spokenIconState(entry.states[0])} and then ${spokenIconState(entry.states[1])}, so it counts as two of the set’s components, and the pair always shares a sheet.`;
  const figure =
    entry.figure !== true
      ? ''
      : 'look' in entry
        ? ' You marked it as showing a figure, which only stops the form warning about one.'
        : ' Its drawing includes a hand, a face or a figure, which the set’s exclusions allow because this entry names one.';
  return `${drawings}${figure}`;
}
