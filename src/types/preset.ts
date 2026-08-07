import type { OutputConfig } from './output.ts';
import type { SubjectCategory, SubjectDefinition } from './subject.ts';

/**
 * A saved studio configuration — the subject, the output settings, and the category that
 * decides which field labels and option pools apply to them.
 *
 * Built-in archetypes ship in `src/constants/presets.ts`; the user's own are persisted in the
 * `custom_presets` table and carry `isCustom`.
 */
export interface PresetArchetype {
  readonly id: string;
  readonly name: string;
  readonly category: SubjectCategory;
  readonly subject: SubjectDefinition;
  readonly output: OutputConfig;
  /** Present and `true` only for user-saved presets; built-ins omit it entirely. */
  readonly isCustom?: boolean;
}
