import { SUBJECT_CATEGORIES, SUBJECT_FIELD_KEYS } from '../types/subject.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { TARGET_MODEL_IDS } from '../types/output.ts';
import type { OutputConfig, TargetModelId } from '../types/output.ts';
import type { PromptHistoryLog } from '../types/history.ts';
import type { PresetArchetype } from '../types/preset.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output.ts';
import { defaultSubjectFor } from '../constants/categories/index.ts';

/**
 * Turning untrusted rows into domain objects.
 *
 * Everything crossing this boundary — a SQLite result row, a localStorage string, an imported
 * JSON file — is `unknown`, and the app's types are strict. These parsers narrow with real
 * checks rather than assertions: a row written by an older build, hand-edited storage, or a
 * malformed import must be *rejected*, not cast into a shape it doesn't have and left to
 * explode somewhere unrelated.
 *
 * Every parser returns `null` on anything it can't vouch for. Callers drop those rows.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

function readNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function isSubjectCategory(value: unknown): value is SubjectCategory {
  return typeof value === 'string' && SUBJECT_CATEGORIES.some((category) => category === value);
}

export function isTargetModelId(value: unknown): value is TargetModelId {
  return typeof value === 'string' && TARGET_MODEL_IDS.some((id) => id === value);
}

/**
 * Parse a stored subject, filling any absent field from the category's defaults.
 *
 * Tolerant by design, unlike the parsers above: a preset saved before a field existed is still a
 * useful preset, and defaulting the gap is better than discarding the user's work. What it will
 * not do is invent a *category* — that comes from the row and is validated strictly.
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

/** Parse a stored output config, filling anything missing or invalid from the defaults. */
export function parseOutputConfig(value: unknown): OutputConfig {
  if (!isRecord(value)) return DEFAULT_OUTPUT_CONFIG;

  // Each field is checked against its own union rather than trusted wholesale, so one bad value
  // costs that field its default instead of discarding the whole configuration.
  const config: OutputConfig = {
    directionalMode: pick(value, 'directionalMode', DEFAULT_OUTPUT_CONFIG.directionalMode, [
      'SINGLE_DIRECTION_POSE_LIBRARY',
      'CORE_DIRECTIONAL_VARIANTS',
      'FULL_DIRECTIONAL_POSE_LIBRARY',
    ]),
    surfaceDetail: pick(value, 'surfaceDetail', DEFAULT_OUTPUT_CONFIG.surfaceDetail, [
      'MINIMAL',
      'CLEAN_PRODUCTION',
      'DETAILED_PRODUCTION',
      'TEXTURED',
    ]),
    resolutionProfile: pick(value, 'resolutionProfile', DEFAULT_OUTPUT_CONFIG.resolutionProfile, [
      'HIGH_RESOLUTION_PIXEL_ART',
      'MID_RESOLUTION_PIXEL_ART',
      '16_BIT_RETRO_PIXEL_ART',
      'CUSTOM_PIXEL_ART',
    ]),
    paletteLimit: pick(value, 'paletteLimit', DEFAULT_OUTPUT_CONFIG.paletteLimit, [
      'STRICT_32_COLOR',
      'RESTRAINED_64_COLOR',
      'EXPANDED_ALBEDO',
    ]),
    outlineStyle: pick(value, 'outlineStyle', DEFAULT_OUTPUT_CONFIG.outlineStyle, [
      'DARK_LOCAL_CONTOUR',
      'PURE_BLACK_OUTLINE',
      'OUTLINE_LESS_ALBEDO',
    ]),
    lightingModel: pick(value, 'lightingModel', DEFAULT_OUTPUT_CONFIG.lightingModel, [
      'FLAT_NEUTRAL_ALBEDO',
      'ISOMETRIC_TOP_LEFT',
      'UNLIT_EMISSIVE_BAKED',
    ]),
    aspectRatio: pick(value, 'aspectRatio', DEFAULT_OUTPUT_CONFIG.aspectRatio, [
      'WIDE_16_9',
      'SQUARE_1_1',
      'TALL_9_16',
      'ULTRAWIDE_21_9',
    ]),
    targetModel: isTargetModelId(value['targetModel'])
      ? value['targetModel']
      : DEFAULT_OUTPUT_CONFIG.targetModel,
  };
  return config;
}

/** Read one field, accepting it only if it is one of `allowed`. */
function pick<T extends string>(
  source: Record<string, unknown>,
  key: string,
  fallback: T,
  allowed: readonly T[],
): T {
  const value = source[key];
  return allowed.find((candidate) => candidate === value) ?? fallback;
}

/** Parse a `prompt_history` row. Returns `null` if any required column is missing or wrong. */
export function parseHistoryRow(row: unknown): PromptHistoryLog | null {
  if (!isRecord(row)) return null;

  const id = readString(row, 'id');
  const promptText = readString(row, 'prompt_text');
  const createdAt = readNumber(row, 'created_at');
  const wordCount = readNumber(row, 'word_count');
  const category = row['category'];
  const modelUsed = row['model_used'];

  if (id === null || promptText === null || createdAt === null || wordCount === null) return null;
  if (!isSubjectCategory(category) || !isTargetModelId(modelUsed)) return null;

  return { id, category, promptText, createdAt, wordCount, modelUsed };
}

/** Parse a `custom_presets` row, including its two JSON payload columns. */
export function parsePresetRow(row: unknown): PresetArchetype | null {
  if (!isRecord(row)) return null;

  const id = readString(row, 'id');
  const name = readString(row, 'name');
  const category = row['category'];
  const subjectJson = readString(row, 'subject_json');
  const outputJson = readString(row, 'output_json');

  if (id === null || name === null || subjectJson === null || outputJson === null) return null;
  if (!isSubjectCategory(category)) return null;

  return {
    id,
    name,
    category,
    subject: parseSubject(parseJson(subjectJson), category),
    output: parseOutputConfig(parseJson(outputJson)),
    isCustom: true,
  };
}

/** `JSON.parse` that yields `undefined` instead of throwing — the payload columns are untrusted. */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Parse a preset from an imported JSON file.
 *
 * Same shape as a row, but the fields arrive already nested rather than as JSON strings. A
 * preset without a usable id or name is rejected; anything else is repaired from defaults, so a
 * partially-hand-written pack still imports.
 */
export function parseImportedPreset(value: unknown): PresetArchetype | null {
  if (!isRecord(value)) return null;

  const id = readString(value, 'id');
  const name = readString(value, 'name');
  const category = value['category'];
  if (id === null || name === null || !isSubjectCategory(category)) return null;

  return {
    id,
    name,
    category,
    subject: parseSubject(value['subject'], category),
    output: parseOutputConfig(value['output']),
    isCustom: true,
  };
}
