import type { PromptHistoryLog } from '../types/history.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';
import type { PresetArchetype } from '../types/preset.ts';
import type { StudioSession } from '../types/session.ts';
import type { AppSettings } from '../types/settings.ts';
import {
  isSubjectCategory,
  isTargetModelId,
  parseImageConfig,
  parseOutputConfig,
  parseSubject,
} from './configParsers.ts';
import { parseQuantiseTuning } from './quantiseTuningParser.ts';
import { isRecord, parseJson, readNumber, readString } from './readers.ts';
import { parseSession } from './sessionParser.ts';
import { parseSettings } from './settingsParser.ts';

/**
 * Turning untrusted storage rows into domain objects.
 *
 * Every parser here returns `null` for anything it cannot vouch for, and callers drop those rows. A
 * row written by an older build, hand-edited storage, or a malformed import must be *rejected* —
 * never cast into a shape it doesn't have and left to explode somewhere unrelated.
 *
 * The narrowing primitives are in `readers.ts` and the two payload parsers in `configParsers.ts`;
 * this file is only the row shapes.
 */

/**
 * Parse a `prompt_history` row. Returns `null` if any required column is missing or wrong.
 *
 * The two payload columns are the exception, and are *repaired* rather than required: they were
 * added after the first schema shipped, so a row written before then has neither. Defaulting them
 * costs that entry its one-click restore — it comes back as the category's defaults — while
 * rejecting the row would lose the prompt as well, which is the part worth keeping.
 */
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

  const subjectJson = readString(row, 'subject_json');
  const outputJson = readString(row, 'output_json');

  return {
    id,
    category,
    promptText,
    createdAt,
    wordCount,
    modelUsed,
    subject: parseSubject(subjectJson === null ? undefined : parseJson(subjectJson), category),
    output: parseOutputConfig(outputJson === null ? undefined : parseJson(outputJson)),
  };
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
    // Absent means the empty string rather than a rejected row: the box is optional, so a preset
    // saved without one is the ordinary case and has nothing to say here.
    description: readString(row, 'description') ?? '',
    category,
    subject: parseSubject(parseJson(subjectJson), category),
    // The image half alone. A row written by a build that stored the companion outputs still parses
    // — its two extra keys are simply not read — which is the ordinary pre-1.0 outcome rather than
    // a translation: the studio's own answers are what apply on load.
    output: parseImageConfig(parseJson(outputJson)),
    isCustom: true,
  };
}

/**
 * Parse the single `app_settings` row.
 *
 * The one row parser that returns a value rather than `null`, because there is nothing for a caller
 * to drop: an install that has never opened the settings dialog has no row at all, and that is not a
 * failure — it is the ordinary case, and it means the defaults. A row whose payload is unreadable
 * means the same thing, so both arrive here as "no usable settings" and leave as `DEFAULT_SETTINGS`.
 * `parseSettings` then falls back field by field within a payload it *can* read.
 */
export function parseSettingsRow(row: unknown): AppSettings {
  if (!isRecord(row)) return parseSettings(undefined);

  const settingsJson = readString(row, 'settings_json');
  return parseSettings(settingsJson === null ? undefined : parseJson(settingsJson));
}

/**
 * Parse the single `studio_session` row.
 *
 * Unlike {@link parseSettingsRow} this can honestly return `null`, and the difference is worth
 * holding on to: settings have a complete correct answer when nothing is stored — the defaults —
 * whereas a session that was never saved is genuinely absent, and the studio's own boot state is
 * already the right thing to show. Reporting "nothing" lets the store leave it alone rather than
 * overwrite it with a reconstruction.
 *
 * The row keeps the category in its own column and the other two as JSON payloads, which is the
 * shape `parsePresetRow` reads for the same three fields. Both payloads are unwrapped here and
 * repaired by `parseSession`, so one parser covers this row and the localStorage object alike.
 */
export function parseSessionRow(row: unknown): StudioSession | null {
  if (!isRecord(row)) return null;

  const subjectJson = readString(row, 'subject_json');
  const outputJson = readString(row, 'output_json');

  return parseSession({
    category: row['category'],
    subject: subjectJson === null ? undefined : parseJson(subjectJson),
    output: outputJson === null ? undefined : parseJson(outputJson),
  });
}

/**
 * Parse a preset from an imported JSON file.
 *
 * Same shape as a row, but the fields arrive already nested rather than as JSON strings. A preset
 * without a usable id or name is rejected; anything else is repaired from defaults, so a partially
 * hand-written pack still imports.
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
    // As in {@link parsePresetRow}: optional in the app, so optional in a hand-written pack too.
    description: readString(value, 'description') ?? '',
    category,
    subject: parseSubject(value['subject'], category),
    output: parseImageConfig(value['output']),
    isCustom: true,
  };
}

/**
 * Parse a `quantise_presets` row.
 *
 * Rejected only for want of an **id or a name**, which are the two things nothing can be invented
 * for: an id is what an update overwrites and a delete addresses, and a name is the whole of what
 * the reader picks the preset out of a list by. Everything else is repaired — the description
 * because a preset is allowed to have none, and the tuning field by field, so a row whose stored
 * ink threshold is nonsense still restores the twelve dials that are not.
 *
 * Deliberately the same shape on both backends: the fallback stores this record verbatim, so this
 * one parser reads a SQLite row and a localStorage entry alike and the two cannot drift in what
 * they accept.
 */
export function parseQuantisePresetRow(row: unknown): QuantisePreset | null {
  if (!isRecord(row)) return null;

  const id = readString(row, 'id');
  const name = readString(row, 'name');
  if (id === null || name === null) return null;

  const tuningJson = readString(row, 'tuning_json');
  return {
    id,
    name,
    description: readString(row, 'description') ?? '',
    tuning: parseQuantiseTuning(tuningJson === null ? undefined : parseJson(tuningJson)),
  };
}
