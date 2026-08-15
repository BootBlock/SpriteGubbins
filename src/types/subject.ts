/**
 * The subject half of a prompt: what is being drawn, as opposed to how it should be rendered
 * (that is `OutputConfig` in ./output.ts).
 */

/**
 * The kinds of thing the studio can describe.
 *
 * Each identifier is substituted into the compiled prompt verbatim — section 0 reads "components
 * that do not belong to a [DEFINE:CATEGORY]" — so it has to be a noun that survives being dropped
 * into a sentence, not an internal code.
 *
 * **A new category appends.** This order is the category selector's, the Presets tab's collection
 * list, and the order `PRESETS` concatenates its collections in; a preset's position in that array
 * is in turn the stop it takes on the hue wheel. Inserting mid-list would therefore re-colour every
 * collection after the insertion point to express an ordering the list has never claimed to carry.
 */
export const SUBJECT_CATEGORIES = [
  'CHARACTER',
  'CREATURE',
  'OBJECT',
  'ITEM',
  'BUILDING',
  'VEHICLE',
  'EFFECT',
  'INTERFACE',
  'TERRAIN',
] as const;

export type SubjectCategory = (typeof SUBJECT_CATEGORIES)[number];

/**
 * What a target model's wrapper is allowed to say about *this* sheet's assembled-whole failure —
 * exploded parts drawn as one finished thing.
 *
 * Both halves for the reason `RenderStyleSurface` carries both of its: the wrappers reach a
 * generator through two channels, a positive one where Flux is told what the sheet is *not* in
 * prose because Black Forest Labs document that Flux discards a negative prompt, and a negative one
 * where Stable Diffusion and Qwen take bare terms. A category whose statement and whose terms were
 * filed apart is free to name one failure in one channel and a different one in the other.
 */
export interface CategoryAssembly {
  /**
   * This sheet's assembled whole, as a clause completing "…, with no cast shadow, no text, and …".
   *
   * Lower case, opening "no", no closing full stop — Flux's leading sentence is prose and this is
   * the last thing in it, so it has to read as English rather than as a term list.
   */
  readonly statement: string;
  /**
   * The same failure as bare concepts a negative prompt can carry, weighted by Stable Diffusion and
   * stated flat by Qwen.
   *
   * **A term belongs here only where no component of this category's inventory answers to it, word
   * by word.** That is the `--no` rule in `wrapForMidjourney` — a term belongs only while no subject
   * the app can describe is made of it — applied to the two negative blocks, and it is what a
   * generator's cross-attention makes necessary: a weighted phrase is not read as an indivisible
   * unit. No component of a CHARACTER sheet is "a character", so `assembled character` negates the
   * assembled whole and nothing else; every component of a TERRAIN sheet *is* landscape, so
   * `composed landscape` would negate the subject, and BUILDING's are literally "a structural or
   * tile component" by its own section 4 guard. Where that rule leaves a category one safe term, it
   * gets one.
   */
  readonly negatives: readonly string[];
}

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
