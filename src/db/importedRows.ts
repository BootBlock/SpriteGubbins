import { DEFAULT_PROJECT_ID, PROJECT_NAME_MAX_LENGTH } from '../constants/projects.ts';
import type { CustomArchetype } from '../types/preset.ts';
import type { Project } from '../types/project.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';
import { isSubjectCategory, parseImageConfig, parseSubject } from './configParsers.ts';
import { parseQuantiseDials } from './quantiseDialsParser.ts';
import { isRecord, readNumber, readString } from './readers.ts';

/**
 * Turning the entries of an imported **pack file** into domain objects.
 *
 * The twin of `rows.ts`, and filed apart from it because the two answer to different rules. A row
 * came out of this app's own table, so a field it cannot vouch for is storage that has been
 * hand-edited and the row is rejected. A pack may have been written by hand, edited, or exported by
 * a build that filed things differently — and refusing an entry there loses a configuration over a
 * field the reader can re-choose in one press. So these repair where the row parsers reject, and
 * each place they do says why.
 *
 * What both files share is the rule that matters: nothing is ever *cast* into a shape it does not
 * have. An entry that cannot be vouched for is dropped, and the caller drops it.
 */

/**
 * Parse a project from an imported library pack, stamping `now` on whichever timestamp the file
 * did not carry.
 *
 * The instant is passed in rather than read from the clock here, so this stays a pure function of
 * its arguments like every other parser in the file — and so a whole imported pack shares one
 * instant rather than being spread across however long the parse took.
 */
export function parseImportedProject(value: unknown, now: number): Project | null {
  if (!isRecord(value)) return null;

  const id = readString(value, 'id');
  const name = readString(value, 'name');
  if (id === null || name === null) return null;

  return {
    id,
    // Clamped rather than rejected: a name too long for the dropdown every save goes through is a
    // hand-edited or hand-written pack, and losing the project — and with it everything filed under
    // it — over a label is a far worse answer than shortening the label. See
    // `PROJECT_NAME_MAX_LENGTH`, which says why the control has a limit at all.
    name: name.slice(0, PROJECT_NAME_MAX_LENGTH),
    description: readString(value, 'description') ?? '',
    createdAt: readNumber(value, 'createdAt') ?? now,
    updatedAt: readNumber(value, 'updatedAt') ?? now,
  };
}

/**
 * Parse a preset from an imported JSON file.
 *
 * Same shape as a row, but the fields arrive already nested rather than as JSON strings. A preset
 * without a usable id or name is rejected; anything else is repaired from defaults, so a partially
 * hand-written pack still imports.
 *
 * **A missing project id is repaired to the Default project**, where a stored row's is required.
 * The difference is what the two are: a row came from this app's own table, while a pack may have
 * been written by hand or exported by a build that filed presets differently, and refusing it would
 * lose the configuration over a container the reader can re-choose in one press. The pack parser
 * then does the half this cannot see — a preset naming a project the *file* does not carry is
 * re-filed the same way, because a reference to a project that will not exist after the import is
 * no better than an absent one.
 */
export function parseImportedPreset(value: unknown): CustomArchetype | null {
  if (!isRecord(value)) return null;

  const id = readString(value, 'id');
  const name = readString(value, 'name');
  const category = value['category'];
  if (id === null || name === null || !isSubjectCategory(category)) return null;

  return {
    id,
    projectId: readString(value, 'projectId') ?? DEFAULT_PROJECT_ID,
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
 * Parse a quantiser preset from an imported JSON file.
 *
 * The twin of {@link parseImportedPreset}, and it differs from {@link parseQuantisePresetRow} in
 * the same way that one differs from {@link parsePresetRow}: a stored row carries the dials as a
 * JSON *string* under `dials_json`, while a pack carries them already nested under `dials`.
 *
 * **A `dials` record is required, and that requirement is what tells the two packs apart.** Both
 * files are JSON arrays of objects with an id, a name and a description, so without it a pack of
 * studio archetypes would import here as a collection of presets whose every dial had been
 * repaired to its default — twenty settings nobody chose, under names that promise otherwise.
 * `parseQuantiseDials` repairs field by field by design, so the discrimination cannot come from
 * inside it. The archetypes refuse a pack of these by the same rule from the other side: a
 * quantiser preset has no `category`, which {@link parseImportedPreset} requires.
 *
 * Beyond that the rule is the row's — rejected only for want of an id or a name, and everything
 * else repaired, so a partially hand-written pack still imports.
 */
export function parseImportedQuantisePreset(value: unknown): QuantisePreset | null {
  if (!isRecord(value)) return null;

  const id = readString(value, 'id');
  const name = readString(value, 'name');
  if (id === null || name === null || !isRecord(value['dials'])) return null;

  return {
    id,
    projectId: readString(value, 'projectId') ?? DEFAULT_PROJECT_ID,
    name,
    description: readString(value, 'description') ?? '',
    dials: parseQuantiseDials(value['dials']),
  };
}
