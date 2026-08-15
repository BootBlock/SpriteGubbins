import { defaultSubjectFor } from '../constants/categories/index.ts';
import { COMPONENT_BUDGET_RANGE } from '../constants/componentBudget.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DIRECTION_LISTS } from '../constants/promptText/index.ts';
import { SHEET_INDEX_RANGE } from '../constants/sheetPlans/index.ts';
import {
  ASPECT_RATIOS,
  BACKGROUND_KEYS,
  DIRECTION_SETS,
  DIRECTIONAL_MODES,
  HARDWARE_PROFILE_IDS,
  JOINT_CAP_STYLES,
  LIGHTING_MODELS,
  OUTLINE_STYLES,
  OVERLAP_MARGINS,
  PALETTE_IDS,
  PALETTE_LIMITS,
  PROJECTIONS,
  RENDER_STYLES,
  RESOLUTION_PROFILES,
  RIG_MODES,
  STYLE_REFERENCE_IDS,
  SURFACE_DETAILS,
  TARGET_MODEL_IDS,
} from '../types/output.ts';
import type { ImageOutputConfig, OutputConfig, TargetModelId } from '../types/output.ts';
import type { Direction, DirectionSet } from '../types/rendering.ts';
import { SUBJECT_CATEGORIES, SUBJECT_FIELD_KEYS } from '../types/subject.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { isRecord, pick, pickBoolean, pickNumber, pickWholeNumber } from './readers.ts';

/**
 * Turning a stored subject or output configuration back into a domain object.
 *
 * **This validation is not a compatibility layer and must not become one.** The project keeps no
 * backwards compatibility, so a retired identifier is not translated — it simply fails to match its
 * union and the field falls back to its default. What the checks are actually for is corrupt or
 * hand-edited storage, which stays possible however stable the schema is.
 *
 * Every union is checked against the `as const` array that *defines* it rather than a list written
 * out again here. That is what stops the guard rotting: adding a member to a union admits it here in
 * the same edit, and removing one rejects it, with no second list to remember.
 */

export function isSubjectCategory(value: unknown): value is SubjectCategory {
  return typeof value === 'string' && SUBJECT_CATEGORIES.some((category) => category === value);
}

export function isTargetModelId(value: unknown): value is TargetModelId {
  return typeof value === 'string' && TARGET_MODEL_IDS.some((id) => id === value);
}

/**
 * Parse a stored subject, filling any absent field from the category's defaults.
 *
 * Tolerant by design: a preset saved before a field existed is still a useful preset, and defaulting
 * the gap is better than discarding the user's work. What it will not do is invent a *category* —
 * that comes from the row and is validated strictly.
 */
export function parseSubject(value: unknown, category: SubjectCategory): SubjectDefinition {
  const defaults = defaultSubjectFor(category);
  if (!isRecord(value)) return defaults;

  const subject = { ...defaults };
  for (const key of SUBJECT_FIELD_KEYS) {
    const stored = value[key];
    if (typeof stored === 'string') subject[key] = stored;
  }
  return subject;
}

/**
 * Degrees above the horizon. A camera below the ground or past vertical is a corrupt value.
 *
 * The outer bound, and deliberately not the whole answer: what a *projection* can be drawn at is
 * narrower still — usually a single figure — and `resolveCameraElevation` in
 * `constants/promptText/elevation.ts` is what settles that, on read, for the prompt and the studio
 * alike. This one only asks whether the stored number is a number of degrees at all.
 */
const ELEVATION_RANGE = { min: 0, max: 90 } as const;

/**
 * Read the stored primary facing, accepting it only if the stored *direction set* actually contains
 * it.
 *
 * The one field whose validity depends on another field's value, so it cannot go through `pick`
 * against a flat union. `north` is a perfectly good `Direction` and still wrong on a `THREE_CLASSIC`
 * sheet, which never turns that way — accepting it would put a facing in the prompt's assembly
 * direction and depth order that the sheet's own "directions required" line does not list.
 *
 * `null` is both the rejection and the ordinary "unset", and they mean the same thing downstream:
 * the set's first facing.
 */
function pickPrimaryDirection(source: Record<string, unknown>, directions: DirectionSet): Direction | null {
  const stored = source['primaryDirection'];
  return DIRECTION_LISTS[directions].find((facing) => facing === stored) ?? null;
}

/**
 * Parse the stored settings that decide the image, falling back per field rather than wholesale.
 *
 * One bad value costs that field its default instead of discarding the entire configuration — which
 * matters most for a preset, where the user would otherwise lose twenty settings to one bad one.
 *
 * A payload that is not a record at all is read as `{}` rather than short-circuited, because every
 * field below already falls back when its key is absent: the two spellings produce the same result,
 * and one of them cannot drift from the defaults it claims to return.
 */
export function parseImageConfig(value: unknown): ImageOutputConfig {
  const source = isRecord(value) ? value : {};

  // Read before the object literal, because the primary facing is only valid against *this* set.
  //
  // Checked against the whole union and not against what the *subject* can be turned to, which is a
  // narrower question `CATEGORY_DIRECTION_SETS` answers — an interface widget has no facing, so
  // `THREE_CLASSIC` is wrong there while being a perfectly good `DirectionSet`. This is the same
  // division `sheetIndex` draws and for the same reason: the category is not in this payload, so
  // `resolveDirectionSet` does that narrowing at the point of use instead.
  const directions = pick(source, 'directions', DEFAULT_OUTPUT_CONFIG.directions, DIRECTION_SETS);

  return {
    directionalMode: pick(
      source,
      'directionalMode',
      DEFAULT_OUTPUT_CONFIG.directionalMode,
      DIRECTIONAL_MODES,
    ),
    surfaceDetail: pick(source, 'surfaceDetail', DEFAULT_OUTPUT_CONFIG.surfaceDetail, SURFACE_DETAILS),
    resolutionProfile: pick(
      source,
      'resolutionProfile',
      DEFAULT_OUTPUT_CONFIG.resolutionProfile,
      RESOLUTION_PROFILES,
    ),
    paletteLimit: pick(source, 'paletteLimit', DEFAULT_OUTPUT_CONFIG.paletteLimit, PALETTE_LIMITS),
    outlineStyle: pick(source, 'outlineStyle', DEFAULT_OUTPUT_CONFIG.outlineStyle, OUTLINE_STYLES),
    lightingModel: pick(source, 'lightingModel', DEFAULT_OUTPUT_CONFIG.lightingModel, LIGHTING_MODELS),
    aspectRatio: pick(source, 'aspectRatio', DEFAULT_OUTPUT_CONFIG.aspectRatio, ASPECT_RATIOS),
    targetModel: pick(source, 'targetModel', DEFAULT_OUTPUT_CONFIG.targetModel, TARGET_MODEL_IDS),
    // Whole components, because the number is read straight back into prose — a fractional budget
    // would report `48 components against a budget of 42.7`. Rejected rather than rounded: this
    // layer drops what it cannot vouch for, and rounding `0.5` to `0` would turn a corrupt budget
    // into no budget at all.
    componentBudget: pickWholeNumber(
      source,
      'componentBudget',
      DEFAULT_OUTPUT_CONFIG.componentBudget,
      COMPONENT_BUDGET_RANGE,
    ),

    // Both fall back to their own "none", which is the honest reading of a value this layer cannot
    // vouch for: a stored `MEGA_DRIVE` that no longer names a machine must not become some other
    // machine, and no machine at all is the only answer that adds nothing to the prompt.
    hardwareProfile: pick(
      source,
      'hardwareProfile',
      DEFAULT_OUTPUT_CONFIG.hardwareProfile,
      HARDWARE_PROFILE_IDS,
    ),
    palette: pick(source, 'palette', DEFAULT_OUTPUT_CONFIG.palette, PALETTE_IDS),

    // The same fall-back to "none", for the same reason: a stored reference that no longer names a
    // game must not become a different game. The naming switch is a plain boolean, so anything that
    // is not one is not a truncated answer to be salvaged — it is no answer, and the default is off.
    styleReference: pick(source, 'styleReference', DEFAULT_OUTPUT_CONFIG.styleReference, STYLE_REFERENCE_IDS),
    nameStyleReference: pickBoolean(source, 'nameStyleReference', DEFAULT_OUTPUT_CONFIG.nameStyleReference),

    renderStyle: pick(source, 'renderStyle', DEFAULT_OUTPUT_CONFIG.renderStyle, RENDER_STYLES),
    projection: pick(source, 'projection', DEFAULT_OUTPUT_CONFIG.projection, PROJECTIONS),
    cameraElevation: pickNumber(
      source,
      'cameraElevation',
      DEFAULT_OUTPUT_CONFIG.cameraElevation,
      ELEVATION_RANGE,
    ),
    directions,
    primaryDirection: pickPrimaryDirection(source, directions),
    // Bounded but not validated: which sheet indices exist depends on the category, which this
    // function is not given. `sheetPlanFor` resolves an index its own series does not have.
    sheetIndex: pickWholeNumber(source, 'sheetIndex', DEFAULT_OUTPUT_CONFIG.sheetIndex, SHEET_INDEX_RANGE),
    backgroundKey: pick(source, 'backgroundKey', DEFAULT_OUTPUT_CONFIG.backgroundKey, BACKGROUND_KEYS),
    spriteTargetSize: typeof source['spriteTargetSize'] === 'string' ? source['spriteTargetSize'] : '',

    rigMode: pick(source, 'rigMode', DEFAULT_OUTPUT_CONFIG.rigMode, RIG_MODES),
    jointCapStyle: pick(source, 'jointCapStyle', DEFAULT_OUTPUT_CONFIG.jointCapStyle, JOINT_CAP_STYLES),
    overlapMargin: pick(source, 'overlapMargin', DEFAULT_OUTPUT_CONFIG.overlapMargin, OVERLAP_MARGINS),
    sockets: typeof source['sockets'] === 'string' ? source['sockets'] : '',

    identityLock: typeof source['identityLock'] === 'string' ? source['identityLock'] : '',
  };
}

/**
 * Parse a stored output config whole — the image, and the two companion outputs beside it.
 *
 * Only a **history** entry is read this way, and that is the distinction to hold: an entry records
 * the configuration a prompt was actually composed from, so restoring one has to bring back the
 * companion requests the prompt in it carries. A preset goes through `parseImageConfig` above,
 * because an archetype has no companion outputs to store in the first place.
 */
export function parseOutputConfig(value: unknown): OutputConfig {
  const source = isRecord(value) ? value : {};

  return {
    ...parseImageConfig(source),
    emitManifest: pickBoolean(source, 'emitManifest', DEFAULT_OUTPUT_CONFIG.emitManifest),
    emitPromptFeedback: pickBoolean(source, 'emitPromptFeedback', DEFAULT_OUTPUT_CONFIG.emitPromptFeedback),
  };
}
