import type { PromptHistoryLog } from '../types/history.ts';
import type { CustomArchetype } from '../types/preset.ts';
import type { Project } from '../types/project.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';

/**
 * The four collections in the writing direction: a domain object as the `snake_case` row shape the
 * SQLite table uses.
 *
 * `rows.ts` is the reading direction and is *shared*, because a row has to be parsed identically
 * whichever backend produced it. These are not shared, and that is why they are filed apart rather
 * than beside their parsers: the SQLite side never calls them, since it binds its columns in SQL
 * inside the worker. They exist so the fallback writes rows the shared parsers can read — which is
 * what stops the two backends drifting in what they accept.
 *
 * **None of the three collections written by position writes `updated_at`, and that is a real
 * difference between the backends rather than an omission.** The column exists on the other side
 * because SQLite orders those collections with it; here the order *is* the array's, kept
 * newest-first by the caller's prepend, so a timestamp would be a number nothing reads. Writing one
 * anyway would be worse than useless: the fallback rewrites the whole collection on every
 * operation, so each write — a delete included — would stamp every row with the same instant,
 * destroying exactly the per-entry time the field appears to promise.
 *
 * The projects are the exception, and {@link toProjectRow} says why: their timestamps are the
 * project's own content rather than a sort key this side has no use for, so they are carried
 * through as given rather than left out.
 *
 * Each payload is **serialised, not nested**, so the shape matches the SQLite columns exactly and
 * one parser reads both.
 */

/** A prompt history entry as a `prompt_history` row. */
export function toHistoryRow(log: PromptHistoryLog): Record<string, unknown> {
  return {
    id: log.id,
    category: log.category,
    prompt_text: log.promptText,
    created_at: log.createdAt,
    word_count: log.wordCount,
    model_used: log.modelUsed,
    subject_json: JSON.stringify(log.subject),
    output_json: JSON.stringify(log.output),
  };
}

/**
 * A project as a `projects` row.
 *
 * The one row here that writes its timestamps, where the file's note above says none of them does.
 * The exception is exactly the case that note describes: the other three are ordered by position in
 * the array, so a timestamp would be a number nothing reads — while a project's `updated_at` is
 * *content*, shown on its row and carried through a pack, and its `created_at` is the project's
 * age. Both are decided by the store when it writes the project, not stamped here, so rewriting the
 * collection to delete one member cannot restamp the rest.
 */
export function toProjectRow(project: Project): Record<string, unknown> {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}

/** A studio archetype as a `custom_presets` row. */
export function toPresetRow(preset: CustomArchetype): Record<string, unknown> {
  return {
    id: preset.id,
    project_id: preset.projectId,
    name: preset.name,
    description: preset.description,
    category: preset.category,
    subject_json: JSON.stringify(preset.subject),
    output_json: JSON.stringify(preset.output),
  };
}

/** A quantiser preset as a `quantise_presets` row. */
export function toQuantisePresetRow(preset: QuantisePreset): Record<string, unknown> {
  return {
    id: preset.id,
    project_id: preset.projectId,
    name: preset.name,
    description: preset.description,
    dials_json: JSON.stringify(preset.dials),
  };
}
