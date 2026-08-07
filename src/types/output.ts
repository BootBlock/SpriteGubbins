import type { BackgroundKey, Direction, DirectionSet, Projection, RenderStyle } from './rendering.ts';
import type { JointCapStyle, OverlapMargin, RigMode } from './rigging.ts';

/**
 * The technical half of a prompt: how the sheet should be rendered, as opposed to what is on it
 * (that is `SubjectDefinition` in ./subject.ts).
 *
 * Every one of these unions is a closed set of identifiers the compiler turns into the prose the
 * generator reads — the model is being handed a contract. Renaming a member changes the prompt.
 *
 * The rendering and rigging vocabularies live in ./rendering.ts and ./rigging.ts to keep this file
 * from becoming the place every setting is declared, and are re-exported here so `OutputConfig`'s
 * whole vocabulary stays discoverable from one import.
 */
export type { BackgroundKey, Direction, DirectionSet, Projection, RenderStyle } from './rendering.ts';
export { BACKGROUND_KEYS, DIRECTION_SETS, PROJECTIONS, RENDER_STYLES } from './rendering.ts';
export type { JointCapStyle, OverlapMargin, RigMode } from './rigging.ts';
export { JOINT_CAP_STYLES, OVERLAP_MARGINS, RIG_MODES } from './rigging.ts';

/**
 * What kind of component set the sheet delivers. The single biggest lever on the prompt: it sets
 * the required component count that the compiler states as a done-condition and the atlas
 * calculator lays out.
 *
 * v1's `FULL_DIRECTIONAL_POSE_LIBRARY` asked for 111 components in one image and is **deleted**, not
 * deprecated. No current model reliably produces 111 correctly isolated, consistently scaled
 * components in one generation — it produces a plausible subset and merges or drops the rest — and
 * "verify the count" cannot save it, because models do not reliably count their own output. A mode
 * whose only outcome is a silently-wrong sheet is worse than no mode. The replacement is N
 * single-direction sheets sharing an identity lock.
 */
export const DIRECTIONAL_MODES = [
  'SINGLE_DIRECTION_POSE_LIBRARY',
  'CORE_DIRECTIONAL_VARIANTS',
  'CUTOUT_RIG_SINGLE_DIRECTION',
  'TILESET_MODULAR',
] as const;
export type DirectionalMode = (typeof DIRECTIONAL_MODES)[number];

/** How much internal seam and fold complexity to draw, within the palette limit. */
export const SURFACE_DETAILS = ['MINIMAL', 'CLEAN_PRODUCTION', 'DETAILED_PRODUCTION', 'TEXTURED'] as const;
export type SurfaceDetail = (typeof SURFACE_DETAILS)[number];

/**
 * Target pixel density and sprite scale.
 *
 * The `_PIXEL_ART` suffixes are gone: resolution and render style are orthogonal, and welding them
 * together is what made v1's template pixel-only.
 */
export const RESOLUTION_PROFILES = ['HIGH_RESOLUTION', 'MID_RESOLUTION', 'RETRO_16_BIT', 'CUSTOM'] as const;
export type ResolutionProfile = (typeof RESOLUTION_PROFILES)[number];

/**
 * Total global colour budget across the sheet. `UNRESTRICTED` exists because a painted or
 * 3D-rendered sheet has no colour budget to enforce.
 */
export const PALETTE_LIMITS = [
  'STRICT_32_COLOR',
  'RESTRAINED_64_COLOR',
  'EXPANDED_ALBEDO',
  'UNRESTRICTED',
] as const;
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
 * Which generator the prompt is being written for. Each one gets a different wrapper — a reasoning
 * contract, CLI flags, a negative-prompt block, or a directive prefix — so this changes the shape of
 * the output, not just its wording.
 *
 * `FLUX` is separate from `STABLE_DIFFUSION` because one wrapper cannot serve both: Flux has no
 * negative prompt in normal use, so SD's negative block is silently discarded there.
 */
export const TARGET_MODEL_IDS = [
  'GENERIC',
  'CHATGPT_5_6_SOL',
  'MIDJOURNEY',
  'STABLE_DIFFUSION',
  'FLUX',
  'GOOGLE_IMAGEN',
  'DALLE_3',
] as const;
export type TargetModelId = (typeof TARGET_MODEL_IDS)[number];

/** One target generator's entry in the selector. */
export interface TargetModel {
  readonly id: TargetModelId;
  readonly name: string;
  readonly tooltip: string;
}

/**
 * The complete technical configuration.
 *
 * **Every field is always set** — see `useOutputStore`, which gives each one a default. Nothing here
 * is optional, because an optional field would push `?? fallback` handling into the compiler, and
 * absence in the *prompt* is expressed by a field being empty rather than by the field not existing.
 */
export interface OutputConfig {
  readonly directionalMode: DirectionalMode;
  readonly surfaceDetail: SurfaceDetail;
  readonly resolutionProfile: ResolutionProfile;
  readonly paletteLimit: PaletteLimit;
  readonly outlineStyle: OutlineStyle;
  readonly lightingModel: LightingModel;
  readonly aspectRatio: AspectRatio;
  readonly targetModel: TargetModelId;
  /**
   * The most components one generation may be asked for, or `NO_COMPONENT_BUDGET` for no cap.
   *
   * Caps the *request*, never the contract: nothing in the compiled prompt reads it. Exceeding it
   * is reported in the studio before the prompt is copied, because a sheet quietly trimmed to fit
   * would state a count its own inventory contradicts.
   */
  readonly componentBudget: number;

  readonly renderStyle: RenderStyle;
  readonly projection: Projection;
  /** Degrees above the horizon. Defaults per projection, and overridable. */
  readonly cameraElevation: number;
  readonly directions: DirectionSet;
  /**
   * Which facing of `directions` this sheet is for, or `null` for the set's first.
   *
   * Only a mode covering one facing at a time reads it — for those, `directions` is a *run list*
   * rather than a description of one sheet, and this says which run. Without it the studio could
   * only ever express run one, so the eight sheets of an eight-direction rig were not individually
   * requestable and a split run could not be restored from history as itself.
   *
   * Nullable rather than always a `Direction` because "the set's first" has to survive the set
   * changing under it: pinning a facing at every write would leave a stale one behind the moment the
   * user switched sets, which is a facing the sheet does not cover.
   */
  readonly primaryDirection: Direction | null;
  readonly backgroundKey: BackgroundKey;
  /** Free text, e.g. `48 × 96 px` — an explicit target the profile names only vaguely. */
  readonly spriteTargetSize: string;

  readonly rigMode: RigMode;
  readonly jointCapStyle: JointCapStyle;
  readonly overlapMargin: OverlapMargin;
  /** Free list, e.g. `head, chest, back, hand_left, hand_right`. Empty means no sockets. */
  readonly sockets: string;

  /** Free text carrying an identity digest into follow-up sheets. Empty means no lock. */
  readonly identityLock: string;
  /** Ask for a companion JSON manifest. Only conversational targets can honour it. */
  readonly emitManifest: boolean;
}
