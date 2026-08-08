import type { RigMode } from '../../types/rigging.ts';
import type { SubjectCategory } from '../../types/subject.ts';

/**
 * Which rig each category can actually be asked for.
 *
 * **The missing statement beside `CATEGORY_SHEET_PLANS`.** That table says which *sheet* a category
 * can produce, and `PERMITTED_KINDS` says which components may appear on one — but nothing said
 * whether a category articulates at all. So `rigMode` was a free choice against a default of
 * `POSE_LIBRARY`, and section 5 of the prompt arrived on sheets with no joints in them: a BUILDING
 * tileset and an INTERFACE state library were both handed "flexion comes from assembling separately
 * oriented rigid segments around shared pivots" on the studio's own defaults, with nothing selected.
 * That is a page about articulation over an inventory of floor tiles and buttons.
 *
 * It is not a compiler bug and it could not be fixed there: the compiler emits exactly what the
 * configuration asks for, and the configuration was expressible because the two axes were unrelated.
 * Relating them is the fix, in the same shape `resolveMode` already gives the sheet mode — the studio
 * offers only what the category supports, `setCategory` re-resolves a stale one, and
 * {@link resolveRigMode} substitutes for a configuration that arrives from storage naming a pairing
 * that no longer exists.
 *
 * **`NONE` belongs to every category**, which is what lets {@link resolveRigMode} fall back to it
 * without a per-category default table: an unrigged sheet is a coherent answer for any subject, where
 * the other two are claims about the subject's construction. It is also the safe direction to degrade
 * in — dropping section 5 asks for less than the configuration said, while substituting
 * `POSE_LIBRARY` would add articulation rules nobody selected.
 *
 * **The four that articulate are the four with a cut-out rig plan**, and that is an entailment rather
 * than a coincidence — `CUTOUT_RIG_SINGLE_DIRECTION` is the sheet whose inventory *is* rig pieces, so
 * a category without one has already said it has no bone rig. `rigModes.test.ts` checks the two
 * tables still agree, because a category gaining one without the other would either offer a sheet of
 * rig pieces with no rig requirements or promise a rig no sheet can draw.
 *
 * The other five each argue their own case in their plan file, and this table is where those
 * arguments become enforceable:
 *
 * - **ITEM** — `item.ts`: an item "has no rig, which is why this category offers no cut-out mode".
 *   Its working end and consumable part are drawn in two *states*, which is a pair of components
 *   rather than one component that pivots.
 * - **BUILDING** — a tileset is a field and a module library butts modules on a shared width. The
 *   entrance module is drawn closed *and* open for exactly that reason: nothing on it swings.
 * - **TERRAIN** — tiles, a cliff face and the features standing on the ground above it. A landform
 *   has no joints to register.
 * - **EFFECT** — `effect.ts`: "A rig is pieces that rotate about pivots against each other. An effect
 *   articulates about nothing." Its components are one phenomenon at successive moments.
 * - **INTERFACE** — `interface.ts`: "a slider handle travels along a track and a bar fill grows, and
 *   neither turns about a pivot".
 */
export const CATEGORY_RIG_MODES: Readonly<Record<SubjectCategory, readonly RigMode[]>> = {
  CHARACTER: ['NONE', 'POSE_LIBRARY', 'CUTOUT_RIG'],
  CREATURE: ['NONE', 'POSE_LIBRARY', 'CUTOUT_RIG'],
  OBJECT: ['NONE', 'POSE_LIBRARY', 'CUTOUT_RIG'],
  ITEM: ['NONE'],
  BUILDING: ['NONE'],
  VEHICLE: ['NONE', 'POSE_LIBRARY', 'CUTOUT_RIG'],
  EFFECT: ['NONE'],
  INTERFACE: ['NONE'],
  TERRAIN: ['NONE'],
};

/** Whether this category's components can be asked for in this state of articulation at all. */
export function supportsRigMode(category: SubjectCategory, rigMode: RigMode): boolean {
  return CATEGORY_RIG_MODES[category].includes(rigMode);
}

/**
 * The rig actually used for this category — the one asked for where it exists, `NONE` otherwise.
 *
 * The studio prevents the mismatch, exactly as it does for the sheet mode, and this exists for the
 * same reason `resolveMode` does: a preset written before this table existed, a history row from an
 * older build, or a hand-edited export can each arrive carrying a pairing that was legal when it was
 * saved. Every reader of `rigMode` goes through here — the compiler, the collapsed studio digest, the
 * split drawer's depth-order note and the control itself — so a stale value degrades to one answer
 * rather than to four.
 */
export function resolveRigMode(category: SubjectCategory, rigMode: RigMode): RigMode {
  return supportsRigMode(category, rigMode) ? rigMode : 'NONE';
}
