import type { IconCatalogueFilter } from '../types/iconCatalogue.ts';
import { damageSchoolChoices } from './damageSchoolChoices.ts';

/** One option of the catalogue dialog's school filter. */
interface IconSchoolFilterChoice {
  readonly value: IconCatalogueFilter['school'];
  readonly label: string;
}

/**
 * The catalogue dialog's school filter: every school, or one, each named as the subject's world names
 * it (`damageSchoolChoices`).
 */
export function iconSchoolFilterChoices(world: string): readonly IconSchoolFilterChoice[] {
  return [{ value: 'ALL', label: 'Every school' }, ...damageSchoolChoices(world)];
}
