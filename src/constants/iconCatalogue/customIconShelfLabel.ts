import type { IconKind } from '../../types/iconCatalogue.ts';
import { ICON_KIND_LABELS } from './iconKindLabels.ts';

/**
 * The heading of the shelf the reader's own entries of one kind sit on — `Items and consumables: your
 * own` — after the catalogue's last shelf of that kind, as the roster orders them.
 *
 * Built from the kind's label so the two cannot disagree, and distinct from every catalogue group's
 * label, so a screen reader moving by heading hears which shelf is the reader's.
 */
export function customIconShelfLabel(kind: IconKind): string {
  return `${ICON_KIND_LABELS[kind]}: your own`;
}
