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
 * **A new category appends.** This order is the category selector's, the preset library's collection
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
 * How a category's assembled-whole failure — exploded parts drawn as one finished thing — is named in
 * the two voices the model wrappers state it in.
 *
 * **One record rather than two, because they are one claim**, for the reason `RenderStyleSurface`
 * carries both of its: a generator is reached through a positive channel where Flux is told what the
 * sheet is *not* in prose, because no FLUX.2 model takes a negative prompt to discard it with, and a
 * negative one where Stable Diffusion and Qwen take bare terms. Filing the two apart is what lets a
 * category name one failure in one voice and a different one in the next.
 *
 * **The prompt body's three voices were here too, and they are the sheet's now** (issue #278). Those
 * forms name the pieces — the bands stacked, the tiles laid — and a category's sheets do not share
 * their pieces: BACKGROUND's layer library was told not to draw the bands stacked into the finished
 * scene, and it draws no band. They are `SheetPlan.assemblyFailure`. These two stay per category
 * because the rule on {@link CategoryAssembly.negatives} holds a term against every sheet the category
 * can compile, so a term that passes it names no piece of any of them and cannot be false of one.
 */
export interface CategoryAssembly {
  /**
   * This category's assembled whole, as a clause completing "…, with no cast shadow, no text, and …".
   *
   * Lower case, opening "no", no closing full stop — Flux's leading sentence is prose and this is
   * the last thing in it, so it has to read as English rather than as a term list.
   */
  readonly statement: string;
  /**
   * The same failure as bare concepts a negative prompt can carry, weighted by Stable Diffusion and
   * stated flat by Qwen.
   *
   * **A term belongs here only where no word of it names something any of this category's prompts
   * requires.** That is the `--no` rule in `wrapForMidjourney` — a term belongs only while no
   * subject the app can describe is made of it — applied to the two negative blocks, and it is what
   * a generator's cross-attention makes necessary: a weighted phrase is not read as an indivisible
   * unit.
   *
   * **Three places state a requirement, and a term has to clear all three.** The sheet plans, every
   * mode of them, whose entries are the components — every one of a TERRAIN sheet's *is* landscape,
   * so `composed landscape` would negate the subject, and BUILDING's are structural pieces and tiles
   * by its own section 4 guards. The category's own **field labels and option pools**,
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
  /**
   * The one option in the pool above that means *the subject has none of what this field
   * describes* — `Bare Unclad Frame`, `Clear — No Overlay`, `NONE`.
   *
   * **It is declared because a sheet plan cannot see the subject.** A plan's entries are a function
   * of the category, the mode, the direction set and the sheet index, so every one of them is
   * unconditional: an inventory that lists a cladding panel lists it for a vehicle whose reader has
   * just said it has no cladding, section 1 states the subject has none, and section 4's closing
   * rule forbids omitting the entry. Naming the value here is what lets
   * `planAsDrawn` in `utils/sheetPlanClothing.ts` take the entry out, so the two sections agree.
   *
   * **A pool declaring one may not carry a `'DRAWS_IT_PARTLY'` entry**, which is the invariant that
   * makes the arrangement complete rather than nearly complete — see `ComponentEntry.clothingRole`,
   * whose third value covers the entry that draws none of the attribute and is on the sheet only to
   * differ in it. Left
   * undeclared where the pool offers no such value, which is most of them: every option a
   * CHARACTER's *Clothing / Armour* offers is something the subject wears, and an OBJECT standing on
   * a *Freestanding Base* is still mounted on something.
   *
   * **Only the `clothing` key consumes it today**, because that is the only field any plan draws as
   * components of its own. It is declared on the field rather than on the category so a second such
   * field would need no new machinery, and so the declaration sits against the pool it names a
   * member of — which is what `categories.test.ts` checks.
   */
  readonly absentOption?: string;
  /**
   * The values in the pool above that name something the subject carries on **one of its own two
   * flanks and not the other**, each mapped to the phrase the prompt calls that thing.
   *
   * **The defect this exists to answer.** Section 3 forbids an opposite-turn pair being reflections
   * of one another, and measured across 27 real GPT-5.6 Sol sheets every pair that could be
   * measured is one — 12 of 12 — with the rule carried verbatim into 7 of the 7 readable
   * compositions that state it. What separates a sheet that satisfies the rule from one that
   * breaks it is not the rule: it is whether some *named* one-sided feature is drawn on the near
   * flank and absent from the far one. On the sheets that satisfy it, the holstered sidearm is on
   * the west torso and not the east. On the sheets that do not, nothing was named.
   *
   * The prompt used to ask the model to supply that itself — "pick one feature the subject carries
   * on one side and not the other" — which fails in two ways at once. It picks *one*, so a second
   * one-sided attribute is left free, and the head went on reflecting while the torso and pelvis
   * held. And it asks for a witness to a prohibition, which is a rule with no figure in it: the
   * object yaws survive the hand-off because they carry degrees. `utils/oneSidedFeatureLedger.ts`
   * is what replaced it, and this record is the half a compiler cannot work out for itself —
   * nothing in `Holstered Sidearm & Pouch` distinguishes it from `Tactical Kevlar & Plates` but
   * knowing what the words mean.
   *
   * **A map rather than a list, because only part of a value is usually the one-sided part.** The
   * visor of `Neon Visor & Undercut` is symmetric and the undercut is not, so the phrase is
   * `undercut` and the prompt reads "The undercut is on the subject's left". `categories.test.ts`
   * holds every phrase to naming something inside the option it is keyed by, with `&` read as
   * `and`, so a phrase cannot drift from the value it describes.
   *
   * **What may be declared, which is deliberately narrower than what might be asymmetric.** The
   * test is section 3's own sentence: does the subject carry this on one flank and not the other?
   * Three shapes pass it — the singular of something paired (`Monocular Cyber Eye`,
   * `Clockwork Prosthetic Hand`, `Bandages Over One Eye`), a thing worn across or at one flank by
   * construction (`Holstered Sidearm & Pouch`, `Bandolier Of Vials`, `Scabbard & Strap Rig`), and
   * a single mark or fitting in a place there are two of (`Ink Stains At The Temple`,
   * `Lapel Badge`). Everything else is left undeclared, and the *undeclared* case is today's
   * behaviour rather than a gap: a wrong declaration puts a false sentence about the subject into
   * section 3, which is worse than silence.
   *
   * **Two near misses say where the boundary is.** `Asymmetrical Pauldrons` and
   * `Split-Dyed Hair & Shaved Sides` are chiral but not one-sided — the subject has both, arranged
   * differently — so the sentence this record produces would be false of them, and section 3's
   * rules against swapping the subject's own left and right already cover them. And
   * `additional_anatomy` declares nothing at all, on any category: its entries are drawn as
   * **separate components in their own cells**, so there is no trunk for a per-facing visibility
   * statement to be about.
   *
   * **The pools are what this covers, and free text is what it does not.** Every subject field is
   * an unfiltered combo box, so a reader may type a one-sided feature nobody declared. That is why
   * section 9 keeps its "pick one feature" bullet for a subject the compiler derives nothing from —
   * see `promptTemplate.ts`, which states both branches and why each exists.
   */
  readonly oneSidedOptions?: Readonly<Record<string, string>>;
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
