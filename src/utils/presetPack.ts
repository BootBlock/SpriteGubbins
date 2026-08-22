import { PRESETS } from '../constants/presets/index.ts';
import { parseJson } from '../db/readers.ts';
import { parseImportedPreset } from '../db/rows.ts';
import { firstOfEachId } from './firstOfEachId.ts';
import type { PresetArchetype } from '../types/preset.ts';

/**
 * The preset-pack file format, both directions.
 *
 * The two halves have to agree about one thing, and they are the only code that knows it: an
 * exported pack **contains the built-ins**, which is what makes the file readable on its own — and
 * an import must therefore **skip** them, or importing your own export would store six copies of
 * them as *custom* presets and the library would show every archetype twice. Keeping that pair in
 * one file is the point; they were sixty lines apart in the store, where nothing said they were
 * related.
 *
 * Pure, so the format is testable without a file, a store or a database.
 */

/** The built-in ids, so an import can skip them. */
const BUILT_IN_IDS: ReadonlySet<string> = new Set(PRESETS.map((preset) => preset.id));

/** The pack the app hands out: the built-ins, then whatever the user has saved. */
export function serialisePresetPack(customPresets: readonly PresetArchetype[]): string {
  return JSON.stringify([...PRESETS, ...customPresets], null, 2);
}

/**
 * The custom presets in a pack file's text.
 *
 * Returns `null` when the text is not a pack at all, and an empty array when it is a pack that
 * holds no custom presets — two different things the caller reports differently, and neither of
 * which may be treated as "import nothing successfully": importing *replaces* the collection, so
 * obeying an empty result would silently delete every preset the user has.
 *
 * **"Not a pack at all" includes an array of records that are not archetypes**, which is what a
 * pack of quantiser presets is — none of them carries a `category`, so none survives
 * {@link parseImportedPreset}. Without that test the reader who picked the wrong file would be
 * told their library held no presets, which is a statement about their library rather than about
 * the file. The test is on what *parsed*, deliberately, and not on what is returned: a pack of
 * nothing but built-ins parses in full and is then filtered to nothing, and that genuinely is an
 * empty pack.
 *
 * Entries that cannot be vouched for are dropped rather than repaired into nonsense, which is the
 * same rule `db/rows.ts` applies to storage, and a repeated id keeps its first entry — see
 * {@link firstOfEachId}.
 */
export function parsePresetPack(text: string): PresetArchetype[] | null {
  const parsed = parseJson(text);
  if (!Array.isArray(parsed)) return null;

  const presets = parsed
    .map(parseImportedPreset)
    .filter((preset): preset is PresetArchetype => preset !== null);
  if (presets.length === 0 && parsed.length > 0) return null;

  return firstOfEachId(presets.filter((preset) => !BUILT_IN_IDS.has(preset.id)));
}
