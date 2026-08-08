import { DIRECTION_SETS } from '../types/rendering.ts';
import type { DirectionSet } from '../types/rendering.ts';
import type { SubjectCategory } from '../types/subject.ts';

/**
 * Which direction sets mean anything for each category's subject.
 *
 * **The second axis `CATEGORY_SHEET_PLANS` left open.** That table relates a category to the kinds of
 * sheet it can produce, and `resolveMode` is what stops an absent pairing reaching the compiler — but
 * nothing related a category to the *facings* its subject can be turned to, so the direction set
 * survived a category switch untouched. Switching the studio to INTERFACE from a default session
 * re-resolved the mode and left `directions` on `THREE_CLASSIC`: the panel offered "Split into 3
 * sheets", and the first of those compiled `Directions required: Front-three-quarter` and
 * `object yaw 45°` — for a button.
 *
 * **The failure is degenerate rather than self-contradicting**, which is why it survived so long.
 * `DIRECTION_COVERAGE` is `'primary'` for every mode these categories support, so the chosen set is
 * read as a *run list* and each sheet narrows to one facing; §3's rotation machinery never fires and
 * nothing in the prompt disagrees with anything else in it. What the set decides here is only how
 * many sheets the batch is and which yaw its one facing takes — so the outcome is N identical kits
 * requested at angles the subject does not have, rather than a broken sheet.
 *
 * **Which categories this binds is the whole decision, and it is two.**
 *
 * - **INTERFACE and TERRAIN turn to nothing at all.** A widget is a flat rectangle read straight on;
 *   a tile is laid flat and read from above, and `LANDMARK_TEXT.TERRAIN` says a tile has no front in
 *   as many words, because that `Record` is exhaustive and it was the honest answer. Turning either
 *   yields the drawing the sheet already holds, at an angle the subject does not have — so the set
 *   collapses to `SINGLE_FRONT` for both, which is the only one naming a facing they do have.
 * - **EFFECT keeps every set, and pinning it would delete a deliverable.** A radial burst has no
 *   facing, but a directional slash genuinely *is* eight runs of one frame sequence —
 *   `sheetPlans/effect.ts` argues exactly that, and it is why the category's single mode is the one
 *   whose `'primary'` coverage turns a set into a run list. "Has no facing" is a property of some
 *   effects, not of the category, and a table cannot tell them apart.
 * - **BUILDING keeps every set** even though it defaults to a tileset, because a facade is a facing:
 *   `BUILDING_DIRECTIONAL_VARIANTS` is a real plan of it. That it never surfaced this failure is a
 *   different fact — it also supports `CORE_DIRECTIONAL_VARIANTS`, so the app's default mode survives
 *   the category switch and a degenerate batch has to be asked for deliberately.
 *
 * **The seven unbound categories take `DIRECTION_SETS` entire** rather than restating it, so a set
 * added to the union reaches every subject that can be turned to it in one edit — and the two that
 * are bound stay bound.
 *
 * **The first entry of each list is load-bearing**: it is what {@link resolveDirectionSet} degrades a
 * stored set the category does not offer to, the same way `DEFAULT_MODE_FOR` answers for a mode. It
 * is not a recommendation and it is not the order the studio's select uses — that comes from
 * `directionSetChoices`, which leads with the set most sheets want. `SINGLE_FRONT` leads the union
 * for exactly this reason: one sheet, drawn front on, claiming no yaw is the safe reading of a
 * configuration whose stored answer this category cannot honour.
 */
export const CATEGORY_DIRECTION_SETS: Readonly<
  Record<SubjectCategory, readonly [DirectionSet, ...DirectionSet[]]>
> = {
  CHARACTER: DIRECTION_SETS,
  CREATURE: DIRECTION_SETS,
  OBJECT: DIRECTION_SETS,
  ITEM: DIRECTION_SETS,
  BUILDING: DIRECTION_SETS,
  VEHICLE: DIRECTION_SETS,
  EFFECT: DIRECTION_SETS,
  INTERFACE: ['SINGLE_FRONT'],
  TERRAIN: ['SINGLE_FRONT'],
};

/** Whether this category's subject can be drawn to the facings this set names. */
export function supportsDirectionSet(category: SubjectCategory, directions: DirectionSet): boolean {
  return CATEGORY_DIRECTION_SETS[category].includes(directions);
}

/**
 * The direction set actually used for this category — the one asked for where it means something,
 * the category's own fallback otherwise.
 *
 * The studio prevents the mismatch (the selector offers only supported sets, and switching category
 * re-resolves the stored one), and this is not defence in depth for its own sake — it is the same
 * argument `resolveMode` makes: a preset written before this table existed, a history row from an
 * older build, or a hand-edited export can all arrive carrying a set that was legal when it was
 * saved. Substituting degrades such a record to a sheet the subject can be drawn as, where the
 * alternative is the degenerate batch this table exists to remove.
 */
export function resolveDirectionSet(category: SubjectCategory, directions: DirectionSet): DirectionSet {
  const offered = CATEGORY_DIRECTION_SETS[category];
  const [fallback] = offered;
  return offered.includes(directions) ? directions : fallback;
}
