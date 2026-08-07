import type { DirectionalMode } from '../../types/output.ts';
import type { DirectionSet } from '../../types/rendering.ts';

/**
 * How many facings each mode's inventory is written for.
 *
 * Not a free choice: a mode's component count and its inventory are written against a specific
 * number of directions, so the chosen direction set cannot simply flow through to the prompt. A
 * fifteen-piece cut-out sheet that also said "directions required: all eight compass points" would
 * be asking for 120 pieces and 15 in the same breath, which is the self-contradiction v2 exists to
 * remove.
 *
 * `'primary'` narrows to the first facing of whatever set the user chose — that is the run list for
 * a rig, one sheet per direction. `'three-classic'` is fixed, because the 43-component inventory
 * names those three facings entry by entry.
 */
export const DIRECTION_COVERAGE: Readonly<Record<DirectionalMode, 'primary' | DirectionSet>> = {
  SINGLE_DIRECTION_POSE_LIBRARY: 'primary',
  CORE_DIRECTIONAL_VARIANTS: 'THREE_CLASSIC',
  CUTOUT_RIG_SINGLE_DIRECTION: 'primary',
  TILESET_MODULAR: 'primary',
};

/**
 * How many components each mode requires, and the inventory that lists them.
 *
 * **This is the single authority for the count.** It is stated as a done-condition in the prompt,
 * repeated in the prompt's own self-audit, printed on the mode selector, and laid out by the atlas
 * calculator — four readers, one number. The breakdown interpolates it rather than repeating it,
 * because a count that disagrees with its own inventory is precisely the silently-wrong sheet this
 * template was rewritten to prevent.
 */
export const COMPONENT_COUNTS: Readonly<Record<DirectionalMode, number>> = {
  SINGLE_DIRECTION_POSE_LIBRARY: 37,
  CORE_DIRECTIONAL_VARIANTS: 43,
  CUTOUT_RIG_SINGLE_DIRECTION: 15,
  /**
   * Fourteen, not the sixteen `baseline-prompt-new.md` §6 states in prose: the tile list it
   * enumerates there sums to fourteen. The list is taken as authoritative because asking for
   * sixteen against a fourteen-entry inventory is the exact defect the count exists to catch,
   * whereas fourteen is merely two tiles short. Raise both together if two more tiles are named.
   */
  TILESET_MODULAR: 14,
};

/** The component inventory each mode demands, as the Markdown the prompt's section 4 carries. */
export const COMPONENT_BREAKDOWNS: Readonly<Record<DirectionalMode, string>> = {
  CORE_DIRECTIONAL_VARIANTS: `### Component inventory — ${COMPONENT_COUNTS.CORE_DIRECTIONAL_VARIANTS} in total

#### Directional core — 9
- Heads: front-three-quarter, right-side, back-three-quarter.
- Torsos: front-three-quarter, right-side, back-three-quarter.
- Pelvises: front-three-quarter, right-side, back-three-quarter.

#### Left arm — 8
- Upper arms: neutral lowered, forward-diagonal, raised.
- Lower arms: extension-compatible, moderate-flexion-compatible, strong-flexion-compatible.
- Hands: relaxed empty, closed/grip-ready empty.

#### Right arm — 8
- The same eight variants as the left arm, redrawn for the right side.

#### Left leg — 9
- Upper legs: neutral vertical, forward, backward.
- Lower legs: extension-compatible, moderate-flexion-compatible, strong-flexion-compatible.
- Feet: flat planted, forward-step/heel-strike, rear-step/toe-off.

#### Right leg — 9
- The same nine variants as the left leg, redrawn for the right side.`,

  SINGLE_DIRECTION_POSE_LIBRARY: `### Component inventory — ${COMPONENT_COUNTS.SINGLE_DIRECTION_POSE_LIBRARY} in total

- 1 head, 1 torso, 1 pelvis, in the primary direction.
- 8 left-arm articulation variants: upper arm ×3, lower arm ×3, hand ×2.
- 8 right-arm articulation variants, redrawn for the right side.
- 9 left-leg articulation variants: upper leg ×3, lower leg ×3, foot ×3.
- 9 right-leg articulation variants, redrawn for the right side.`,

  CUTOUT_RIG_SINGLE_DIRECTION: `### Component inventory — ${COMPONENT_COUNTS.CUTOUT_RIG_SINGLE_DIRECTION} in total

One direction's worth of rig pieces, each drawn once in rest orientation:

- Head ×1, torso ×1, pelvis ×1.
- Left arm: upper arm, lower arm, hand.
- Right arm: upper arm, lower arm, hand.
- Left leg: upper leg, lower leg, foot.
- Right leg: upper leg, lower leg, foot.

An eight-direction rig is eight of these sheets, not one sheet of 120 pieces. Run this once per
direction with the same identity lock.`,

  TILESET_MODULAR: `### Component inventory — ${COMPONENT_COUNTS.TILESET_MODULAR} in total

A floor tile, a wall *top* and a wall *face* are three distinct tiles; it is the face that produces
the angled read.

- Floor ×4: one base tile and three low-frequency variants.
- Wall top ×1, wall face ×1.
- Wall top corners ×4: outer-left, outer-right, inner-left, inner-right.
- Wall face corners ×2: left, right.
- Floor edge trim ×2.

Every tile is seamless: opposite edges match so tiles butt without a visible join, and no tile
carries a feature that reveals repetition when laid in a field.`,
};
