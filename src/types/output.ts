/**
 * The technical half of a prompt: how the sheet should be rendered, as opposed to what is on it
 * (that is `SubjectDefinition` in ./subject.ts).
 *
 * Every one of these unions is a closed set of identifiers that appear *verbatim in the compiled
 * prompt* — the generator is being handed a contract, and `CORE_DIRECTIONAL_VARIANTS` is the
 * term of that contract, not a UI label. Renaming a member changes the prompt.
 */

/**
 * How many directions the component library covers. This is the single biggest lever on the
 * prompt: it sets the required component count (37 / 43 / 111) that the compiler states as a
 * done-condition and the atlas calculator lays out.
 */
export const DIRECTIONAL_MODES = [
  'SINGLE_DIRECTION_POSE_LIBRARY',
  'CORE_DIRECTIONAL_VARIANTS',
  'FULL_DIRECTIONAL_POSE_LIBRARY',
] as const;
export type DirectionalMode = (typeof DIRECTIONAL_MODES)[number];

/** How much internal seam and fold complexity to draw, within the palette limit. */
export const SURFACE_DETAILS = ['MINIMAL', 'CLEAN_PRODUCTION', 'DETAILED_PRODUCTION', 'TEXTURED'] as const;
export type SurfaceDetail = (typeof SURFACE_DETAILS)[number];

/** Target pixel density and sprite scale. */
export const RESOLUTION_PROFILES = [
  'HIGH_RESOLUTION_PIXEL_ART',
  'MID_RESOLUTION_PIXEL_ART',
  '16_BIT_RETRO_PIXEL_ART',
  'CUSTOM_PIXEL_ART',
] as const;
export type ResolutionProfile = (typeof RESOLUTION_PROFILES)[number];

/** Total global colour budget across the sheet. */
export const PALETTE_LIMITS = ['STRICT_32_COLOR', 'RESTRAINED_64_COLOR', 'EXPANDED_ALBEDO'] as const;
export type PaletteLimit = (typeof PALETTE_LIMITS)[number];

/** How component boundaries are drawn. */
export const OUTLINE_STYLES = ['DARK_LOCAL_CONTOUR', 'PURE_BLACK_OUTLINE', 'OUTLINE_LESS_ALBEDO'] as const;
export type OutlineStyle = (typeof OUTLINE_STYLES)[number];

/** Key light angle and shadow treatment. */
export const LIGHTING_MODELS = ['FLAT_NEUTRAL_ALBEDO', 'ISOMETRIC_TOP_LEFT', 'UNLIT_EMISSIVE_BAKED'] as const;
export type LightingModel = (typeof LIGHTING_MODELS)[number];

/** Sheet canvas shape, passed to the generator so it doesn't crop the layout. */
export const ASPECT_RATIOS = ['WIDE_16_9', 'SQUARE_1_1', 'TALL_9_16', 'ULTRAWIDE_21_9'] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

/**
 * Which generator the prompt is being written for. Each one gets a different wrapper — a
 * reasoning contract, CLI flags, a negative-prompt block, or a directive prefix — so this
 * changes the shape of the output, not just its wording.
 */
export const TARGET_MODEL_IDS = [
  'GENERIC',
  'CHATGPT_5_6_SOL',
  'MIDJOURNEY',
  'STABLE_DIFFUSION',
  'GOOGLE_IMAGEN_3',
  'DALLE_3',
] as const;
export type TargetModelId = (typeof TARGET_MODEL_IDS)[number];

/** One target generator's entry in the selector. */
export interface TargetModel {
  readonly id: TargetModelId;
  readonly name: string;
  readonly tooltip: string;
}

/** The complete technical configuration. Every field is always set — see `useOutputStore`. */
export interface OutputConfig {
  readonly directionalMode: DirectionalMode;
  readonly surfaceDetail: SurfaceDetail;
  readonly resolutionProfile: ResolutionProfile;
  readonly paletteLimit: PaletteLimit;
  readonly outlineStyle: OutlineStyle;
  readonly lightingModel: LightingModel;
  readonly aspectRatio: AspectRatio;
  readonly targetModel: TargetModelId;
}
