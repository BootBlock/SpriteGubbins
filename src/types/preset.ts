import type { ImageOutputConfig } from './output.ts';
import type { SubjectCategory, SubjectDefinition } from './subject.ts';

/**
 * A saved studio configuration — the subject, the settings that decide the image, and the category
 * that decides which field labels and option pools apply to them.
 *
 * There are two kinds and they are a **union** rather than one interface with optional fields,
 * because the difference is not a matter of degree: a built-in ships in `src/constants/presets/`,
 * is a compile-time constant, is never stored and cannot be edited or deleted, while one of the
 * user's own is a row in `custom_presets` that belongs to a project and can be renamed, re-filed
 * and destroyed. Writing that as `isCustom?: boolean` alongside `projectId?: string` would leave
 * two optional fields with an unstated rule tying them together, and every reader of a preset would
 * have to know it. The union states it instead: narrowing on `isCustom === true` is what gives a
 * caller the project id, and there is no way to reach one without.
 */
interface ArchetypeShape {
  readonly id: string;
  readonly name: string;
  /**
   * What this archetype is for, in the reader's own words — the sentence the card carries under its
   * title and the search matches on.
   *
   * A name says what a preset is *of* and the specs line says what its sheet *is*; neither says why
   * anyone would reach for it, which is the question a library of seventy answers badly. Every
   * built-in ships one, and `presets.test.ts` fails a built-in that does not.
   *
   * Empty is a legitimate value and only a user's own preset may hold it: the box is optional when
   * saving, and a card with nothing here falls back to naming the subject instead.
   */
  readonly description: string;
  readonly category: SubjectCategory;
  readonly subject: SubjectDefinition;
  /**
   * The image alone — deliberately not an `OutputConfig`.
   *
   * The two companion outputs are the user's working preferences rather than a property of the
   * archetype, so a preset neither stores them nor disturbs them when it is loaded. See
   * `OutputConfig`, which says why, and `useOutputStore.applyImageConfig`, which is how a preset
   * reaches the studio.
   */
  readonly output: ImageOutputConfig;
}

/**
 * One of the archetypes the app ships with.
 *
 * The two fields are declared as `undefined` rather than left out so that the union discriminates:
 * without them, an object carrying an `isCustom` would still match this arm and a narrowing on it
 * would tell a caller nothing. Nothing writes either — a built-in literal simply omits both.
 */
export interface BuiltInArchetype extends ArchetypeShape {
  readonly isCustom?: undefined;
  readonly projectId?: undefined;
}

/** A configuration the user saved, which lives in a project and can be edited. */
export interface CustomArchetype extends ArchetypeShape {
  readonly isCustom: true;
  /**
   * The project this preset is filed under, by that project’s id — never by its name.
   *
   * Always a real project's id: the store refuses a save with no project chosen, deleting a project
   * deletes its presets with it, and an imported preset naming a project the file did not carry is
   * re-filed under the Default project. So a preset whose project cannot be found is a defect
   * rather than a state to render, and nothing below has an "unfiled" case to draw.
   */
  readonly projectId: string;
}

export type PresetArchetype = BuiltInArchetype | CustomArchetype;
