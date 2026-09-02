import type { PromptHistoryLog } from '../types/history.ts';
import type { PresetArchetype } from '../types/preset.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';

/**
 * The three collections in the writing direction: a domain object as the `snake_case` row shape the
 * SQLite table uses.
 *
 * `rows.ts` is the reading direction and is *shared*, because a row has to be parsed identically
 * whichever backend produced it. These are not shared, and that is why they are filed apart rather
 * than beside their parsers: the SQLite side never calls them, since it binds its columns in SQL
 * inside the worker. They exist so the fallback writes rows the shared parsers can read — which is
 * what stops the two backends drifting in what they accept.
 *
 * **None of them writes `updated_at`, and that is a real difference between the backends rather
 * than an omission.** The column exists on the other side because SQLite orders the collection with
 * it; here the order *is* the array's, kept newest-first by the caller's prepend, so a timestamp
 * would be a number nothing reads. Writing one anyway would be worse than useless: the fallback
 * rewrites the whole collection on every operation, so each write — a delete included — would stamp
 * every row with the same instant, destroying exactly the per-entry time the field appears to
 * promise.
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

/** A studio archetype as a `custom_presets` row. */
export function toPresetRow(preset: PresetArchetype): Record<string, unknown> {
  return {
    id: preset.id,
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
    name: preset.name,
    description: preset.description,
    dials_json: JSON.stringify(preset.dials),
  };
}
