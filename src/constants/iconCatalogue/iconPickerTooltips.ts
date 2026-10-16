import { DAMAGE_SCHOOLS, ICON_KINDS } from '../../types/iconCatalogue.ts';
import type { IconKind } from '../../types/iconCatalogue.ts';
import { fieldLabelFor } from '../categories/index.ts';
import { FILTER_HIDES_ROWS_ONLY, TINT_MASK_GREYS_THE_SCHOOL } from '../guidanceSentences.ts';
import { DAMAGE_SCHOOL_DEFINITIONS } from './damageSchools.ts';
import { ICON_KIND_LABELS } from './iconKindLabels.ts';

/**
 * What each kind of shelf holds, completing “_Items and consumables_ are …” in the kind filter's card.
 *
 * A record over the union, as the labels are, so a kind added to `ICON_KINDS` fails to compile here
 * until the card can say what it holds; the card itself names each kind through `ICON_KIND_LABELS`, so a
 * renamed label cannot leave it describing an option the filter no longer offers.
 */
const KIND_HOLDINGS: Readonly<Record<IconKind, string>> = {
  ITEM: 'things a character carries, uses up or equips, and the slots that hold what it equips',
  SPELL: 'the abilities a spellbook and an action bar hold, each in one damage school',
  SOCIAL: 'emotes, chat channels and the faction emblems a player sides with',
  COMPANION: 'mounts, pets and the commands a pet bar gives',
  PROFESSION: 'the crafting and gathering trades',
  SYSTEM: 'the panels, markers and status icons a game’s interface draws',
};

/** Each school by its catalogue name and its colour — `Thermal #F97316` — for the school filter's card. */
const SCHOOL_COLOURS = DAMAGE_SCHOOLS.map(
  (school) => `${DAMAGE_SCHOOL_DEFINITIONS[school].label} ${DAMAGE_SCHOOL_DEFINITIONS[school].hex}`,
).join(', ');

/**
 * Guidance for the catalogue dialog's four filters and its library's project — the controls there that
 * hold a value.
 *
 * Filed beside the kind labels the filter offers, as a setting's guidance is. None of the five
 * reaches the prompt or the roster: they decide which rows the dialog shows, and the cards say so,
 * because a reader who has just watched rows vanish needs to know their ticks did not go with them.
 * The kind and school cards are built from the records they describe, so a kind or a school added
 * later is in its card the moment it is in the filter.
 */
export const ICON_PICKER_TOOLTIPS = {
  search: `Narrows the catalogue and your own icons to those whose role, slot name, group or look under your ${fieldLabelFor('ICON', 'setting')} has a word starting with each word you type, so “ping” finds the pings and not the sweeping attacks. ${FILTER_HIDES_ROWS_ONLY}`,

  kind: [
    'Shows the shelves of one kind, or every kind.',
    ICON_KINDS.map((kind) => `- _${ICON_KIND_LABELS[kind]}_ are ${KIND_HOLDINGS[kind]}.`).join('\n'),
    'Choosing one hides the other shelves and leaves your ticks alone.',
  ].join('\n\n'),

  school: [
    `Shows the spells and abilities of one damage school, or of every school. It is offered while the kind is _${ICON_KIND_LABELS.SPELL}_, the one kind whose icons belong to a school.`,
    `Each school leads its icons with one colour: ${SCHOOL_COLOURS}. Each option is named as your ${fieldLabelFor('ICON', 'setting')} names the school.`,
    TINT_MASK_GREYS_THE_SCHOOL,
    FILTER_HIDES_ROWS_ONLY,
  ].join('\n\n'),

  tickedOnly:
    'Lists only the icons already on your set, so you can review the set in one place and untick what it no longer needs. An icon you untick here leaves the list at once. The filter itself changes nothing in the set or the prompt.',

  libraryProject:
    'Which project’s library of your own icons the shelves show, and where an icon you add or change is saved. Each project keeps its own, so one game’s icons are offered in its later sets and never in another game’s.\n\n' +
    'Choosing another project changes nothing on your set or in the prompt: icons already ticked stay, and any not in that project’s library say so under their names.',
} as const;
