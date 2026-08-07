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
 * The most components one generation delivers before it starts merging or dropping them.
 *
 * `FULL_DIRECTIONAL_POSE_LIBRARY` asked for 111 and was deleted outright for this reason: a model
 * returns a plausible subset and cannot be trusted to count its own output, so a mode past the
 * ceiling has no outcome except a silently-wrong sheet. Around forty is the practical figure and
 * even this is ambitious — it bounds the modes *and* what a preset's additional anatomy may add on
 * top of one, which is why it is stated once rather than in each test that checks it.
 */
export const PRACTICAL_COMPONENT_CEILING = 43;

/**
 * How many components each mode requires **before** the subject's own additional anatomy, and the
 * inventory that lists them.
 *
 * **This is the single authority for the base count**, and nothing reads it directly to state a
 * total. The number the user sees — the prompt's done-condition, its inventory heading, its
 * self-audit, the mode selector and the atlas grid — is always
 * `componentCountFor` in `utils/componentSet.ts`, which adds whatever anatomy the subject names on
 * top of the figure here. Five readers, one sum: a count that disagrees with its own inventory is
 * precisely the silently-wrong sheet this template was rewritten to prevent.
 */
export const COMPONENT_COUNTS: Readonly<Record<DirectionalMode, number>> = {
  SINGLE_DIRECTION_POSE_LIBRARY: 37,
  CORE_DIRECTIONAL_VARIANTS: 43,
  CUTOUT_RIG_SINGLE_DIRECTION: 15,
  /**
   * Sixteen: the fourteen tiles `baseline-prompt-new.md` §6 enumerated, plus the two wall-face
   * *inner* corners its list was missing. The face turns the same corners the top does, so a set
   * carrying outer-left, outer-right, inner-left and inner-right for the wall top but only left and
   * right for the wall face leaves a concave wall junction with no tile to draw it — and an inner
   * corner is neither a mirror nor a rotation of an outer one, so nothing else in the set stands in.
   */
  TILESET_MODULAR: 16,
};

/**
 * The component inventory each mode demands, as the Markdown the prompt's section 4 carries.
 *
 * The body only — `componentBreakdownFor` in ./componentSet.ts writes the heading that states the
 * total, because that total is not a property of the mode alone once a subject names anatomy of its
 * own. A heading baked in here would have gone on claiming the mode's own number while section 0
 * asked for a larger one, which is the disagreement the count exists to make impossible.
 */
export const COMPONENT_BREAKDOWNS: Readonly<Record<DirectionalMode, string>> = {
  CORE_DIRECTIONAL_VARIANTS: `#### Directional core — 9

Three views each of **one** head, **one** torso and **one** pelvis: the same piece of geometry drawn
at each object yaw section 3 lists, in that order. Three separate designs, three mirrored copies, or
three views facing the same way are all failures of this entry, however well drawn.

- Heads: front-three-quarter, right side, back-three-quarter.
- Torsos: front-three-quarter, right side, back-three-quarter.
- Pelvises: front-three-quarter, right side, back-three-quarter.

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

  SINGLE_DIRECTION_POSE_LIBRARY: `- 1 head, 1 torso, 1 pelvis, in the primary direction.
- 8 left-arm articulation variants: upper arm ×3, lower arm ×3, hand ×2.
- 8 right-arm articulation variants, redrawn for the right side.
- 9 left-leg articulation variants: upper leg ×3, lower leg ×3, foot ×3.
- 9 right-leg articulation variants, redrawn for the right side.`,

  CUTOUT_RIG_SINGLE_DIRECTION: `One direction's worth of rig pieces, each drawn once in rest orientation:

- Head ×1, torso ×1, pelvis ×1.
- Left arm: upper arm, lower arm, hand.
- Right arm: upper arm, lower arm, hand.
- Left leg: upper leg, lower leg, foot.
- Right leg: upper leg, lower leg, foot.

An eight-direction rig is eight of these sheets, not one sheet of 120 pieces. Run this once per
direction with the same identity lock.`,

  TILESET_MODULAR: `A floor tile, a wall *top* and a wall *face* are three distinct tiles; it is the face that produces
the angled read.

- Floor ×4: one base tile and three low-frequency variants.
- Wall top ×1, wall face ×1.
- Wall top corners ×4: outer-left, outer-right, inner-left, inner-right.
- Wall face corners ×4: outer-left, outer-right, inner-left, inner-right.
- Floor edge trim ×2.

Every tile is seamless: opposite edges match so tiles butt without a visible join, and no tile
carries a feature that reveals repetition when laid in a field.`,
};
