import { parseJson } from '../db/readers.ts';
import { parseImportedQuantisePreset } from '../db/rows.ts';
import { firstOfEachId } from './firstOfEachId.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';

/**
 * The quantiser-preset file format, both directions.
 *
 * **A second pack rather than more of `presetPack.ts`'s**, for the reason `QuantisePreset` gives
 * about the two collections: an archetype describes a subject to generate and one of these
 * describes how to read a raster that came back. One file holding both would make every import a
 * decision about the collection it was not for — importing a colleague's dial positions would
 * replace your own archetypes, or silently leave them alone, and neither answer is one the file
 * could state.
 *
 * The two formats are the same *shape* — a JSON array of the app's own objects — which is what
 * lets each refuse the other exactly rather than by guessing: see
 * {@link parseImportedQuantisePreset} for the required field on each side that does it.
 *
 * **Neither direction filters anything, where the archetype pack adds its built-ins on the way out
 * and strips them again on the way in.** That pair exists there because an exported archetype pack
 * is meant to be readable on its own, so it carries the built-ins — and re-importing one would
 * otherwise store a second copy of each as custom. The quantiser ships no built-in dial positions —
 * the defaults are `QUANTISE_DEFAULT_DIALS`, which is where the tab opens rather than an entry in
 * a collection — so every preset in one of these files is the reader's own and all of them come
 * back.
 *
 * Pure, so the format is testable without a file, a store or a database.
 */

/** The whole collection, as the file the app hands out. */
export function serialiseQuantisePresetPack(presets: readonly QuantisePreset[]): string {
  return JSON.stringify(presets, null, 2);
}

/**
 * The presets in a pack file's text.
 *
 * Three answers, and the caller reports all three differently:
 *
 * - `null` — not a pack of these. Either the text is not a JSON array, or it is an array whose
 *   entries none of them survived {@link parseImportedQuantisePreset}, which is exactly what a pack
 *   of studio archetypes is. Reporting that as an empty pack would tell a reader who picked the
 *   wrong file that their collection was empty.
 * - `[]` — a pack that genuinely holds nothing, which is what an install with no saved settings
 *   exports.
 * - the presets — including the case where *some* entries were unusable, because an array that
 *   parsed in part is this app's file with something wrong in it rather than somebody else's.
 *
 * An empty result may never be treated as "import nothing successfully": importing *replaces* the
 * collection, so obeying one would delete every set of dial positions the reader has saved.
 *
 * Entries that cannot be vouched for are dropped rather than repaired into nonsense, which is the
 * rule `db/rows.ts` applies to storage, and a repeated id keeps its first entry — see
 * {@link firstOfEachId} for why that is the parser's job rather than a backend's.
 */
export function parseQuantisePresetPack(text: string): QuantisePreset[] | null {
  const parsed = parseJson(text);
  if (!Array.isArray(parsed)) return null;

  const presets = firstOfEachId(
    parsed.map(parseImportedQuantisePreset).filter((preset): preset is QuantisePreset => preset !== null),
  );

  // Nothing survived a file that held something: the entries are some other kind of record, so the
  // honest answer is that this is not one of these packs.
  if (presets.length === 0 && parsed.length > 0) return null;

  return presets;
}
