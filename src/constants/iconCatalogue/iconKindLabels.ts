import type { IconKind } from '../../types/iconCatalogue.ts';

/**
 * What each kind of shelf is called where a reader sees it: the catalogue dialog's kind filter and the
 * per-kind counts in the roster summary.
 *
 * A record over the union rather than a list, so a kind added to `ICON_KINDS` fails to compile here
 * until it is named.
 */
export const ICON_KIND_LABELS: Readonly<Record<IconKind, string>> = {
  ITEM: 'Items and consumables',
  SPELL: 'Spells and abilities',
  SOCIAL: 'Emotes and chat',
  COMPANION: 'Mounts and pets',
  PROFESSION: 'Professions',
  SYSTEM: 'Interface and system',
};
