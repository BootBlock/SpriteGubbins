import type { PromptHistoryLog } from '../types/history.ts';
import type { PresetArchetype } from '../types/preset.ts';
import { isSubjectCategory, isTargetModelId, parseOutputConfig, parseSubject } from './configParsers.ts';
import { isRecord, parseJson, readNumber, readString } from './readers.ts';

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
    category,
    subject: parseSubject(parseJson(subjectJson), category),
    output: parseOutputConfig(parseJson(outputJson)),
    isCustom: true,
  };
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
    category,
    subject: parseSubject(value['subject'], category),
    output: parseOutputConfig(value['output']),
    isCustom: true,
  };
}
