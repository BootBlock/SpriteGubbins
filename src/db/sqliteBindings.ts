import type { Database } from '@sqlite.org/sqlite-wasm';
import type { CustomArchetype } from '../types/preset.ts';
import type { Project } from '../types/project.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';

/**
 * How a domain object becomes the columns a statement binds, and how several statements become one
 * transaction.
 *
 * Filed apart from `sqliteRequests.ts` because the two answer different questions. That file says
 * *which* SQL each request runs; this says what a row's columns are and in what order — a fact each
 * object has once, however many statements write it. Two collections are written by both an upsert
 * and an import, so a column order restated at each of those is a pair free to drift, and the
 * failure it produces is a row whose name is in the description column.
 */

/**
 * Run `work` as one transaction, rolling the whole of it back if any statement throws.
 *
 * Two requests need it and both need it for the same reason — a half-applied delete or import
 * leaves rows referring to a project that is no longer there, which is a state nothing above can
 * render or repair. Written once here rather than twice inline: the `BEGIN`/`COMMIT` pair is easy
 * to get right and easy to leave the `ROLLBACK` out of, and the version with the mistake in it
 * looks exactly like the version without.
 */
export function transact(database: Database, work: () => void): void {
  database.exec('BEGIN');
  try {
    work();
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

/** One archetype's columns, in the order every statement that writes it binds them. */
export function presetBindings(preset: CustomArchetype, updatedAt: number): (string | number)[] {
  return [
    preset.id,
    preset.projectId,
    preset.name,
    preset.description,
    preset.category,
    JSON.stringify(preset.subject),
    JSON.stringify(preset.output),
    updatedAt,
  ];
}

/** One set of dials' columns, in the order every statement that writes it binds them. */
export function quantisePresetBindings(preset: QuantisePreset, updatedAt: number): (string | number)[] {
  return [
    preset.id,
    preset.projectId,
    preset.name,
    preset.description,
    JSON.stringify(preset.dials),
    updatedAt,
  ];
}

/** One project's columns, in the order every statement that writes it binds them. */
export function projectBindings(project: Project): (string | number)[] {
  return [project.id, project.name, project.description, project.createdAt, project.updatedAt];
}
