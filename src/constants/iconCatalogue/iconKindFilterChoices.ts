import { ICON_KINDS } from '../../types/iconCatalogue.ts';
import type { IconCatalogueFilter } from '../../types/iconCatalogue.ts';
import { ICON_KIND_LABELS } from './iconKindLabels.ts';

/** One option of the catalogue dialog's kind filter. */
interface IconKindFilterChoice {
  readonly value: IconCatalogueFilter['kind'];
  readonly label: string;
}

/**
 * The catalogue dialog's kind filter: every shelf, or the shelves of one kind, in the order the
 * catalogue shelves them.
 */
export const ICON_KIND_FILTER_CHOICES: readonly IconKindFilterChoice[] = [
  { value: 'ALL', label: 'Every kind' },
  ...ICON_KINDS.map((kind) => ({ value: kind, label: ICON_KIND_LABELS[kind] })),
];
