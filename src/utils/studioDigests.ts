import { NO_COMPONENT_BUDGET } from '../constants/componentBudget.ts';
import { paletteFor } from '../constants/palettes/index.ts';
import { resolveCameraElevation, validationPassFor } from '../constants/promptText/index.ts';
import type { ValidationPass } from '../types/rendering.ts';
import { resolveMode, resolveRigMode, sheetPlanFor, sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SubjectCategory, SubjectDefinition, SubjectFieldKey } from '../types/subject.ts';
import { resolveDirectionSet } from '../constants/categoryDirectionSets.ts';
import { resolveProjection } from '../constants/categoryProjections.ts';
import { facingApplies, primaryFacing } from './sheetDirections.ts';
import { returnsText, supportsPromptFeedback } from './targetCapabilities.ts';

/**
 * What a collapsed studio section says it is set to.
 *
 * Folding a group hides its **controls**; it must not hide its **configuration**. Every field in
 * both studio panels reaches the compiled prompt whether its group is open or shut, so a collapsed
 * group showing nothing would be concealing something the user is about to paste into a generator —
 * which is the one thing Nielsen Norman's accordion guidance says never to do. These are what the
 * header shows instead, and they make the folded state *more* scannable than the open one: five
 * lines against twenty controls.
 *
 * **Each digest lists exactly the *settings* its group renders, conditionals included** — the rig
 * geometry only exists for a `CUTOUT_RIG`, the primary facing only when the mode splits into runs,
 * the component map only where the target has a text channel to return one through. A digest naming a
 * control that is not there is worse than no digest, which is why these are pure functions with the
 * conditionals pinned by tests rather than strings assembled at the call site.
 *
 * **The direction set is always named, because it now always matters.** The chosen set steers the
 * directional core's views and every run list alike, so the digest echoes the choice — narrowed
 * through the category, exactly as the select is, so an INTERFACE reports the `SINGLE_FRONT` it
 * draws rather than a stored set it cannot. The primary facing beneath it stays conditional for a
 * different reason — a sheet covering several facings has no single one to name at all.
 *
 * Controls that *do* something rather than *hold* something are deliberately absent:
 * `IdentitySubjectDigest` and `IdentityPaletteCapture` both sit inside the continuity group, but the
 * whole effect of each lands in the identity lock, which the digest already carries — naming either
 * would imply a setting that does not exist.
 *
 * "Digest" is used here in the ordinary sense of a short summary. `identityDigest.ts` uses the word
 * in the baseline prompt's sense — the identity-lock text itself — which is why `continuityDigest`
 * returns a digest that contains one. The two are not the same thing and neither name is free to
 * move: `summary` would collide with the `<summary>` these strings are rendered into.
 *
 * They are deliberately the **stored identifiers**, not the choice labels. `PIXEL_ART` is what the
 * select shows first and what the user recognises; `PIXEL_ART (modern high-resolution pixel art)`
 * repeated seven times is a paragraph, not a digest.
 */
const SEPARATOR = ' · ';

/**
 * How much of one value a digest will show.
 *
 * Every value here can be free text — the subject fields are unfiltered combo boxes, the identity
 * lock is a sentence that `withPaletteSegment` appends a whole palette to, and the socket list is
 * whatever the user typed. Unbounded, one of them crowds out every other value in its group, which
 * is the one thing a digest must not do.
 *
 * 48 characters, because the longest option in any shipped pool is 41 (`Dark Stained Wood &
 * Vermilion Red #EA580C`). So nothing the app itself offers is ever cut, and what is cut is always
 * text a user typed — where the opening words are the identifying part anyway.
 */
const PART_LIMIT = 48;

/** One value, bounded. The ellipsis is a character so the cut is visible rather than silent. */
function clip(part: string): string {
  const trimmed = part.trim();
  return trimmed.length <= PART_LIMIT ? trimmed : `${trimmed.slice(0, PART_LIMIT - 1)}…`;
}

/**
 * The parts that have something to say, bounded and joined.
 *
 * Empty parts are dropped rather than rendered as a gap: `spriteTargetSize`, `sockets` and
 * `identityLock` are all meaningfully empty — the compiler omits their line entirely — so a digest
 * reading `HIGH_RESOLUTION ·  · RESTRAINED_64_COLOR` would be claiming a blank value where there is
 * simply no value.
 */
function join(parts: readonly string[]): string {
  return parts
    .filter((part) => part.trim() !== '')
    .map(clip)
    .join(SEPARATOR);
}

/** The values of one subject group's fields, in the order the group lists them. */
export function subjectGroupDigest(subject: SubjectDefinition, keys: readonly SubjectFieldKey[]): string {
  return join(keys.map((key) => subject[key]));
}

/**
 * What is on the sheet.
 *
 * The mode is resolved through the category, exactly as the control is: a stored configuration can
 * name a mode its category has no plan for, and a digest reading the raw value would disagree with
 * the select sitting under it.
 *
 * `NO_COMPONENT_BUDGET` is `0` meaning *uncapped*, so it is spelled out rather than printed — a
 * digest reading `budget 0` states the opposite of what the panel is set to. The word is
 * **uncapped**, not "no budget": the field's own tooltip calls it "no cap", and "no budget" reads in
 * plain English as *no allowance* — which is the very misreading this branch exists to prevent,
 * restated in words.
 */
export function sheetDigest(category: SubjectCategory, output: OutputConfig): string {
  const mode = resolveMode(category, output.directionalMode);
  const series = sheetSeriesFor(category, mode, output.directions);

  return join([
    mode,
    // Only where the sheet control is on screen, which is the rule this whole module is written to:
    // a pairing that is one generation has no sheet to name, and naming one would imply a setting
    // that is not there. Where it *is* on screen the digest cannot be silent about it — two sheets of
    // one series differ in nothing else the header carries, so a folded group would report the same
    // four values above two entirely different inventories.
    series.length > 1 ? sheetPlanFor(category, mode, output.directions, output.sheetIndex).name : '',
    output.componentBudget === NO_COMPONENT_BUDGET ? 'uncapped' : `budget ${String(output.componentBudget)}`,
    output.backgroundKey,
    output.aspectRatio,
  ]);
}

/**
 * What decides the sheet's colour: the pinned palette, the budget it supersedes, or neither.
 *
 * A pinned palette **replaces** the budget rather than joining it, because that is what it does to
 * the sheet — the compiled prompt drops the budget line and the quantiser ignores the count. A
 * validation pass withdraws the budget without replacing it, and still leaves a pinned palette
 * standing: one material or one fill takes its colour from the list like anything else does, so the
 * two supersessions stack rather than collide.
 */
function colourDigest(output: OutputConfig, pass: ValidationPass | null): string {
  if (paletteFor(output.palette) !== null) return output.palette;
  return pass === null ? output.paletteLimit : '';
}

/**
 * How the sheet is drawn.
 *
 * Naming a superseded setting would put a value in the header that has no effect on anything — the
 * same reasoning as `companionDigest`, which omits a deliverable its target cannot return. Two
 * things supersede here rather than one: a pinned palette takes the colour budget, and a validation
 * pass takes the surface detail, the budget and the outline outright, plus the lighting where the
 * pass is the silhouette. `RenderStyleFields` withdraws exactly those controls on the same two
 * lookups, so the header reports the controls the panel is showing.
 */
export function renderStyleDigest(output: OutputConfig): string {
  const pass = validationPassFor(output.renderStyle);

  return join([
    output.renderStyle,
    pass === null ? output.surfaceDetail : '',
    output.resolutionProfile,
    output.spriteTargetSize,
    colourDigest(output, pass),
    pass === null ? output.outlineStyle : '',
    pass?.withholdsLight === true ? '' : output.lightingModel,
  ]);
}

/**
 * Where the camera stands, and which facings the sheet covers.
 *
 * Takes the category for the same reason `sheetDigest` above does, and it is the same sentence: the
 * mode is resolved through the category, exactly as the controls are. Both entries below are answers
 * about the sheet's mode rather than the stored one, and a digest reading the raw value would report
 * a set the prompt never mentions on any configuration whose pairing the category cannot produce.
 *
 * The *set* is resolved through it as well, which is the other half of the same sentence: an
 * INTERFACE draws `SINGLE_FRONT` whatever a stored `THREE_CLASSIC` says, so a header reading the raw
 * field would disagree with the select above it and the prompt below it — and would name a facing,
 * because three classic yaws look like a run list until the category is consulted.
 */
export function projectionDigest(category: SubjectCategory, output: OutputConfig): string {
  // The camera is resolved through the category too, and it is the third half of the same sentence:
  // an INTERFACE is drawn under `ORTHOGRAPHIC_FRONT` whatever a stored `THREE_QUARTER_TOPDOWN` says,
  // so a header reading the raw field would name a camera section 3 never mentions.
  const projection = resolveProjection(category, output.projection);
  return join([
    projection,
    // Resolved through that projection rather than the stored one, which is the same sentence again
    // applied to the elevation: all but the angled-overhead projection fix their elevation, so a
    // stored figure outside that range is one the prompt does not carry.
    `${String(resolveCameraElevation(projection, output.cameraElevation))}°`,
    // The set the sheet is drawn to: the chosen one, narrowed through the category — an INTERFACE
    // draws SINGLE_FRONT whatever a stored THREE_CLASSIC says. The chosen set now steers every
    // mode, so this is a choice being echoed rather than a discarded control being repeated.
    resolveDirectionSet(category, output.directions),
    // Only when the control is on screen. Anywhere else the facing is inert — the selected sheet
    // draws its plan's own facings whatever this said — so naming it would promise something the
    // prompt does not carry.
    facingApplies(category, output) ? primaryFacing(category, output) : '',
  ]);
}

/**
 * What the components are for, and the geometry that makes them riggable.
 *
 * The rig is resolved through the category and the sheet exactly as `sheetDigest` resolves the sheet
 * mode, and for the reason `projectionDigest` states above: a digest reading the stored field would
 * be the one place still reporting a value the compiler had discarded. A category that articulates
 * about nothing says `NONE` here whatever the configuration was left holding, and the cut-out rig
 * sheet says `CUTOUT_RIG` — with the joint, overlap and socket settings that come with it — because
 * that is what its own inventory is.
 */
export function riggingDigest(category: SubjectCategory, output: OutputConfig): string {
  const mode = resolveMode(category, output.directionalMode);
  const rigMode = resolveRigMode(category, sheetSeriesFor(category, mode, output.directions), output.rigMode);
  if (rigMode !== 'CUTOUT_RIG') return rigMode;
  return join([rigMode, output.jointCapStyle, output.overlapMargin, output.sockets]);
}

/**
 * What carries across several sheets of one subject.
 *
 * The only digest that can be empty of its own accord — an identity lock is free text and starts
 * blank — so the blank case is stated rather than left silent. A header with nothing after it reads
 * as a group that failed to describe itself, not as a group with nothing set.
 *
 * `IdentitySubjectDigest` and `IdentityPaletteCapture` are the group's other two children and are
 * deliberately unnamed here: both are actions rather than settings, and everything either does lands
 * in the lock this digest already carries.
 */
export function continuityDigest(output: OutputConfig): string {
  return join([output.identityLock.trim() === '' ? 'no identity lock' : output.identityLock]);
}

/**
 * What the target hands back beside the image.
 *
 * Both checkboxes are gated on a capability rather than on the preference alone, exactly as
 * `CompanionOutputFields` renders them: a target with no channel for text cannot return a map,
 * and one that renders in a single pass has no step in which to review what it drew. The stored
 * preference survives switching to such a target, so reading `emitComponentMap` alone would put a
 * deliverable in the digest that the prompt does not ask for.
 *
 * "nothing" rather than silence when neither is on — which is the default, and a header trailing off
 * into nothing reads as a group that failed to describe itself rather than one with nothing set.
 */
export function companionDigest(output: OutputConfig): string {
  const requested = join([
    output.emitComponentMap && returnsText(output.targetModel) ? 'component map' : '',
    output.emitPromptFeedback && supportsPromptFeedback(output.targetModel) ? 'adherence report' : '',
  ]);
  return requested === '' ? 'image only' : requested;
}
