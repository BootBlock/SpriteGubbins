import type { HardwareProfileId } from './hardware.ts';
import type { PaletteId } from './palette.ts';
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
export type { HardwareProfile, HardwareProfileId, HardwareSettings } from './hardware.ts';
export { HARDWARE_PROFILE_IDS } from './hardware.ts';
export type { Palette, PaletteId, PaletteSpace } from './palette.ts';
export { PALETTE_IDS } from './palette.ts';

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
 * `FLUX` is separate from `STABLE_DIFFUSION` because one wrapper cannot serve both: Black Forest
 * Labs state outright that "FLUX.2 does not support negative prompts", so SD's negative block is
 * silently discarded there.
 *
 * **`FLUX` and `FLUX_API` are the same model family split by how much of the prompt reaches it**,
 * which is the only difference this app can act on: Black Forest Labs' hosted tier reads 32K tokens
 * while their own open-weight inference code stops tokenising at 512. One entry would have to state
 * one of those and be wrong for the other half of Flux's users — and the wrong half is the one that
 * gets told a prompt it can read is seven times over budget.
 */
export const TARGET_MODEL_IDS = [
  'GENERIC',
  'CHATGPT_5_6_SOL',
  'GEMINI_FLASH_IMAGE',
  'GEMINI_PRO_IMAGE',
  'SEEDREAM',
  'QWEN_IMAGE',
  'MIDJOURNEY',
  'STABLE_DIFFUSION',
  'FLUX',
  'FLUX_API',
  'GPT_IMAGE',
] as const;
export type TargetModelId = (typeof TARGET_MODEL_IDS)[number];

/**
 * What a target generator can actually do with the prompt.
 *
 * These are properties of the *endpoint*, not preferences: a pure image model has no channel to
 * return text through and no pass in which to re-read what it was told. Sections of the template
 * that ask for either are inert there — they spend tokens on an instruction that cannot be carried
 * out, in a prompt whose length is itself a cost.
 *
 * Declared per model rather than as a set of ids per capability, so that a target is described in
 * one place. Adding a capability here is a **compile error** until every entry in `TARGET_MODELS`
 * answers it. Adding a target *id* is not — nothing in the type says that list is exhaustive — so
 * `targetCapabilities.test.ts` pins that half instead.
 */
/**
 * A documented ceiling on how much prompt a target will actually read.
 *
 * Only recorded where the vendor or the model's own architecture states one. `null` means *nobody
 * published a figure*, which is not the same as "unlimited" — so the interface says nothing rather
 * than inventing a number, and the preview shows nothing rather than a reassuring tick.
 */
export interface PromptBudget {
  readonly limit: number;
  /**
   * Characters are counted exactly; tokens are compared against the app's ~4-characters-per-token
   * estimate, because no tokeniser ships with the app and each target uses a different one.
   */
  readonly unit: 'characters' | 'tokens';
  /** What imposes the ceiling, shown to the user — a limit with no stated cause is not actionable. */
  readonly note: string;
}

export interface TargetCapabilities {
  /**
   * Works *through* the prompt as a procedure — planning, and checking what it produced against
   * what it was asked for — rather than conditioning on it as a single description.
   *
   * False for every diffusion endpoint. They generate in one pass, so "before delivering, verify…"
   * and "redraw that component rather than delivering the sheet" name a step they do not have.
   */
  readonly deliberates: boolean;
  /** Returns text alongside the image, which is what a companion manifest needs. */
  readonly emitsText: boolean;
  /** The documented ceiling on prompt length, or `null` where none is published. */
  readonly promptBudget: PromptBudget | null;
}

/**
 * A component size in art pixels, read out of the free-text `spriteTargetSize` below.
 *
 * The size the *components* were asked for, not the sheet's pixel scale. Two features read it and
 * neither owns it: the quantiser turns it into a candidate pixel grid for a returned sheet, and the
 * atlas calculator checks it against the cell a texture affords. It lives beside the field it is the
 * parsed form of, rather than in either of their vocabularies.
 */
export interface TargetSize {
  readonly width: number;
  readonly height: number;
}

/** One target generator's entry in the selector. */
export interface TargetModel {
  readonly id: TargetModelId;
  readonly name: string;
  /**
   * What choosing this target does to the prompt, shown under the selector as the control's
   * accessible description.
   *
   * **Named for what it is rather than for where it is drawn**, because it spent its whole life
   * called `tooltip` while nothing rendered it: the field was obliged by this interface, filled by
   * every entry, and read by no one. A name that describes a widget is a name that stops being true
   * the moment the copy moves, and there was nothing to notice when it did.
   *
   * Distinct from `OUTPUT_TOOLTIPS.targetModel`, which explains the *field* — what a target model is
   * and why it changes the shape of the output — and is one string for all eleven entries. This is
   * the half that can only be written per target, so it is the half the user could not previously
   * get at.
   */
  readonly description: string;
  readonly capabilities: TargetCapabilities;
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

  /**
   * The machine this sheet is drawn for, or `NONE`.
   *
   * Choosing one in the studio writes the settings package it implies — see `HardwareProfile` — and
   * then stays, because the machine's *name* is what the compiled prompt carries. What it emits is
   * geometry alone: the display, the tile grid, the sprite sizes. Colour is `palette`'s, which is
   * why the two can be set independently without the prompt contradicting itself.
   */
  readonly hardwareProfile: HardwareProfileId;
  /**
   * The colours this sheet may use, or `FREE`.
   *
   * **Supersedes `paletteLimit` wherever both would apply** — the prompt drops the budget line, the
   * quantiser ignores the count, and the studio withdraws the budget control and says why on this
   * one. A budget cannot express "four shades of green", so where a palette is pinned the budget has
   * nothing left to add.
   */
  readonly palette: PaletteId;

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
  /**
   * Which sheet of the pairing's series this prompt is for, from zero.
   *
   * The second axis a batch splits along, and a different one from `primaryDirection`. That says
   * which *facing* of a run list a sheet covers, and every run of it draws the same inventory; this
   * says which *part of the inventory* a sheet carries, and every sheet of a series draws a
   * different one. A CHARACTER's five-view core and its thirty-four limb variants are 49 components
   * together — past what one generation returns — so they are two sheets of one deliverable, and
   * without this the studio could only ever express the first of them.
   *
   * A plain number rather than a nullable one: zero is a real sheet and the natural default, where
   * `primaryDirection` is nullable because "the set's first" has to survive the set changing under
   * it. An index the series does not have resolves to its first sheet in `sheetPlanFor`, which is
   * what a stored `1` does when the category is switched to one whose series has a single sheet.
   */
  readonly sheetIndex: number;
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
  /**
   * Ask the target to audit the sheet it delivered against this prompt, and — where the sheet misses
   * — to write back about the *prompt* rather than the picture.
   *
   * The second half is what distinguishes it from the self-audit the template already carries for a
   * reasoning target. That audit exists to fix the sheet before delivery; this asks what the
   * specification failed to say clearly enough to make the miss impossible, addressed to whoever
   * maintains the template. Needs both capabilities — a pass in which to re-read, and a channel to
   * answer through — so it is gated on `supportsPromptFeedback` rather than on either alone.
   */
  readonly emitPromptFeedback: boolean;
}
