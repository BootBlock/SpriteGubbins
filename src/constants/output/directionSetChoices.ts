import type { DirectionSet } from '../../types/rendering.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { supportsDirectionSet } from '../categoryDirectionSets.ts';
import type { OutputChoice } from './choices.ts';

/**
 * Every direction set, with the wording the selector shows.
 *
 * **Ordered by what most sheets want**, not by the union's own order: `THREE_CLASSIC` leads because
 * it is the studio's opening set and buys the most facings three drawings can, and `SINGLE_FRONT`
 * sits below the two classic sets rather than first. `CATEGORY_DIRECTION_SETS` lists them the other
 * way round for a different job — its leading entry is the fallback a stored set degrades to — so
 * the two orders are deliberately unrelated and neither is derived from the other.
 *
 * Module-private, because the app never renders the whole list: {@link directionSetChoices} is the
 * only way to a select, and a category that cannot turn must not be offered a facing it does not
 * have.
 */
const DIRECTION_SET_CHOICES: readonly OutputChoice<DirectionSet>[] = [
  { value: 'THREE_CLASSIC', label: 'THREE_CLASSIC (front-3/4, right side, back-3/4)' },
  { value: 'FIVE_CLASSIC', label: 'FIVE_CLASSIC (adds front and back to those three)' },
  { value: 'SINGLE_FRONT', label: 'SINGLE_FRONT (front only)' },
  { value: 'FOUR_CARDINAL', label: 'FOUR_CARDINAL (S, W, N, E)' },
  { value: 'EIGHT_COMPASS', label: 'EIGHT_COMPASS (S, SW, W, NW, N, NE, E, SE)' },
];

/**
 * The sets this category's subject can actually be drawn to.
 *
 * The direction-set half of what `directionalModeChoices` does for the sheet mode, and it exists for
 * the same reason: offering a category a facing its subject does not have is what put "Split into 3
 * sheets" one click away from a button and a ground tile, each run asking for a yaw neither of them
 * turns to. For seven of the nine categories this is the whole list.
 */
export function directionSetChoices(category: SubjectCategory): readonly OutputChoice<DirectionSet>[] {
  return DIRECTION_SET_CHOICES.filter((choice) => supportsDirectionSet(category, choice.value));
}
