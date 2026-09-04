import type { SheetSeries } from '../../types/components.ts';
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
 * Whether any sheet of this deliverable has already committed a moving part to a position.
 *
 * **The question is asked of the series and not of one sheet, and that is the second half of the
 * defect.** A pairing is a *deliverable*: `CHARACTER_ARTICULATION`'s assembly promise is "the limbs
 * of … each fitted to the trunk drawn on the directional core sheets", and the core's own promise
 * calls itself "the trunk the articulation sheets hang their limbs on". They are two halves of one
 * set, generated separately and assembled together.
 *
 * Asked per sheet, the answer split that set in two: a character on `CORE_DIRECTIONAL_VARIANTS`
 * carrying `CUTOUT_RIG` compiled a cut-out rig for the trunk sheets and a pose library for the
 * limbs. Each prompt was internally consistent, and the pair was not —
 * `[DEFINE:JOINT_CAP_DESCRIPTION]` and `[DEFINE:OVERLAP_MARGIN_DESCRIPTION]` appear only inside the
 * cut-out rig block, so the trunk was drawn to a stated cap style and overlap margin while the sheet
 * supplying the limbs those caps have to meet was told neither. That is the reported failure one
 * level up rather than a fix for it.
 *
 * Nothing is put out of reach by asking the wider question. A cut-out rig for a figure is
 * `CUTOUT_RIG_SINGLE_DIRECTION`, which draws the trunk *and* the limbs once each per facing and
 * settles the rig itself; the directional pairing is a pose-library deliverable, which is what its
 * own two assembly strings say.
 */
function artworkSettlesMotion(series: SheetSeries): boolean {
  return series.some((plan) => plan.posing === 'PER_POSITION');
}

/**
 * The rig a deliverable has already decided, because its inventory *is* that rig.
 *
 * **The other half of the relation `CATEGORY_RIG_MODES` opened**, and the converse of the defect
 * that table fixed. That one stopped section 5's pivot rules reaching a sheet with no joints;
 * nothing stopped a sheet that is *entirely* joints reaching a prompt with no pivot rules. The
 * cut-out rig plans draw one direction's worth of rig pieces and promise, in their own assembly
 * string, "any pose the rig produces by rotating the pieces about their pivots" — while the rig mode
 * beside them stayed a free choice against a default of `POSE_LIBRARY`. So the studio's own defaults
 * compiled a sheet of rig pieces with no pivot registration, no overlap margin, no depth order and
 * no sockets: the geometry that makes those pieces rotatable, which is the whole reason such a sheet
 * is generated. Setting the rig to `NONE` dropped section 5 altogether, leaving a rig-pieces
 * inventory above a rig assembly promise with no articulation instruction between them.
 *
 * An `'AT_REST'` deliverable is not a free choice against the rig: it has already said what the
 * pieces are for, so the rig mode is *reported* rather than asked for, and the joint-cap, overlap
 * and socket settings it gates come with it.
 *
 * **It reads the plans rather than the sheet mode**, which is what made room for {@link
 * offersRigMode} beside it. The two are one question asked in both directions — what has this
 * deliverable's artwork already settled about motion — and the sheet mode cannot answer either,
 * because the answer lives in the inventories the mode produces rather than in the mode's name.
 *
 * Exported because the studio needs the same answer for a different purpose: `RiggingFields` shows
 * the rig select disabled, and says which sheet took the choice over, wherever this returns one.
 */
export function fixedRigMode(series: SheetSeries): RigMode | undefined {
  return series.some((plan) => plan.posing === 'AT_REST') ? 'CUTOUT_RIG' : undefined;
}

/**
 * Whether this deliverable can be asked for this rig — the category's answer, less what its own
 * inventories rule out.
 *
 * **A cut-out rig is a claim that the artwork commits to no position**, which is exactly what a
 * `'PER_POSITION'` inventory has already done. With `rigMode: 'CUTOUT_RIG'` on a pose library, an
 * articulation sheet or a part library, section 4 required each part in several orientations or
 * states, section 5's rest-orientation rule then forbade a pre-bent segment and required every
 * articulation left at its neutral angle, and section 9 audited the result for "straight and
 * unposed". One prompt requiring what it forbids, on four categories, reachable from the studio's
 * own controls — and the pairing was expressible because the rig table read the sheet *mode* while
 * the contradiction lived in the sheets' entries.
 *
 * The refusal is narrow on purpose. `POSE_LIBRARY` is what such a deliverable is — its variants are
 * separately oriented rigid segments meeting at shared pivots, which is that section's own
 * wording — and `NONE` stays available for a reader who wants no articulation section at all. What
 * goes is the one pairing that cannot be drawn.
 *
 * A reader who wants a cut-out rig for one of these subjects has the sheet that is one:
 * `CUTOUT_RIG_SINGLE_DIRECTION` draws every moving part once, at rest, and {@link fixedRigMode}
 * settles the rig on it outright. So this takes nothing away that the app does not offer better one
 * control along.
 */
export function offersRigMode(category: SubjectCategory, series: SheetSeries, rigMode: RigMode): boolean {
  if (!supportsRigMode(category, rigMode)) return false;
  return rigMode !== 'CUTOUT_RIG' || !artworkSettlesMotion(series);
}

/**
 * The rig actually used for this deliverable — the one its contents demand where they demand one,
 * the one asked for where the sheets and the category can honour it, and the nearest truthful answer
 * otherwise.
 *
 * The studio prevents all three mismatches, exactly as it does for the sheet mode, and this exists
 * for the same reason `resolveMode` does: a preset written before these tables existed, a history
 * row from an older build, or a hand-edited export can each arrive carrying a pairing that was legal
 * when it was saved. Every reader of `rigMode` goes through here — the compiler, the collapsed
 * studio digest, the split drawer's depth-order note and the control itself — so a stale value
 * degrades to one answer rather than to four.
 *
 * The clauses are ordered, and the order is the fix: the inventory's own demand outranks the stored
 * field, because a sheet of rig pieces is not a configuration that can be overridden into something
 * else. Where nothing demands a rig, the stored value stands or falls on the inventories and the
 * category together.
 *
 * **It answers for the whole pairing rather than for the selected sheet**, which is what keeps the
 * answer out of the sheet index. A rig that changed under the Inventory Part control would let a
 * reader leave `CUTOUT_RIG` in the store against an articulation sheet and save that pair as a
 * preset — the disagreement `presetCoverage.test.ts` refuses for the shipped library, arriving
 * through the one write that sets nothing but an index.
 *
 * **The two refusals degrade differently, because they are two different refusals.** "Your category
 * has no joints" leaves `NONE`, which is the truth about a tileset and the safe direction to fall
 * in — it asks for less than the configuration said, where `POSE_LIBRARY` would add articulation
 * rules nobody selected. "This deliverable's artwork already carries the poses" leaves
 * `POSE_LIBRARY`, which is the truth about *it*: its inventories are rigid segments that register at
 * shared pivots, and falling to `NONE` there would drop the only section saying so, leaving a pose
 * library's assembly promise with no articulation instruction under it — the very defect
 * {@link fixedRigMode} exists to stop on the rig sheet. It is still a fall rather than an upgrade,
 * because everything `POSE_LIBRARY` asks for, `CUTOUT_RIG` asked for too.
 */
export function resolveRigMode(category: SubjectCategory, series: SheetSeries, rigMode: RigMode): RigMode {
  const fixed = fixedRigMode(series);
  if (fixed !== undefined) return fixed;
  if (offersRigMode(category, series, rigMode)) return rigMode;
  // Guarded on the category as well as the inventories, because posed artwork is not by itself a
  // promise that the subject articulates: an ITEM part library and an INTERFACE state library are
  // both drawn per state, and neither may be handed a rig its own table withholds.
  return artworkSettlesMotion(series) && supportsRigMode(category, 'POSE_LIBRARY') ? 'POSE_LIBRARY' : 'NONE';
}
