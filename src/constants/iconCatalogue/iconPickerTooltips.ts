import { ICON_KINDS } from '../../types/iconCatalogue.ts';
import type { IconKind } from '../../types/iconCatalogue.ts';
import { fieldLabelFor } from '../categories/index.ts';
import { ICON_KIND_LABELS } from './iconKindLabels.ts';

/**
 * What each kind of shelf holds, completing “_Items and consumables_ are …” in the kind filter's card.
 *
 * A record over the union, as the labels are, so a kind added in phase 4 fails to compile here until
 * the card can say what it holds; the card itself names each kind through `ICON_KIND_LABELS`, so a
 * renamed label cannot leave it describing an option the filter no longer offers.
 */
const KIND_HOLDINGS: Readonly<Record<IconKind, string>> = {
  ITEM: 'things a character carries and uses up',
  SYSTEM: 'the panels, markers and status icons a game’s interface draws',
};

/**
 * Guidance for the catalogue dialog's three filters — the controls there that hold a value.
 *
 * Filed beside the kind labels the filter offers, as a setting's guidance is. None of the three
 * reaches the prompt or the roster: they decide which rows the dialog shows, and the cards say so,
 * because a reader who has just watched rows vanish needs to know their ticks did not go with them.
 */
export const ICON_PICKER_TOOLTIPS = {
  search: `Narrows the catalogue to the icons whose role, slot name, group or look under your ${fieldLabelFor('ICON', 'setting')} contains every word you type. It hides rows and nothing more: your ticks, the set and the prompt stay as they are.`,

  kind: `Shows the shelves of one kind, or every kind. ${ICON_KINDS.map((kind) => `_${ICON_KIND_LABELS[kind]}_ are ${KIND_HOLDINGS[kind]}`).join('; ')}. Choosing one hides the other shelves and leaves your ticks alone.`,

  tickedOnly:
    'Lists only the icons already on your set, so you can review the set in one place and untick what it no longer needs. An icon you untick here leaves the list at once. The filter itself changes nothing in the set or the prompt.',
} as const;
