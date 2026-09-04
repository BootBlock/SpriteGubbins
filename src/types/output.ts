import type { TargetQuantity } from './components.ts';
import type { HardwareProfileId } from './hardware.ts';
import type { PaletteId } from './palette.ts';
import type { StyleReferenceId } from './styleReference.ts';
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
export type { StyleReference, StyleReferenceId, StyleReferenceSettings } from './styleReference.ts';
export { STYLE_REFERENCE_IDS } from './styleReference.ts';

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
 * `FLUX` is separate from `STABLE_DIFFUSION` because one wrapper cannot serve both: no FLUX.2 model
 * takes a negative prompt, so SD's negative block is silently discarded there. The two Flux entries
 * in `constants/models.ts` establish that separately, and say why — Black Forest Labs state it for
 * the hosted tier, and their own inference code offers no negative channel for the weights.
 *
 * **`FLUX` and `FLUX_API` are the same model family split by how much of the prompt reaches it**,
 * which is the only difference this app can act on: Black Forest Labs advertise 32K text input
 * tokens for FLUX.2 while their own open-weight inference code stops tokenising at 512, so the
 * figure can only be the hosted tier's. One entry would have to state
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
 * What a vendor publishes about how much prompt a target actually reads.
 *
 * **Four states, because one `null` was doing two jobs and hid the contradiction between them.** It
 * was both “this target has no ceiling worth warning about” and “nobody went and found a figure”,
 * and the studio’s notice keys off it — so the one entry whose own description says long briefs lose
 * instructions was also the one entry that could never say so. A budget is a checkable claim about
 * somebody else’s product, exactly as a wrapper line is, so each state now records *what was found*.
 *
 * - `CEILING` — a figure past which the target stops reading. It truncates, or it refuses.
 * - `GUIDANCE` — a figure the vendor publishes as advice. Nothing is cut; what is documented past it
 *   is *degradation*, which is a different warning and earns different words.
 * - `UNPUBLISHED` — the vendor states no figure. Never “unlimited”: nobody said so.
 * - `NO_VENDOR` — there is no vendor to have stated one, which is `GENERIC` and nothing else.
 *
 * **There is deliberately no “unbounded” state.** No target documents itself that way, and a variant
 * with no member is a claim nobody made.
 *
 * `note` is on all four. On the two carrying a figure it is shown to the user, because a limit with
 * no stated cause is not actionable. On the two that carry none it is the record of the search, and
 * it is what stops an absent figure reading as a decision nobody took — `models.test.ts` requires
 * one of every entry.
 */
export type PromptBudget =
  | (PublishedPromptFigure & { readonly kind: 'CEILING' })
  | (PublishedPromptFigure & { readonly kind: 'GUIDANCE' })
  | { readonly kind: 'UNPUBLISHED'; readonly note: string }
  | { readonly kind: 'NO_VENDOR'; readonly note: string };

/** A published figure, whether it is a ceiling or advice — the shape the two share. */
interface PublishedPromptFigure {
  readonly limit: number;
  /**
   * Characters and words are counted exactly; tokens are compared against the app’s
   * ~4-characters-per-token estimate, because no tokeniser ships with the app and each target uses a
   * different one. `utils/promptBudget.ts` decides both halves — how a unit is counted, and whether
   * the answer may be presented as exact — from one table, so a unit added here cannot be measured
   * without saying which it is.
   */
  readonly unit: 'characters' | 'tokens' | 'words';
  /** What imposes the figure, shown to the user — a limit with no stated cause is not actionable. */
  readonly note: string;
}

/**
 * The two states that carry a figure, which are the only ones a prompt can be measured against.
 *
 * Derived rather than declared, so that a fifth state cannot be added without deciding whether it is
 * measurable: adding one that carries a `limit` widens this on its own, and adding one that does not
 * leaves it alone.
 */
export type PromptBudgetFigure = Extract<PromptBudget, { readonly limit: number }>;

export interface TargetCapabilities {
  /**
   * Works *through* the prompt as a procedure — planning, and checking what it produced against
   * what it was asked for — rather than conditioning on it as a single description.
   *
   * False for every diffusion endpoint. They generate in one pass, so "before delivering, verify…"
   * and "redraw that component rather than delivering the sheet" name a step they do not have.
   */
  readonly deliberates: boolean;
  /** Returns text alongside the image, which is what a companion component map needs. */
  readonly emitsText: boolean;
  /** What the vendor publishes about prompt length, including that they publish nothing. */
  readonly promptBudget: PromptBudget;
}

/**
 * A width and a height in pixels, for the two things this app measures that are not a component:
 * the sheet a prompt is composed against, and the image the quantiser was given.
 *
 * Structurally identical to {@link TargetSize} and deliberately a separate name, because the maths
 * that relates the two — how many components of one size a canvas of the other seats — reads as
 * nonsense if both arguments claim to be component sizes.
 */
export interface PixelExtent {
  readonly width: number;
  readonly height: number;
}

/**
 * A component size in art pixels, read out of the free-text `spriteTargetSize` below.
 *
 * The size the *components* were asked for, not the sheet's pixel scale. Four features read it and
 * none owns it: the prompt compiler takes it as the scale the pixel-discipline section is written
 * against, it derives from it the whole-number scale the sheet presents that grid at, the quantiser
 * turns it into a candidate pixel grid for a returned sheet, and the atlas calculator checks it
 * against the cell a texture affords. It lives beside the field it is the parsed form of, rather
 * than in any of their vocabularies.
 *
 * **Reaching it takes `componentTargetSize`, not `parseTargetSize`.** The field states a component
 * size on a sheet of whole deliverable units and the assembled subject on a sheet of parts — so the
 * parse alone answers *what number is written there*, and only the resolver answers *whether that
 * number is a component*. All four features want the second question.
 */
export interface TargetSize {
  readonly width: number;
  readonly height: number;
}

/**
 * The size the studio's field states, **with the quantity it is a size of**.
 *
 * The answer to the question the free-text field never carried: `48 × 96 px assembled` and
 * `48 × 96 px per tile` parse to the same pair and mean different things, and which one a
 * configuration means is a property of the sheet rather than of the words. `componentTargetSize`
 * derives it; nothing stores it, because a stored answer beside a derived one is a second thing that
 * can disagree with the sheet plan.
 *
 * A reader that only wants a genuine component size takes `TargetSize | null` and lets the resolver
 * narrow for it. A reader that has something useful to say about an assembly — the pixel-discipline
 * floor, which must not forbid detail a small piece needs, and the atlas panel, which has to explain
 * why it is not checking a fit — takes this instead.
 */
export interface StatedTargetSize {
  /**
   * The sheet plan's own declaration, carried through rather than re-derived.
   *
   * {@link TargetQuantity} is defined beside `SheetPlan` because the sheet is what answers this; a
   * second union spelled out here would be the same enumeration written twice, free to gain a member
   * in one place and not the other.
   */
  readonly quantity: TargetQuantity;
  readonly size: TargetSize;
}

/**
 * Where a reader can go and generate with this target, if anywhere.
 *
 * Two states rather than an optional URL, for the reason {@link PromptBudget} carries four rather
 * than one `null`: an absent link is several different findings, and they need different words. A
 * missing field reads as “nobody went and looked”, which is exactly what the four targets without a
 * site are not — each of them was checked, and each has a reason a stranger cannot infer from the
 * name.
 *
 * - `PUBLIC` — the vendor runs a page a person can paste a prompt into, and `url` is it. Deliberately
 *   the *generation* surface rather than the marketing page or the API reference, because what the
 *   button is for is the next thing the reader does with the prompt they just copied.
 * - `NONE` — there is no such page, and `note` says why. Open weights you run yourself, a target that
 *   names no model, and an API endpoint the vendor runs no page in front of are all this, and they
 *   are three different reasons.
 *
 * **A `PUBLIC` url belongs to one entry only.** A page the vendor runs is a surface with its own
 * behaviour, so two entries naming it are two accounts of that behaviour and at most one can be
 * right — which is what `GPT_IMAGE` and `CHATGPT_5_6_SOL` were, both pointing at ChatGPT Images
 * while declaring opposite capabilities. `constants/models.test.ts` holds the urls apart.
 *
 * **A URL is a checkable claim about somebody else's product**, exactly as a capability or a prompt
 * budget is, so each carries its source in `constants/models.ts` beside the entry that states it.
 */
export type GeneratorSite =
  { readonly kind: 'PUBLIC'; readonly url: string } | { readonly kind: 'NONE'; readonly note: string };

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
  /**
   * Where to go and generate with this target — the site the selector's link button opens, or the
   * finding that there is none. See {@link GeneratorSite}.
   */
  readonly generatorSite: GeneratorSite;
  readonly capabilities: TargetCapabilities;
}

/**
 * Everything that decides the image itself.
 *
 * **Every field is always set** — see `useOutputStore`, which gives each one a default. Nothing here
 * is optional, because an optional field would push `?? fallback` handling into the compiler, and
 * absence in the *prompt* is expressed by a field being empty rather than by the field not existing.
 *
 * This is the half a *preset* carries, and the reason the split exists at all: see `OutputConfig`.
 */
export interface ImageOutputConfig {
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
   * The published game whose art direction this sheet is drawn to match, or `NONE`.
   *
   * Choosing one in the studio writes the settings package it implies — see `StyleReference` — and
   * then stays, because what the sheet is *for* outlives the act of setting it up. What it emits is
   * the look's own measurements: the grid, the figure size, the facings, the contour, the light.
   * Whether the game is also named is {@link nameStyleReference}'s, which is why the two are separate
   * fields rather than one nullable name.
   */
  readonly styleReference: StyleReferenceId;
  /**
   * Whether the compiled prompt names the game {@link styleReference} refers to.
   *
   * **Off by default, and the sheet does not depend on it.** The reference's measurements are emitted
   * either way; this adds the title in front of them, which helps a target that has seen the game and
   * is refused outright by several that police named commercial properties. So it is the reader's
   * switch, thrown per sheet against the target they are actually pasting into — not a fact about the
   * look.
   *
   * Inert while {@link styleReference} is `NONE`, exactly as the joint geometry is inert outside a
   * cut-out rig. The studio says so on the control rather than hiding it.
   */
  readonly nameStyleReference: boolean;

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
  /**
   * Free text, e.g. `48 × 96 px` — an explicit target the profile names only vaguely.
   *
   * **Which quantity it names is decided by the sheet, not by this field.** Where a sheet's
   * components are the parts one subject is cut into, the size stated is the assembly — which is
   * what the shipped presets write into the value by hand, as a rig's `48 × 96 px assembled`, a
   * directional core's `32 × 48 px per figure` and a part library's `64 × 64 px per icon cell`. The studio labels the box accordingly,
   * section 2 states the size with what it is, and `componentTargetSize` is what every per-component
   * reader goes through. `SheetPlan.targetQuantity` is where each sheet declares its answer; a
   * second *stored* field naming the quantity was considered and rejected, because the sheet plan
   * already answers it and a stored answer beside a derived one is a fifth thing that can
   * disagree.
   */
  readonly spriteTargetSize: string;

  readonly rigMode: RigMode;
  readonly jointCapStyle: JointCapStyle;
  readonly overlapMargin: OverlapMargin;
  /** Free list, e.g. `head, chest, back, hand_left, hand_right`. Empty means no sockets. */
  readonly sockets: string;

  /** Free text carrying an identity digest into follow-up sheets. Empty means no lock. */
  readonly identityLock: string;
}

/**
 * The complete technical configuration: the image, and what is returned alongside it.
 *
 * **The two halves belong to different people, which is why they are two types.** Everything in
 * `ImageOutputConfig` describes the sheet — an archetype can have an opinion about it, and a preset
 * is exactly that opinion written down. The two fields below describe what the user wants *handed
 * back* with the picture, which is a working preference of whoever is generating it: whether they
 * want a component map to import from, and whether they want the target to write back about the
 * prompt. Nothing about a Cyberpunk Katana Specialist implies either answer.
 *
 * So a preset carries an `ImageOutputConfig` and loading one goes through
 * `useOutputStore.applyImageConfig`, which leaves these two exactly as the user set them. Widening
 * `PresetArchetype['output']` back to this type would put them back under a preset's control, which
 * is the bug the split exists to make unrepresentable.
 */
export interface OutputConfig extends ImageOutputConfig {
  /**
   * Ask for a companion component map. Only conversational targets can honour it.
   *
   * **Not the manifest the Quantise tab writes**, and deliberately not called one. That file is a
   * measurement of delivered pixels — see `types/spriteManifest.ts` — while this is the model's own
   * statement of what it drew and how the pieces hang together, written before any pixels exist. It
   * is the only place a bone parent appears anywhere in this app, which is why asking for the
   * quantiser's shape instead would lose something rather than unify anything: nothing that draws a
   * sheet can know that file's rects, its magnification or its duplicate links.
   *
   * The two **join**, which is the next best thing. Both number their entries from one in the
   * reading order section 4 fixes, so a reader holding both files can put this map's `parent` and
   * `pivot` beside the quantiser's measured rects for the same sprite. The index is what carries
   * that, not the name: the quantiser names a sprite from the inventory only where the sheet came
   * back with the count it was asked for, and numbers it otherwise — see `SpriteManifest.named`.
   */
  readonly emitComponentMap: boolean;
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
