import { describe, expect, it } from 'vitest';
import { CATEGORY_DIRECTION_SETS } from '../src/constants/categoryDirectionSets.ts';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../src/constants/categories/index.ts';
import { ASSEMBLY_BASE_ADDS_NO_COMPONENTS } from '../src/constants/guidanceSentences.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../src/constants/output/index.ts';
import { modesFor, sheetSeriesFor } from '../src/constants/sheetPlans/index.ts';
import { sectionOf } from '../src/test/promptSections.ts';
import { SUBJECT_CATEGORIES } from '../src/types/subject.ts';
import type { SubjectCategory } from '../src/types/subject.ts';
import { generatePrompt } from '../src/utils/promptCompiler.ts';

/**
 * The *Assembly Base* field against the inventory it is not allowed to move.
 *
 * **The defect this exists for was in the guidance rather than in the compiler.** Three cards told
 * the reader the field decides how the sheet is broken up, and two of them stated figures: CHARACTER
 * promised “the default 9 core and 34 limb components” — 9 is the `THREE_CLASSIC` figure where
 * `DEFAULT_IMAGE_CONFIG.directions` is `FIVE_CLASSIC` and the core is 15 — and OBJECT promised that
 * `Single Rigid Object` emits one piece, where the studio's own OBJECT default compiles to 30, 14
 * and 7 across its three modes. CREATURE said the field decides how many legs get their own sprite
 * slots while `Amorphous — No Fixed Limbs` went on ordering a left and right forelimb and hindlimb.
 * `subject.anatomy` reaches section 1 and the identity-lock digest and nothing else.
 *
 * **The design is deliberate and recorded**, in `sheetPlans/portrait.ts`: a plan reshaped around this
 * field “would be the only plan in this directory to be a function of the subject rather than of the
 * category and the mode”, and what the field does instead “is reach section 1 verbatim, where it
 * tells the generator how the set is meant to come apart”. So the fix was the copy, and this is what
 * keeps the copy honest — `constants/tooltips/tooltips.test.ts` checks a card's shape, its
 * punctuation and whether it borrowed a neighbour's sentence, and none of those can check whether
 * what it says is true.
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

/** Every (mode, direction set, sheet) address a category can be compiled at. */
function addressesOf(category: SubjectCategory) {
  return modesFor(category).flatMap((mode) =>
    CATEGORY_DIRECTION_SETS[category].flatMap((directions) =>
      sheetSeriesFor(category, mode, directions).map((_, sheetIndex) => ({ mode, directions, sheetIndex })),
    ),
  );
}

/** The pool the field offers, which is every value this check has to hold for. */
function anatomyOptions(category: SubjectCategory): readonly string[] {
  const field = CATEGORY_OPTIONS[category].fields.find((option) => option.key === 'anatomy');
  if (field === undefined) throw new Error(`No anatomy field for ${category}.`);
  return field.options;
}

/** The `anatomy` card, which the last check reads. */
function anatomyTooltip(category: SubjectCategory): string {
  const field = CATEGORY_OPTIONS[category].fields.find((option) => option.key === 'anatomy');
  if (field === undefined) throw new Error(`No anatomy field for ${category}.`);
  return field.tooltip;
}

describe('the assembly base moves nothing in the inventory', () => {
  it.each(SUBJECT_CATEGORIES)('every %s base compiles one section 4', (category) => {
    // Byte-identical, not merely equal in total: a base that swapped a forelimb for a tentacle while
    // keeping the count would satisfy an arithmetic check and would still be the mechanism the three
    // cards claimed. The leading option is the reference because it is what `defaultSubjectFor`
    // installs, so the comparison is against the sheet a reader gets before touching the control.
    const options = anatomyOptions(category);
    const [reference] = options;
    if (reference === undefined) throw new Error(`Empty anatomy pool for ${category}.`);

    for (const { mode, directions, sheetIndex } of addressesOf(category)) {
      const output = { ...DEFAULT_OUTPUT_CONFIG, directionalMode: mode, directions, sheetIndex };
      const subject = defaultSubjectFor(category);
      const expected = sectionOf(
        generatePrompt(category, { ...subject, anatomy: reference }, output),
        'COMPONENT INVENTORY',
      );

      for (const anatomy of options) {
        const where = `${category} / ${mode} / ${directions} / sheet ${String(sheetIndex + 1)} / ${anatomy}`;
        expect(
          sectionOf(generatePrompt(category, { ...subject, anatomy }, output), 'COMPONENT INVENTORY'),
          where,
        ).toBe(expected);
      }
    }
  });

  it.each(SUBJECT_CATEGORIES)('every %s base contracts for the same count', (category) => {
    // Read out of the compiled prompt rather than from `componentCountFor`, which takes no `anatomy`
    // argument at all — asking it would be asserting the signature rather than the behaviour, and it
    // would pass however the section above was built. This is the sentence a reader is held to.
    const counts = new Map<string, Set<string>>();

    for (const { mode, directions, sheetIndex } of addressesOf(category)) {
      const where = `${category} / ${mode} / ${directions} / sheet ${String(sheetIndex + 1)}`;
      for (const anatomy of anatomyOptions(category)) {
        const prompt = generatePrompt(
          category,
          { ...defaultSubjectFor(category), anatomy },
          { ...DEFAULT_OUTPUT_CONFIG, directionalMode: mode, directions, sheetIndex },
        );
        const stated = /Exactly (\d+) components/.exec(prompt)?.[1];
        expect(stated, `${where} / ${anatomy} states no count`).toBeDefined();
        counts.set(where, (counts.get(where) ?? new Set()).add(stated ?? ''));
      }
    }

    for (const [where, stated] of counts) expect([...stated], where).toHaveLength(1);
  });

  it.each(SUBJECT_CATEGORIES)('the %s base still reaches section 1 verbatim', (category) => {
    // The other half of the claim, and the reason this suite is not an argument for deleting the
    // field. It is what the generator is told the set comes apart by, so every value has to arrive
    // in section 1 exactly as the pool spells it — a check that only asserted the absence would pass
    // just as well on a field the compiler had stopped reading at all.
    for (const anatomy of anatomyOptions(category)) {
      const prompt = generatePrompt(
        category,
        { ...defaultSubjectFor(category), anatomy },
        DEFAULT_OUTPUT_CONFIG,
      );
      expect(sectionOf(prompt, 'SUBJECT DEFINITION'), `${category} / ${anatomy}`).toContain(anatomy);
    }
  });

  it.each(SUBJECT_CATEGORIES)('the %s card says so', (category) => {
    // The guidance and the behaviour, tied together. All thirteen carry the shared sentence, so a
    // card rewritten to promise a breakdown again has to take that sentence out to do it — and
    // taking it out fails here, which is the check the three cards that did promise one went
    // without.
    expect(anatomyTooltip(category)).toContain(ASSEMBLY_BASE_ADDS_NO_COMPONENTS);
  });
});
