import { NO_COMPONENT_BUDGET } from '../constants/componentBudget.ts';
import { resolveMode } from '../constants/sheetPlans/index.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SubjectCategory, SubjectDefinition, SubjectFieldKey } from '../types/subject.ts';
import { sheetDirections } from './sheetDirections.ts';
import { splitsIntoRuns } from './sheetRuns.ts';
import { supportsManifest } from './targetCapabilities.ts';

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
 * the manifest only where the target has a text channel to return one through. A digest naming a
 * control that is not there is worse than no digest, which is why these are pure functions with the
 * conditionals pinned by tests rather than strings assembled at the call site.
 *
 * Controls that *do* something rather than *hold* something are deliberately absent:
 * `IdentityPaletteCapture` sits inside the continuity group, but its whole effect lands in the
 * identity lock, which the digest already carries — naming it would imply a second setting that
 * does not exist.
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
  return join([
    resolveMode(category, output.directionalMode),
    output.componentBudget === NO_COMPONENT_BUDGET ? 'uncapped' : `budget ${String(output.componentBudget)}`,
    output.backgroundKey,
    output.aspectRatio,
  ]);
}

/** How the sheet is drawn. */
export function renderStyleDigest(output: OutputConfig): string {
  return join([
    output.renderStyle,
    output.surfaceDetail,
    output.resolutionProfile,
    output.spriteTargetSize,
    output.paletteLimit,
    output.outlineStyle,
    output.lightingModel,
  ]);
}

/** Where the camera stands, and which facings the sheet covers. */
export function projectionDigest(output: OutputConfig): string {
  return join([
    output.projection,
    `${String(output.cameraElevation)}°`,
    output.directions,
    // Only when the control is on screen. Anywhere else the facing is inert — the sheet draws its
    // own set whatever this said — so naming it would promise something the prompt does not carry.
    splitsIntoRuns(output) ? sheetDirections(output).assembly : '',
  ]);
}

/** What the components are for, and the geometry that makes them riggable. */
export function riggingDigest(output: OutputConfig): string {
  if (output.rigMode !== 'CUTOUT_RIG') return output.rigMode;
  return join([output.rigMode, output.jointCapStyle, output.overlapMargin, output.sockets]);
}

/**
 * What carries across several sheets of one subject.
 *
 * The only digest that can be empty of its own accord — an identity lock is free text and starts
 * blank — so the blank case is stated rather than left silent. A header with nothing after it reads
 * as a group that failed to describe itself, not as a group with nothing set.
 *
 * **The manifest comes first, and the lock last.** This is the one digest carrying an unbounded
 * value: an identity lock is a sentence, and `withPaletteSegment` appends a whole palette to it. Put
 * the lock first and the checkbox — a bounded, two-state fact with no other signal anywhere — is the
 * part that runs off the end. The rule generalises: within a digest, the shortest categorical values
 * lead and the free text trails, so what gets clipped is the part with the most left to guess from.
 */
export function continuityDigest(output: OutputConfig): string {
  return join([
    // Matched to the checkbox, which is unchecked and disabled where the target has no text channel
    // to return a manifest through.
    output.emitManifest && supportsManifest(output.targetModel) ? 'JSON manifest' : '',
    output.identityLock.trim() === '' ? 'no identity lock' : output.identityLock,
  ]);
}
