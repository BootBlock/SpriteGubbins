import { DEFAULT_PROJECT_ID, createDefaultProject } from '../constants/projects.ts';
import { PRESETS } from '../constants/presets/index.ts';
import { parseJson, isRecord } from '../db/readers.ts';
import {
  parseImportedPreset,
  parseImportedProject,
  parseImportedQuantisePreset,
} from '../db/importedRows.ts';
import { firstOfEachId } from './firstOfEachId.ts';
import type { LibraryPack } from '../types/libraryPack.ts';
import type { CustomArchetype } from '../types/preset.ts';
import type { Project } from '../types/project.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';

/**
 * The library-pack file format, both directions.
 *
 * **One file for all three collections**, because the three refer to one another: a preset names
 * its project by id, so a file of presets without their projects describes a library that cannot be
 * assembled. That is also why this replaced the two array-shaped packs the app used to write — one
 * for archetypes and one for dial positions — rather than joining them: each would have had to
 * carry a copy of the projects, and importing either would have been a decision about the
 * collection it was not for.
 *
 * The two halves have to agree about one thing, and they are the only code that knows it: an
 * exported pack **contains the built-in archetypes**, which is what makes the file readable on its
 * own — and an import must therefore **skip** them, or importing your own export would store a copy
 * of each as one of the reader's own and the library would show every archetype twice.
 *
 * Pure, so the format is testable without a file, a store or a database.
 */

/** The built-in ids, so an import can skip them. */
const BUILT_IN_IDS: ReadonlySet<string> = new Set(PRESETS.map((preset) => preset.id));

/** The pack the app hands out: the projects, every archetype, and every saved set of dials. */
export function serialiseLibraryPack(pack: LibraryPack): string {
  return JSON.stringify(
    {
      projects: pack.projects,
      presets: [...PRESETS, ...pack.presets],
      quantisePresets: pack.quantisePresets,
    },
    null,
    2,
  );
}

/** Whatever `value` holds under `key`, as an array — anything else reads as no entries at all. */
function entriesAt(value: Record<string, unknown>, key: string): unknown[] {
  const held = value[key];
  return Array.isArray(held) ? held : [];
}

/**
 * The library in a pack file's text, with `now` stamped on any timestamp the file did not carry.
 *
 * Returns `null` when the text is not a library pack at all — which is anything that is not a JSON
 * object, and an object holding none of the three collections as an array. An **empty** pack is a
 * different answer and is returned as one: it is what an install that has saved nothing exports,
 * and the caller has to be able to refuse it on its own terms, because importing *replaces* the
 * library and obeying an empty result would silently delete everything the reader has.
 *
 * Entries that cannot be vouched for are dropped rather than repaired into nonsense, which is the
 * rule `db/rows.ts` applies to storage, and a repeated id keeps its first entry — see
 * {@link firstOfEachId}.
 *
 * **Every preset comes out naming a project that is in the pack.** A file may name a project it
 * does not carry — hand-written, edited, or assembled from two exports — and a preset filed under
 * one would be invisible after the import, since the Projects tab draws presets under the project
 * they belong to. So an unplaceable preset is re-filed under the Default project, and the Default
 * project is added to the pack where the file did not carry it and something needs it. Doing that
 * here rather than in the store is what keeps the guarantee with the format: everything downstream
 * of this function may assume a preset's project exists.
 */
export function parseLibraryPack(text: string, now: number): LibraryPack | null {
  const parsed = parseJson(text);
  if (!isRecord(parsed)) return null;

  const collections = ['projects', 'presets', 'quantisePresets'];
  if (!collections.some((key) => Array.isArray(parsed[key]))) return null;

  const projects = firstOfEachId(
    entriesAt(parsed, 'projects')
      .map((entry) => parseImportedProject(entry, now))
      .filter((project): project is Project => project !== null),
  );

  const presets = firstOfEachId(
    entriesAt(parsed, 'presets')
      .map(parseImportedPreset)
      .filter((preset): preset is CustomArchetype => preset !== null)
      .filter((preset) => !BUILT_IN_IDS.has(preset.id)),
  );

  const quantisePresets = firstOfEachId(
    entriesAt(parsed, 'quantisePresets')
      .map(parseImportedQuantisePreset)
      .filter((preset): preset is QuantisePreset => preset !== null),
  );

  return withEveryProjectPresent({ projects, presets, quantisePresets }, now);
}

/**
 * The pack with every reference resolved: nothing filed under a project the pack does not hold.
 *
 * The Default project is only added where something actually needs it, so importing a pack of two
 * named projects does not arrive with a third the reader never made. An empty pack stays empty for
 * the same reason — it has nothing to re-file, and the caller refuses it rather than importing a
 * lone Default over a library the reader had built.
 */
function withEveryProjectPresent(pack: LibraryPack, now: number): LibraryPack {
  const known = new Set(pack.projects.map((project) => project.id));
  const refile = <T extends { readonly projectId: string }>(entry: T): T =>
    known.has(entry.projectId) ? entry : { ...entry, projectId: DEFAULT_PROJECT_ID };

  const presets = pack.presets.map(refile);
  const quantisePresets = pack.quantisePresets.map(refile);

  const needsDefault =
    !known.has(DEFAULT_PROJECT_ID) &&
    [...presets, ...quantisePresets].some((entry) => entry.projectId === DEFAULT_PROJECT_ID);

  return {
    projects: needsDefault ? [...pack.projects, createDefaultProject(now)] : pack.projects,
    presets,
    quantisePresets,
  };
}

/** How many things a pack holds, which is what the confirmation counts and the toast reports. */
export function libraryPackSize(pack: LibraryPack): number {
  return pack.projects.length + pack.presets.length + pack.quantisePresets.length;
}
