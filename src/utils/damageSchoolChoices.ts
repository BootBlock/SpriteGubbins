import { DAMAGE_SCHOOL_DEFINITIONS } from '../constants/iconCatalogue/damageSchools.ts';
import { DAMAGE_SCHOOLS } from '../types/iconCatalogue.ts';
import type { DamageSchool } from '../types/iconCatalogue.ts';
import { capitalised } from './capitalised.ts';
import { damageSchoolName } from './damageSchoolName.ts';

/** One damage school as an option of a select. */
interface DamageSchoolChoice {
  readonly value: DamageSchool;
  readonly label: string;
}

/**
 * Every damage school as a select offers it, in `DAMAGE_SCHOOLS` order, named as the subject's world
 * names it — the catalogue dialog's school filter and the school of an icon of the reader's own.
 *
 * **Each option says the world's name first and the catalogue's after it** — `Fire (thermal)` in a
 * fantasy world — because a row's look and the prompt both say “fire school”, while the shelves are
 * headed by the catalogue's name, `Thermal attacks`. Where the two are one word, as in a cyberpunk world
 * or one the family table does not name, the option is that word alone.
 */
export function damageSchoolChoices(world: string): readonly DamageSchoolChoice[] {
  return DAMAGE_SCHOOLS.map((school) => {
    const { label } = DAMAGE_SCHOOL_DEFINITIONS[school];
    const spoken = capitalised(damageSchoolName(school, world));
    return { value: school, label: spoken === label ? label : `${spoken} (${label.toLowerCase()})` };
  });
}
