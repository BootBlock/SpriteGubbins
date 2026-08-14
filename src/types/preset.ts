import type { ImageOutputConfig } from './output.ts';
import type { SubjectCategory, SubjectDefinition } from './subject.ts';

/**
 * A saved studio configuration — the subject, the settings that decide the image, and the category
 * that decides which field labels and option pools apply to them.
 *
 * Built-in archetypes ship in `src/constants/presets/`; the user's own are persisted in the
 * `custom_presets` table and carry `isCustom`.
 */
export interface PresetArchetype {
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
  /** Present and `true` only for user-saved presets; built-ins omit it entirely. */
  readonly isCustom?: boolean;
}
