import { describe, expect, it } from 'vitest';
import { CATEGORY_DIRECTION_SETS } from '../src/constants/categoryDirectionSets.ts';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../src/constants/categories/index.ts';
import {
  ASSEMBLY_BASE_ADDS_NO_COMPONENTS,
  SUBJECT_TYPE_ADDS_NO_COMPONENTS,
} from '../src/constants/guidanceSentences.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../src/constants/output/index.ts';
import { modesFor, sheetSeriesFor } from '../src/constants/sheetPlans/index.ts';
import { sectionOf } from '../src/test/promptSections.ts';
import { SUBJECT_CATEGORIES } from '../src/types/subject.ts';
import type { SubjectCategory } from '../src/types/subject.ts';
import { generatePrompt } from '../src/utils/promptCompiler.ts';

/**
 * The fields that name the subject and how it comes apart, against the inventory neither may move.
 *
 * **The defect this exists for was in the guidance rather than in the compiler, and it was found
 * twice.** First on *Assembly Base* (issue #233): three cards told the reader the field decides how
 * the sheet is broken up, and two of them stated figures — CHARACTER promised “the default 9 core and
 * 34 limb components”, where 9 is the `THREE_CLASSIC` figure, `DEFAULT_IMAGE_CONFIG.directions` is
 * `FIVE_CLASSIC` and the core is 15, and OBJECT promised that `Single Rigid Object` emits one piece,
 * where the studio's own OBJECT default compiles to 30, 14 and 7 across its three modes. Then on the
 * first field of every form, `species` (issue #282): after the base's cards were corrected, six more
 * said the subject's type decides the component split, and EFFECT's said it decides how many frames
 * the sequence needs. Both fields reach section 1 and the identity-lock digest and nothing else.
 *
 * **The design is deliberate and recorded**, in `sheetPlans/portrait.ts`: a plan reshaped around the
 * subject “would be the only plan in this directory to be a function of the subject rather than of
 * the category and the mode”. So both fixes were the copy, and this is what keeps the copy honest —
 * `constants/tooltips/tooltips.test.ts` checks a card's shape, its punctuation and whether it borrowed
 * a neighbour's sentence, and none of those can check whether what it says is true.
 *
 * **It compiles rather than reading the plan tables**, because the claim the cards made was about
 * the *prompt*: a reader is promised a component breakdown, and section 4 is where they would look
 * for it. Compiling is also what reaches the count section 0 binds the generator to, which is the
 * figure a reader sizes a job by and the one CHARACTER's card got wrong.
 *
 * It lives here rather than beside a module because it belongs to no one of them: the pools are in
 * `src/constants/categories/`, the inventory is in `src/constants/sheetPlans/`, and the claim is
 * about what the compiler does with the pair.
 */

/** Each field no sheet plan reads, and the shared sentence every one of its thirteen cards carries. */
const FIELDS = [
  { key: 'anatomy', sentence: ASSEMBLY_BASE_ADDS_NO_COMPONENTS },
  { key: 'species', sentence: SUBJECT_TYPE_ADDS_NO_COMPONENTS },
] as const;

/** Every field on every category, which is the grain each check below reports at. */
const CASES = FIELDS.flatMap(({ key, sentence }) =>
  SUBJECT_CATEGORIES.map((category) => [category, key, sentence] as const),
);

/** Every (mode, direction set, sheet) address a category can be compiled at. */
function addressesOf(category: SubjectCategory) {
  return modesFor(category).flatMap((mode) =>
    CATEGORY_DIRECTION_SETS[category].flatMap((directions) =>
      sheetSeriesFor(category, mode, directions).map((_, sheetIndex) => ({ mode, directions, sheetIndex })),
    ),
  );
}

/** The field as one category defines it: its pool is every value a check holds for, and its card is the last check's. */
function fieldOf(category: SubjectCategory, key: (typeof FIELDS)[number]['key']) {
  const field = CATEGORY_OPTIONS[category].fields.find((option) => option.key === key);
  if (field === undefined) throw new Error(`No ${key} field for ${category}.`);
  return field;
}

describe('the subject’s type and assembly base move nothing in the inventory', () => {
  it.each(CASES)('every %s %s value compiles one section 4', (category, key) => {
    // Byte-identical, not merely equal in total: a value that swapped a forelimb for a tentacle while
    // keeping the count would satisfy an arithmetic check and would still be the mechanism the cards
    // claimed. The leading option is the reference because it is what `defaultSubjectFor` installs,
    // so the comparison is against the sheet a reader gets before touching the control.
    const { options } = fieldOf(category, key);
    const [reference] = options;
    if (reference === undefined) throw new Error(`Empty ${key} pool for ${category}.`);

    for (const { mode, directions, sheetIndex } of addressesOf(category)) {
      const output = { ...DEFAULT_OUTPUT_CONFIG, directionalMode: mode, directions, sheetIndex };
      const subject = defaultSubjectFor(category);
      const expected = sectionOf(
        generatePrompt(category, { ...subject, [key]: reference }, output),
        'COMPONENT INVENTORY',
      );

      for (const value of options) {
        const where = `${category} / ${mode} / ${directions} / sheet ${String(sheetIndex + 1)} / ${value}`;
        expect(
          sectionOf(generatePrompt(category, { ...subject, [key]: value }, output), 'COMPONENT INVENTORY'),
          where,
        ).toBe(expected);
      }
    }
  });

  it.each(CASES)('every %s %s value contracts for the same count', (category, key) => {
    // Read out of the compiled prompt rather than from `componentCountFor`, which takes no subject
    // at all — asking it would be asserting the signature rather than the behaviour, and it would
    // pass however the section above was built. This is the sentence a reader is held to.
    const counts = new Map<string, Set<string>>();

    for (const { mode, directions, sheetIndex } of addressesOf(category)) {
      const where = `${category} / ${mode} / ${directions} / sheet ${String(sheetIndex + 1)}`;
      for (const value of fieldOf(category, key).options) {
        const prompt = generatePrompt(
          category,
          { ...defaultSubjectFor(category), [key]: value },
          { ...DEFAULT_OUTPUT_CONFIG, directionalMode: mode, directions, sheetIndex },
        );
        const stated = /Exactly (\d+) components/.exec(prompt)?.[1];
        expect(stated, `${where} / ${value} states no count`).toBeDefined();
        counts.set(where, (counts.get(where) ?? new Set()).add(stated ?? ''));
      }
    }

    for (const [where, stated] of counts) expect([...stated], where).toHaveLength(1);
  });

  it.each(CASES)('every %s %s value still reaches section 1 verbatim', (category, key) => {
    // The other half of the claim, and the reason this suite is not an argument for deleting either
    // field. Each is what the generator is told the subject is or how it comes apart, so every value
    // has to arrive in section 1 exactly as the pool spells it — a check that only asserted the
    // absence would pass just as well on a field the compiler had stopped reading at all.
    for (const value of fieldOf(category, key).options) {
      const prompt = generatePrompt(
        category,
        { ...defaultSubjectFor(category), [key]: value },
        DEFAULT_OUTPUT_CONFIG,
      );
      expect(sectionOf(prompt, 'SUBJECT DEFINITION'), `${category} / ${value}`).toContain(value);
    }
  });

  it.each(CASES)('the %s %s card says so', (category, key, sentence) => {
    // The guidance and the behaviour, tied together. Every card of a field carries that field's shared
    // sentence, so a card rewritten to promise a breakdown again has to take the sentence out to do
    // it — and taking it out fails here, which is the check the nine cards that did promise one went
    // without.
    expect(fieldOf(category, key).tooltip).toContain(sentence);
  });
});
