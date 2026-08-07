import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import {
  ASPECT_RATIOS,
  BACKGROUND_KEYS,
  DIRECTION_SETS,
  DIRECTIONAL_MODES,
  JOINT_CAP_STYLES,
  LIGHTING_MODELS,
  OUTLINE_STYLES,
  OVERLAP_MARGINS,
  PALETTE_LIMITS,
  PROJECTIONS,
  RENDER_STYLES,
  RESOLUTION_PROFILES,
  RIG_MODES,
  SURFACE_DETAILS,
  TARGET_MODEL_IDS,
} from '../types/output.ts';
import type { OutputConfig, TargetModelId } from '../types/output.ts';
import { SUBJECT_CATEGORIES, SUBJECT_FIELD_KEYS } from '../types/subject.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { isRecord, pick, pickBoolean, pickNumber } from './readers.ts';

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

/** Degrees above the horizon. A camera below the ground or past vertical is a corrupt value. */
const ELEVATION_RANGE = { min: 0, max: 90 } as const;

/**
 * Parse a stored output config, falling back per field rather than wholesale.
 *
 * One bad value costs that field its default instead of discarding the entire configuration — which
 * matters most for a preset, where the user would otherwise lose twenty settings to one bad one.
 */
export function parseOutputConfig(value: unknown): OutputConfig {
  if (!isRecord(value)) return DEFAULT_OUTPUT_CONFIG;

  return {
    directionalMode: pick(value, 'directionalMode', DEFAULT_OUTPUT_CONFIG.directionalMode, DIRECTIONAL_MODES),
    surfaceDetail: pick(value, 'surfaceDetail', DEFAULT_OUTPUT_CONFIG.surfaceDetail, SURFACE_DETAILS),
    resolutionProfile: pick(
      value,
      'resolutionProfile',
      DEFAULT_OUTPUT_CONFIG.resolutionProfile,
      RESOLUTION_PROFILES,
    ),
    paletteLimit: pick(value, 'paletteLimit', DEFAULT_OUTPUT_CONFIG.paletteLimit, PALETTE_LIMITS),
    outlineStyle: pick(value, 'outlineStyle', DEFAULT_OUTPUT_CONFIG.outlineStyle, OUTLINE_STYLES),
    lightingModel: pick(value, 'lightingModel', DEFAULT_OUTPUT_CONFIG.lightingModel, LIGHTING_MODELS),
    aspectRatio: pick(value, 'aspectRatio', DEFAULT_OUTPUT_CONFIG.aspectRatio, ASPECT_RATIOS),
    targetModel: pick(value, 'targetModel', DEFAULT_OUTPUT_CONFIG.targetModel, TARGET_MODEL_IDS),

    renderStyle: pick(value, 'renderStyle', DEFAULT_OUTPUT_CONFIG.renderStyle, RENDER_STYLES),
    projection: pick(value, 'projection', DEFAULT_OUTPUT_CONFIG.projection, PROJECTIONS),
    cameraElevation: pickNumber(
      value,
      'cameraElevation',
      DEFAULT_OUTPUT_CONFIG.cameraElevation,
      ELEVATION_RANGE,
    ),
    directions: pick(value, 'directions', DEFAULT_OUTPUT_CONFIG.directions, DIRECTION_SETS),
    backgroundKey: pick(value, 'backgroundKey', DEFAULT_OUTPUT_CONFIG.backgroundKey, BACKGROUND_KEYS),
    spriteTargetSize: typeof value['spriteTargetSize'] === 'string' ? value['spriteTargetSize'] : '',

    rigMode: pick(value, 'rigMode', DEFAULT_OUTPUT_CONFIG.rigMode, RIG_MODES),
    jointCapStyle: pick(value, 'jointCapStyle', DEFAULT_OUTPUT_CONFIG.jointCapStyle, JOINT_CAP_STYLES),
    overlapMargin: pick(value, 'overlapMargin', DEFAULT_OUTPUT_CONFIG.overlapMargin, OVERLAP_MARGINS),
    sockets: typeof value['sockets'] === 'string' ? value['sockets'] : '',

    identityLock: typeof value['identityLock'] === 'string' ? value['identityLock'] : '',
    emitManifest: pickBoolean(value, 'emitManifest', DEFAULT_OUTPUT_CONFIG.emitManifest),
  };
}
