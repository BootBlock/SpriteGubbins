/**
 * The most components one generation delivers before it starts merging or dropping them.
 *
 * `FULL_DIRECTIONAL_POSE_LIBRARY` asked for 111 and was deleted outright for this reason: a model
 * returns a plausible subset and cannot be trusted to count its own output, so a mode past the
 * ceiling has no outcome except a silently-wrong sheet. Around forty is the practical figure and
 * even this is ambitious — it bounds the plans *and* what a preset's additional anatomy may add on
 * top of one, which is why it is stated once rather than in each test that checks it. It is also
 * what forces the eight-compass directional cores to arrive as two sheets: see `coreFacingChunks`
 * in `constants/sheetPlans/directionalViews.ts`, which owns that split.
 */
export const PRACTICAL_COMPONENT_CEILING = 43;
