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
