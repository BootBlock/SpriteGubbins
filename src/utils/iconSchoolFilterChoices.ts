import { DAMAGE_SCHOOL_DEFINITIONS } from '../constants/iconCatalogue/damageSchools.ts';
import { DAMAGE_SCHOOLS } from '../types/iconCatalogue.ts';
import type { IconCatalogueFilter } from '../types/iconCatalogue.ts';
import { capitalised } from './capitalised.ts';
import { damageSchoolName } from './damageSchoolName.ts';

/** One option of the catalogue dialog's school filter. */
interface IconSchoolFilterChoice {
  readonly value: IconCatalogueFilter['school'];
  readonly label: string;
}

/**
 * The catalogue dialog's school filter: every school, or one, named as the subject's world names it.
 *
 * **Each option says the world's name first and the catalogue's after it** — `Fire (thermal)` in a
 * fantasy world — because the row's look and the prompt both say “fire school”, while the shelves are
 * headed by the catalogue's name, `Thermal attacks`. Where the two are one word, as in a cyberpunk world
 * or one the family table does not name, the option is that word alone.
 */
export function iconSchoolFilterChoices(world: string): readonly IconSchoolFilterChoice[] {
  return [
    { value: 'ALL', label: 'Every school' },
    ...DAMAGE_SCHOOLS.map((school) => {
      const { label } = DAMAGE_SCHOOL_DEFINITIONS[school];
      const spoken = capitalised(damageSchoolName(school, world));
      return {
        value: school,
        label: spoken === label ? label : `${spoken} (${label.toLowerCase()})`,
      };
    }),
  ];
}
