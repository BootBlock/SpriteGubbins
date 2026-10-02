import { ICON_KINDS } from '../../types/iconCatalogue.ts';
import type { IconKind } from '../../types/iconCatalogue.ts';
import { ICON_KIND_LABELS } from './iconKindLabels.ts';

/** One kind as an option of a select. */
interface IconKindChoice {
  readonly value: IconKind;
  readonly label: string;
}

/**
 * Every kind of shelf, in the order the catalogue shelves them — the kind of an icon of the reader's
 * own, and every option of the dialog's kind filter after its first.
 */
export const ICON_KIND_CHOICES: readonly IconKindChoice[] = ICON_KINDS.map((kind) => ({
  value: kind,
  label: ICON_KIND_LABELS[kind],
}));
