import type { IconCatalogueFilter } from '../../types/iconCatalogue.ts';
import { ICON_KIND_CHOICES } from './iconKindChoices.ts';

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
  ...ICON_KIND_CHOICES,
];
