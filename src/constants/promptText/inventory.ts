import type { DirectionalMode } from '../../types/output.ts';
import type { DirectionSet } from '../../types/rendering.ts';

/**
 * The facings `CORE_DIRECTIONAL_VARIANTS` draws, named separately from the table below because the
 * plans are written against it entry by entry.
 *
 * Exported so `sheetPlans/directionalViews.ts` can build those entries *from the list itself* rather
 * than re-spelling it. The two used to be independent prose — a plan reading "front-three-quarter,
 * right side, back-three-quarter" beside a set that decided what section 3 actually asked for — and
 * nothing related them, so a set edited without its six plans would have produced an inventory
 * naming views the sheet was never told to draw.
 */
export const DIRECTIONAL_VARIANTS_SET: DirectionSet = 'FIVE_CLASSIC';

/**
 * How many facings each mode's inventory is written for.
 *
 * Not a free choice: a mode's inventory is written against a specific number of directions, so the
 * chosen direction set cannot simply flow through to the prompt. A fifteen-piece cut-out sheet that
 * also said "directions required: all eight compass points" would be asking for 120 pieces and 15 in
 * the same breath, which is the self-contradiction v2 exists to remove.
 *
 * `'primary'` narrows to the first facing of whatever set the user chose — that is the run list for
 * a rig, one sheet per direction. A named set is fixed, because the directional plans name those
 * facings entry by entry: `CORE_DIRECTIONAL_VARIANTS` draws `FIVE_CLASSIC` whatever the direction
 * control says, and `camera.test.ts` pins that a fixed set reaches all eight facings — a mode that
 * discards the control cannot be steered past whatever its own set covers.
 *
 * This stays keyed on the mode alone, and legitimately so: how many facings a sheet covers is a
 * property of the *kind of sheet*, not of what is drawn on it. The inventory and the component count
 * are the things that were wrongly keyed this way — those now live in `constants/sheetPlans/`, keyed
 * on category **and** mode, because what a sheet contains is very much a property of its subject.
 */
export const DIRECTION_COVERAGE: Readonly<Record<DirectionalMode, 'primary' | DirectionSet>> = {
  SINGLE_DIRECTION_POSE_LIBRARY: 'primary',
  CORE_DIRECTIONAL_VARIANTS: DIRECTIONAL_VARIANTS_SET,
  CUTOUT_RIG_SINGLE_DIRECTION: 'primary',
  TILESET_MODULAR: 'primary',
};

/**
 * The most components one generation delivers before it starts merging or dropping them.
 *
 * `FULL_DIRECTIONAL_POSE_LIBRARY` asked for 111 and was deleted outright for this reason: a model
 * returns a plausible subset and cannot be trusted to count its own output, so a mode past the
 * ceiling has no outcome except a silently-wrong sheet. Around forty is the practical figure and
 * even this is ambitious — it bounds the plans *and* what a preset's additional anatomy may add on
 * top of one, which is why it is stated once rather than in each test that checks it.
 */
export const PRACTICAL_COMPONENT_CEILING = 43;
