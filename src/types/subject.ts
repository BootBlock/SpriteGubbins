/**
 * The subject half of a prompt: what is being drawn, as opposed to how it should be rendered
 * (that is `OutputConfig` in ./output.ts).
 */

/** The five kinds of thing the studio can describe. */
export const SUBJECT_CATEGORIES = ['CHARACTER', 'CREATURE', 'OBJECT', 'ITEM', 'BUILDING'] as const;

export type SubjectCategory = (typeof SUBJECT_CATEGORIES)[number];

/**
 * The sixteen fields every category defines — the same keys throughout, with each category
 * giving them its own labels, tooltips and option pool. `CHARACTER.species` is "Species /
 * Archetype" while `BUILDING.species` is "Structure Type", but both are the subject's base
 * identity, so the shared key is what lets a preset, the compiler and the database treat any
 * category uniformly.
 *
 * The prompt compiler reads every one of these by name, so adding a key here without giving it
 * a line in the compiled Subject Definition silently drops it from the output.
 */
export const SUBJECT_FIELD_KEYS = [
  'species',
  'gender',
  'age',
  'role',
  'setting',
  'build',
  'silhouette',
  'face_head',
  'anatomy',
  'clothing',
  'worn_details',
  'primary_colours',
  'accent_colours',
  'materials',
  'exclusions',
  'additional_anatomy',
] as const;

export type SubjectFieldKey = (typeof SUBJECT_FIELD_KEYS)[number];

/**
 * One field's definition within a category: what to call it, what it means, and the suggested
 * values.
 *
 * `options` is a *suggestion pool*, not a constraint — the control is an unfiltered combo box,
 * so the user can type anything. That is deliberate: the pool covers the common cases and the
 * free text covers everything else, which is why `SubjectDefinition` holds plain strings rather
 * than a union of the option literals.
 */
export interface FieldOption {
  readonly key: SubjectFieldKey;
  readonly label: string;
  readonly tooltip: string;
  readonly options: readonly string[];
}

/**
 * A category's full definition: its display name, and the *inventory* of its sixteen fields — what
 * each one is called here, what it means here, and the values it suggests here.
 *
 * **Not display order.** `SubjectForm` renders through `SUBJECT_FIELD_GROUPS`
 * (`constants/subjectGroups.ts`), which decides both the grouping and the order fields appear in,
 * and looks each key up in this array for its label, tooltip and pool. Reordering a category file
 * therefore changes nothing on screen — and nothing in the prompt either, which `generatePrompt`
 * assembles by key against a fixed template.
 */
export interface CategoryDefinition {
  readonly label: string;
  readonly fields: readonly FieldOption[];
}

/**
 * The user's current answers. Every key is always present — switching category resets the whole
 * record to that category's defaults — so consumers never have to handle a missing field.
 */
export type SubjectDefinition = Record<SubjectFieldKey, string>;
