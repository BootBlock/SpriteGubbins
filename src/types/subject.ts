/**
 * The subject half of a prompt: what is being drawn, as opposed to how it should be rendered
 * (that is `OutputConfig` in ./output.ts).
 */

/**
 * The kinds of thing the studio can describe.
 *
 * Each identifier is substituted into the compiled prompt verbatim — section 0 reads "components
 * that do not belong to [DEFINE:CATEGORY_ARTICLE] [DEFINE:CATEGORY]" — so it has to be a noun that
 * survives being dropped into a sentence, not an internal code. The article in front of it is the
 * category's own, from `CategoryDefinition.article`, and not a word fixed in the template.
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
  'PORTRAIT',
  'ICON',
  'BACKGROUND',
  'FONT',
] as const;

export type SubjectCategory = (typeof SUBJECT_CATEGORIES)[number];

/**
 * How *this* sheet's assembled-whole failure — exploded parts drawn as one finished thing — is named
 * in each of the five voices the app states it in.
 *
 * **One record rather than five, because they are one claim.** Two of the five are the wrappers'
 * channels, for the reason `RenderStyleSurface` carries both of its: a generator is reached through a
 * positive channel where Flux is told what the sheet is *not* in prose, because Black Forest Labs
 * document that Flux discards a negative prompt, and a negative one where Stable Diffusion and Qwen
 * take bare terms. The other three are the prompt body, which reaches **every** target rather than
 * three, and which stated all of this in a figure's vocabulary on all nine categories long after the
 * wrappers had stopped. Filing any of the five apart from the others is what lets a category name one
 * failure in one voice and a different one in the next.
 *
 * **The three body forms are not one sentence spliced three times, and that is the point of having
 * three fields.** Section 4's is an *instruction* about what not to draw, section 8's an *exclusion*
 * listed beside the shadows and the text, and section 9's a *check the reader performs* against the
 * delivered image. `CATEGORY_AUDIT_TEXT` records what the third of those costs when its nouns are
 * left unqualified — an audit reading "no exhaust" failed a VEHICLE sheet on a component section 4
 * required — so each form is worded for the job it does and none is derived from another.
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
   * **A term belongs here only where no word of it names something this sheet's own prompt
   * requires.** That is the `--no` rule in `wrapForMidjourney` — a term belongs only while no
   * subject the app can describe is made of it — applied to the two negative blocks, and it is what
   * a generator's cross-attention makes necessary: a weighted phrase is not read as an indivisible
   * unit.
   *
   * **Three places state a requirement, and a term has to clear all three.** The sheet plan, whose
   * entries are the components — every one of a TERRAIN sheet's *is* landscape, so
   * `composed landscape` would negate the subject, and BUILDING's are "a structural or tile
   * component" by its own section 4 guard. The category's own **field labels and option pools**,
   * which section 1 carries verbatim — EFFECT calls the smoke trailing its core a *Secondary Layer*,
   * which is what put `stacked layers` in a first draft of this record and took it back out. And the
   * **template's own section headings**, which name the contract rather than the subject — section 4
   * is COMPONENT INVENTORY, so ITEM cannot weight `inventory icon` against the section that decides
   * how many components it has.
   *
   * What a category *is* stays available, because no component is the whole of it: no component of a
   * CHARACTER sheet is "a character". Nor is a negative statement a requirement — the `exclusions`
   * pools are written as prohibitions, so a term sharing a word with one reinforces it. Where the
   * rule leaves a category one safe term, it gets one.
   */
  readonly negatives: readonly string[];
  /**
   * Section 4's closing instruction, filling `[DEFINE:CATEGORY_ASSEMBLY_INSTRUCTION]` — a whole
   * sentence, ending the paragraph that has just said not to merge, substitute, pad or omit.
   *
   * **It names the drawing, never the capability**, because section 6 asks this same component set to
   * assemble cleanly into the finished thing and one prompt may not disagree with itself. So the
   * wording is what the sheet must not *depict* — the parts fitted together — and it deliberately
   * avoids the phrase that category's own plan uses for what the set assembles *into*.
   */
  readonly instruction: string;
  /**
   * Section 8's bullet, filling `[DEFINE:CATEGORY_ASSEMBLY_EXCLUSION]` — a noun phrase under
   * "Absent from the image entirely:", sentence case and closed with a full stop like the three fixed
   * bullets it sits among. It is the fourth of the list's six; `CATEGORY_EXCLUSION_TEXT` is the first,
   * and the subject's own free-text exclusions are the conditional last.
   *
   * **It may not restate `CATEGORY_EXCLUSION_TEXT`**, three bullets up the same list. TERRAIN's line
   * carried this claim before this field existed and gave it up when it arrived; a category saying the
   * same thing twice in one list in two wordings is what that move exists to prevent — and the
   * distance between the two is what makes it easy to do rather than a reason it could not happen.
   */
  readonly exclusion: string;
  /**
   * Section 9's check, filling `[DEFINE:CATEGORY_ASSEMBLY_AUDIT]` — a lower-case clause completing
   * "Every component stops at its own joins — no entry arrives with a neighbouring piece attached,
   * and …", so it carries no capital and no closing full stop.
   *
   * **Its nouns are qualified**, for the reason recorded on `CATEGORY_AUDIT_TEXT`: this is the one
   * form the reader applies to the delivered sheet component by component, so a bare noun that a
   * component answers to fails the sheet on an entry section 4 required. It may not restate
   * `CATEGORY_AUDIT_TEXT` either — that is the same list's next check but one, with the one-camera
   * check between them.
   */
  readonly audit: string;
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
 * A category's full definition: its display name, the article its identifier takes in the compiled
 * prompt, and the *inventory* of its sixteen fields — what each one is called here, what it means
 * here, and the values it suggests here.
 *
 * **Not display order.** `SubjectForm` renders through `SUBJECT_FIELD_GROUPS`
 * (`constants/subjectGroups.ts`), which decides both the grouping and the order fields appear in,
 * and looks each key up in this array for its label, tooltip and pool. Reordering a category file
 * therefore changes nothing on screen — and nothing in the prompt either, which `generatePrompt`
 * assembles by key against a fixed template.
 */
export interface CategoryDefinition {
  readonly label: string;
  /**
   * The indefinite article the category identifier takes — section 0 reads "components that do not
   * belong to [DEFINE:CATEGORY_ARTICLE] [DEFINE:CATEGORY]".
   *
   * **It is written down rather than derived, because the rule is about sound and not spelling.**
   * The template used to fix `a` in the sentence, which is one word written for one category and
   * read by every one of them: five identifiers open with a vowel, so the four targets that reach
   * this `[IF:RETURNS_TEXT]` paragraph were told the inventory might not belong to `a EFFECT` — the
   * readers most likely to quote it back. Testing the first letter would fix those five and be
   * wrong the first time a category opens with a consonantal vowel (a `UI` takes "a", a `HUD`
   * takes "a") or a silent one (an `HERB` takes "an"). Every identifier happens to agree with the
   * letter test today, and that agreement is a coincidence rather than a rule.
   */
  readonly article: 'a' | 'an';
  readonly fields: readonly FieldOption[];
}

/**
 * The user's current answers. Every key is always present — switching category resets the whole
 * record to that category's defaults — so consumers never have to handle a missing field.
 */
export type SubjectDefinition = Record<SubjectFieldKey, string>;
