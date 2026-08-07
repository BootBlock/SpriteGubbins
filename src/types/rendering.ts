/**
 * How the sheet is drawn and where the camera stands — the half of the output configuration that
 * v1 hardcoded.
 *
 * Every union here is a closed set of identifiers the prompt compiler turns into prose. Renaming a
 * member changes the prompt, which is the point: these are the contract, not UI labels.
 */

/**
 * The rendering technique. v1 was pixel-art-only — its section 8 was titled "CLEAN PIXEL ART", every
 * resolution profile carried a `_PIXEL_ART` suffix, and a painted or cel-shaded sheet could not be
 * asked for. Style is now a parameter and the pixel-specific rules sit behind a conditional.
 *
 * The last two are production tools rather than finished looks: a clay render validates volume
 * before colour is committed, and a silhouette pass answers the question that actually decides
 * whether a sprite works — does the shape read at target size with no internal detail?
 */
export const RENDER_STYLES = [
  'PIXEL_ART',
  'RETRO_PIXEL_ART',
  'PAINTED_2D',
  'CEL_SHADED',
  'VECTOR_FLAT',
  'HAND_DRAWN_INK',
  'RENDERED_3D',
  'LOW_POLY_3D',
  'CLAY_RENDER',
  'SILHOUETTE_ONLY',
] as const;
export type RenderStyle = (typeof RENDER_STYLES)[number];

/**
 * The camera's projection.
 *
 * v1 asked for "one fixed orthographic 3/4 top-down dimetric/isometric camera" — three mutually
 * exclusive projections in one sentence, which a model resolves arbitrarily. That is why
 * consecutive generations disagreed about the angle. One named projection now, chosen explicitly.
 */
export const PROJECTIONS = [
  'THREE_QUARTER_TOPDOWN',
  'PURE_TOPDOWN',
  'TRUE_ISOMETRIC',
  'DIMETRIC_2_1',
  'OBLIQUE_45',
  'ORTHOGRAPHIC_SIDE',
  'ORTHOGRAPHIC_FRONT',
] as const;
export type Projection = (typeof PROJECTIONS)[number];

/**
 * Which facings the sheet covers. v1 hardcoded three even though the directional mode implied they
 * varied, so an eight-direction set — what a top-down cut-out rig needs — could not be requested.
 *
 * The specification also lists a `CUSTOM` free list. It is **not** here: a free list needs a field
 * to hold it, the scope guard admits no control that no preset exercises, and a direction set that
 * resolves to nothing would emit an empty "Directions required" line. That is the same reasoning
 * that deleted `FULL_DIRECTIONAL_POSE_LIBRARY` — a value whose only outcome is a wrong sheet.
 */
export const DIRECTION_SETS = ['SINGLE_FRONT', 'THREE_CLASSIC', 'FOUR_CARDINAL', 'EIGHT_COMPASS'] as const;
export type DirectionSet = (typeof DIRECTION_SETS)[number];

/**
 * One facing, as the prompt names it.
 *
 * A closed union because depth order is keyed by it: which arm is nearer the camera is a property of
 * the facing, so `DEPTH_ORDER_TEXT` must have an answer for every direction a set can resolve to, and
 * a `Record` over this union is what makes the compiler insist on that.
 *
 * A bare union rather than the `as const` array its sibling unions use — nothing enumerates the
 * facings at runtime. They are reached through `DIRECTION_LISTS`, and no `OutputConfig` field holds
 * one, so no parser validates against the set either.
 */
export type Direction =
  | 'front'
  | 'front-three-quarter'
  | 'right side'
  | 'back-three-quarter'
  | 'south'
  | 'south-west'
  | 'west'
  | 'north-west'
  | 'north'
  | 'north-east'
  | 'east'
  | 'south-east';

/**
 * The background the components sit on.
 *
 * Magenta is the default rather than white: white bleeds into light-coloured edges and leaves alpha
 * keying ambiguous — white armour on a white field has no recoverable boundary — while `#FF00FF`
 * collides with almost nothing, which is why it is the sprite-sheet convention.
 */
export const BACKGROUND_KEYS = ['MAGENTA_FF00FF', 'PURE_WHITE', 'PURE_BLACK', 'TRANSPARENT'] as const;
export type BackgroundKey = (typeof BACKGROUND_KEYS)[number];
