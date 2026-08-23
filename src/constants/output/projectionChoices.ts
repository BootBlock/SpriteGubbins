import type { Projection } from '../../types/rendering.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { supportsProjection } from '../categoryProjections.ts';
import type { OutputChoice } from './choices.ts';

/**
 * Every projection, with the wording the selector shows.
 *
 * Module-private, and offered only through {@link projectionChoices} — the same arrangement
 * `directionSetChoices` and `rigModeChoices` have, and for the same reason. A `PROJECTION_CHOICES`
 * exported beside the unconditional lists in `choices.ts` would be a second, unscoped way to fill
 * this control, and the one a new call site would reach for.
 */
const PROJECTION_LABELS: readonly OutputChoice<Projection>[] = [
  { value: 'THREE_QUARTER_TOPDOWN', label: 'THREE_QUARTER_TOPDOWN (angled overhead)' },
  { value: 'PURE_TOPDOWN', label: 'PURE_TOPDOWN (directly overhead)' },
  { value: 'TRUE_ISOMETRIC', label: 'TRUE_ISOMETRIC (1.73:1 diamond, all axes equal)' },
  { value: 'DIMETRIC_2_1', label: 'DIMETRIC_2_1 (2:1 diamond — the usual one)' },
  { value: 'OBLIQUE_45', label: 'OBLIQUE_45 (undistorted front, depth at 45°)' },
  { value: 'ORTHOGRAPHIC_SIDE', label: 'ORTHOGRAPHIC_SIDE (side elevation — platformer)' },
  { value: 'ORTHOGRAPHIC_FRONT', label: 'ORTHOGRAPHIC_FRONT (flat front elevation)' },
];

/**
 * The cameras this category's subject can actually be drawn under.
 *
 * The projection half of what `directionSetChoices` does for the facings, and it exists for the same
 * reason: offering a category a camera its subject has no geometry for is what put a 35° overhead
 * elevation one default session away from a sheet of button states. A control offering a value the
 * store will immediately degrade is worse than one that does not offer it.
 *
 * For nine of the thirteen categories this is the whole list. INTERFACE, PORTRAIT, BACKGROUND and FONT are
 * each left with one entry, and the
 * control still renders it: unlike the rig, the projection is a line section 3 always carries, so a
 * select showing the one camera the sheet is drawn under says more than an absence would.
 */
export function projectionChoices(category: SubjectCategory): readonly OutputChoice<Projection>[] {
  return PROJECTION_LABELS.filter((choice) => supportsProjection(category, choice.value));
}
