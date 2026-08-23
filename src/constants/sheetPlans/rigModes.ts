import type { DirectionalMode } from '../../types/output.ts';
import type { RigMode } from '../../types/rigging.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { resolveMode } from './modes.ts';

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
 * rig pieces with no rig requirements or promise a rig no sheet can draw. {@link fixedRigMode} now
 * rests on that agreement as well: the rig it hands back is not filtered through this table, so a
 * category with the sheet but not the rig would be given one it does not support.
 *
 * The other eight each argue their own case in their plan file, and this table is where those
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
 * - **PORTRAIT** — `portrait.ts`: a face's features are replaced rather than swung, so there is no
 *   joint to cap.
 * - **ICON** — `icon.ts`: a mark in a cell, with its state pieces laid over it rather than hinged.
 * - **FONT** — `font.ts`: a glyph is a mark on a baseline, and its overlay is drawn into the same
 *   component rather than hinged to it.
 * - **BACKGROUND** — `background.ts`: a band scrolls rather than flexes, and its loose pieces are
 *   placed over it rather than jointed to it.
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
  // A portrait's features are replaced, never swung: a mouth has no pivot and no cap, so section 5's
  // shared-pivot requirements would be describing a joint the sheet does not draw.
  PORTRAIT: ['NONE'],
  // An icon is a mark in a cell. Nothing on it articulates, and the state pieces its plan lists are
  // laid over it rather than hinged to it.
  ICON: ['NONE'],
  // A band scrolls; it does not flex. The loose pieces are placed over a band rather than jointed to
  // one, which is the same answer TERRAIN gives about the features standing on its ground.
  BACKGROUND: ['NONE'],
  // A glyph is a mark on a baseline. Nothing on it articulates, and an engine renders a character by
  // blitting one sprite rather than by rotating pieces of it.
  FONT: ['NONE'],
};

/** Whether this category's components can be asked for in this state of articulation at all. */
export function supportsRigMode(category: SubjectCategory, rigMode: RigMode): boolean {
  return CATEGORY_RIG_MODES[category].includes(rigMode);
}

/**
 * The rig a sheet has already decided, because its inventory *is* that rig.
 *
 * **The other half of the relation `CATEGORY_RIG_MODES` opened**, and the converse of the defect
 * that table fixed. That one stopped section 5's pivot rules reaching a sheet with no joints;
 * nothing stopped a sheet that is *entirely* joints reaching a prompt with no pivot rules.
 * `CUTOUT_RIG_SINGLE_DIRECTION` draws one direction's worth of rig pieces and promises, in its
 * plan's own assembly string, "any pose the rig produces by rotating the pieces about their
 * pivots" — while the rig mode beside it stayed a free choice against a default of `POSE_LIBRARY`.
 * So the studio's own defaults compiled a sheet of rig pieces with no pivot registration, no
 * overlap margin, no depth order and no sockets: the geometry that makes those pieces rotatable,
 * which is the whole reason such a sheet is generated. Setting the rig to `NONE` dropped section 5
 * altogether, leaving a rig-pieces inventory above a rig assembly promise with no articulation
 * instruction between them.
 *
 * A sheet mode listed here is not a free choice against the rig: it has already said what the
 * pieces are for, so the rig mode is *reported* rather than asked for, and the joint-cap, overlap
 * and socket settings it gates come with it. Every other mode leaves the choice open — a
 * directional core or a pose library is drawn for either kind of rig, or for none.
 *
 * One entry, because one sheet mode is a rig. It is a table rather than an equality test so that a
 * second such mode is an entry rather than a second condition to find.
 */
const SHEET_MODE_RIG: Readonly<Partial<Record<DirectionalMode, RigMode>>> = {
  CUTOUT_RIG_SINGLE_DIRECTION: 'CUTOUT_RIG',
};

/**
 * The rig this pairing fixes, or `undefined` where the sheet leaves the choice open.
 *
 * The sheet mode is resolved first, so a stored one this category cannot produce fixes nothing —
 * an ITEM carrying `CUTOUT_RIG_SINGLE_DIRECTION` from an older build draws a directional core, and
 * a rig it has no joints for may not arrive with it. That resolution is the reason this lives
 * beside the sheet table rather than deriving the answer from the raw field.
 *
 * Exported because the studio needs the same answer for a different purpose: `RiggingFields` shows
 * the rig select disabled, and says which sheet took the choice over, wherever this returns one.
 */
export function fixedRigMode(category: SubjectCategory, mode: DirectionalMode): RigMode | undefined {
  return SHEET_MODE_RIG[resolveMode(category, mode)];
}

/**
 * The rig actually used for this sheet — the one its contents demand where they demand one, the one
 * asked for where the category can honour it, and `NONE` otherwise.
 *
 * The studio prevents both mismatches, exactly as it does for the sheet mode, and this exists for
 * the same reason `resolveMode` does: a preset written before these tables existed, a history row
 * from an older build, or a hand-edited export can each arrive carrying a pairing that was legal
 * when it was saved. Every reader of `rigMode` goes through here — the compiler, the collapsed
 * studio digest, the split drawer's depth-order note and the control itself — so a stale value
 * degrades to one answer rather than to four.
 *
 * The two clauses are ordered, and the order is the fix: the sheet's own demand outranks the stored
 * field, because a sheet of rig pieces is not a configuration that can be overridden into something
 * else. Where no sheet demands one, the stored value stands or falls on the category alone.
 */
export function resolveRigMode(category: SubjectCategory, mode: DirectionalMode, rigMode: RigMode): RigMode {
  return fixedRigMode(category, mode) ?? (supportsRigMode(category, rigMode) ? rigMode : 'NONE');
}
