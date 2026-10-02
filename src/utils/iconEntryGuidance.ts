import { fieldLabelFor } from '../constants/categories/index.ts';
import { DAMAGE_SCHOOL_DEFINITIONS } from '../constants/iconCatalogue/damageSchools.ts';
import type { IconCatalogueEntry } from '../types/iconCatalogue.ts';
import { iconLookText } from './iconLookText.ts';
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
 */
export function iconEntryGuidance(entry: IconCatalogueEntry, world: string): string {
  const look = iconLookText(entry, world);
  const field = fieldLabelFor('ICON', 'setting');
  const typed = world.trim();
  const where = typed === '' ? `With no ${field} set` : `Under your ${field}, “${typed}”`;
  return [
    slotParagraph(entry),
    `${where}, the sheet draws it as ${look}.`,
    ...schoolParagraph(entry),
    shapeParagraph(entry),
  ].join('\n\n');
}

/**
 * Why a spell's line names a colour: the school's colour is the icon's own, ahead of the set's. Nothing
 * for an entry outside a school.
 */
function schoolParagraph(entry: IconCatalogueEntry): readonly string[] {
  if (entry.school === undefined) return [];
  const { label } = DAMAGE_SCHOOL_DEFINITIONS[entry.school];
  return [
    `It is a ${label} ability. Every icon of that school shares its colour, which leads the icon ahead of your set’s primary and accent colours, so a player tells the schools apart at a glance.`,
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

/** Whether it is one drawing or a toggle pair, and whether it may show a figure. */
function shapeParagraph(entry: IconCatalogueEntry): string {
  const drawings =
    entry.states === undefined
      ? 'It is one drawing, and counts as one of the set’s components.'
      : `It is one icon drawn ${spokenIconState(entry.states[0])} and then ${spokenIconState(entry.states[1])}, so it counts as two of the set’s components, and the pair always shares a sheet.`;
  const figure =
    entry.figure === true
      ? ' Its drawing includes a hand, a face or a figure, which the set’s exclusions allow because this entry names one.'
      : '';
  return `${drawings}${figure}`;
}
