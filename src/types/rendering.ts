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
 * What a render style that is a **validation pass** withholds, for the two that are.
 *
 * A finished style says how a surface is drawn, and the settings printed beside it — surface detail,
 * the colour budget, the outline — say the rest. A validation pass says a surface is *not* being
 * drawn, so those settings do not sit beside it; they contradict it. `CLAY_RENDER` states one
 * untextured material and `SILHOUETTE_ONLY` states one flat fill, and each of those is already the
 * whole answer about the surface.
 *
 * The two halves are held together here because they are read in four places — the compiler's
 * conditionals, the prose section 2 carries, the studio controls that withdraw, and the digest that
 * reports what is left — and a pass whose prose and whose gate disagreed would print a paragraph
 * about a line still on the page, or drop a line nothing replaced.
 */
export interface ValidationPass {
  /**
   * Whether the pass withholds the light as well as the surface.
   *
   * The narrower of the two axes, and the reason this is a record of objects rather than a list of
   * style names: a clay render is *lit*, and the light is exactly what makes its volumes readable,
   * while a flat fill of one colour has nowhere for a key light to land.
   */
  readonly withholdsLight: boolean;
  /** What section 2 states in place of the lines the pass supersedes. */
  readonly text: string;
}

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
 * These five are the whole set. A `CUSTOM` free list was specified and then **deleted from the
 * specification** rather than built: it needs a field to hold it, no shipped preset exercises it,
 * and a set resolving to nothing would emit an empty "Directions required" line. It would also
 * break {@link Direction} open, and with it the exhaustiveness that makes `DEPTH_ORDER_TEXT` able to
 * answer for every facing a set can produce — a free list yields arbitrary strings with no depth
 * order at all. Same reasoning that deleted `FULL_DIRECTIONAL_POSE_LIBRARY`: a value whose only
 * outcome is a wrong sheet.
 *
 * **`FIVE_CLASSIC` is `THREE_CLASSIC` completed, and it exists because three views cannot reach the
 * two facings a player looks at most.** 0° and 180° are their own mirror, so a front or rear view
 * buys nothing from an engine's horizontal flip while each of 45/90/135 buys a distinct second
 * facing — which makes 45/90/135 the most efficient *three*-view set at six facings, and by the same
 * arithmetic structurally incapable of producing a subject looking at the camera. Adding 0° and 180°
 * takes the classic vocabulary to all eight. Both sets stay: the three-view one is still the
 * cheapest run list a cut-out rig can be worked through, and the five-view one is what a sheet that
 * draws its own facings covers.
 */
export const DIRECTION_SETS = [
  'SINGLE_FRONT',
  'THREE_CLASSIC',
  'FIVE_CLASSIC',
  'FOUR_CARDINAL',
  'EIGHT_COMPASS',
] as const;
export type DirectionSet = (typeof DIRECTION_SETS)[number];

/**
 * One facing, as the prompt names it.
 *
 * A closed union because depth order is keyed by it: which side is nearer the camera is a property of
 * the facing, so `DEPTH_ORDER_TEXT` must have an answer for every direction a set can resolve to, and
 * a `Record` over this union is what makes the compiler insist on that.
 *
 * A bare union rather than the `as const` array its sibling unions use, because the facings are
 * never enumerated as a flat set: they are reached through `DIRECTION_LISTS`, and the only field
 * holding one — `OutputConfig.primaryDirection` — is validated against *its own direction set*
 * rather than against every facing that exists. A stored `north` is not merely a `Direction`
 * question; it is wrong on a `THREE_CLASSIC` sheet, which never turns that way.
 *
 * The classic and compass vocabularies name the same four yaws twice over — `front` and `south` are
 * both 0°, `back` and `north` both 180° — and that redundancy is deliberate. A set is chosen for the
 * game's own read: `back` is the word for a platformer's or a side-on sheet's rear elevation, where
 * `north` would describe a compass a flat projection does not have.
 */
export type Direction =
  | 'front'
  | 'front-three-quarter'
  | 'right side'
  | 'back-three-quarter'
  | 'back'
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
