import { describe, expect, it } from 'vitest';
import { sameWord } from '../../test/sameWord.ts';
import { CATEGORY_OPTIONS } from '../categories/index.ts';
import { PROMPT_TEMPLATE } from '../promptTemplate.ts';
import { CATEGORY_SHEET_PLANS } from '../sheetPlans/modes.ts';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { DIRECTION_LISTS } from './camera.ts';
import { CATEGORY_ASSEMBLY } from './categoryAssembly.ts';

/**
 * Whether each category's two wrapper terms negate anything its own prompts require, and whether they
 * hold to the shape both channels expect.
 *
 * Checked against the prompt's own sources rather than against a second copy of the expected terms,
 * for the reason `renderStyleSurface.test.ts` checks its terms against `RENDER_STYLE_TEXT`: the
 * defect being guarded is two statements of one fact disagreeing, and a test listing the answers
 * would be written from whatever misunderstanding produced them.
 *
 * **The opposition is three sources, and two of them were added after this suite let a wrong term
 * through.** A first version read the sheet plans alone, which is where a category lists its
 * components — and it passed `stacked layers` on EFFECT, whose *Secondary Layer* field is what that
 * category calls the smoke trailing its core, and would have passed `inventory icon` on ITEM against
 * a section 4 titled COMPONENT INVENTORY. Neither word is in a plan entry. So the plans are joined
 * by the category's own field labels and option pools, which section 1 carries verbatim, and by the
 * template's section headings, which name the contract the sheet is held to.
 *
 * Two things are deliberately *not* opposition, and both would produce false failures. A category's
 * **own name** — no component of a CHARACTER sheet is "a character", which is the whole basis of
 * `assembled character`. And the **`exclusions` pools**, whose options are written as prohibitions
 * rather than as names (`No composed landscape scene or vista`), so a term sharing a word with one
 * reinforces it rather than contradicting it.
 *
 * **It is still the mechanical half of a rule that is wider than it.** `complete structure` passes
 * here, because BUILDING's entries spell their components "wall bay" and "roof section" — and it is
 * still wrong, because every one of them *is* a structure and the category's own section 4 guards say
 * so. Whether a term names the sheet's subject in a synonym is a judgement, recorded per entry in the
 * record itself.
 *
 * **The terms are held against every sheet the category can compile, and that is what lets them stay
 * per category.** The three body forms are the sheet's (issue #278), because they name pieces and a
 * category's sheets do not share their pieces; a term that clears the opposition below names no piece
 * of any sheet at all. The body forms get the word-by-word rule's opposite — a clause stating a
 * relation may use the words a term may not — and their own checks in `sheetPlans/sheetClaims.test.ts`.
 */
describe('CATEGORY_ASSEMBLY', () => {
  /** The contract's own nouns, which belong to no category and are required by every one of them. */
  const HEADING_WORDS = wordsIn((PROMPT_TEMPLATE.match(/^#+ .*$/gm) ?? []).join(' '));

  function wordsIn(text: string): ReadonlySet<string> {
    return new Set(text.toLowerCase().match(/[a-z]+/g) ?? []);
  }

  /**
   * Every word this category's own prompts will state as a requirement.
   *
   * The plans are walked over every mode and every direction set they admit, and entry text alone:
   * a group's intro and a plan's assembly sentence both describe the *assembled* result — "the
   * complete vehicle at rest", "none of them a layer to be stacked on another" — which is precisely
   * what these terms exist to negate, so including them would fail the terms for saying what they
   * are for.
   */
  function requiredWords(category: SubjectCategory): ReadonlySet<string> {
    const entries = Object.values(CATEGORY_SHEET_PLANS[category])
      .flatMap((seriesFor) => Object.values(DIRECTION_LISTS).flatMap((facings) => seriesFor(facings)))
      .flatMap((plan) => plan.groups.flatMap((group) => group.entries.map((entry) => entry.text)));
    const definition = CATEGORY_OPTIONS[category];
    const subject = definition.fields
      .filter((field) => field.key !== 'exclusions')
      .flatMap((field) => [field.label, ...field.options]);
    const own = wordsIn(`${category} ${definition.label}`);
    return new Set(
      [...HEADING_WORDS, ...wordsIn([...entries, ...subject].join(' '))].filter((word) => !own.has(word)),
    );
  }

  /**
   * Words carrying no claim, which a term may share with a requirement.
   *
   * Short and closed on purpose: the list exists so `no scenic vista or diorama` is not failed by
   * its own conjunction, not so a term can be excused a noun. Anything a generator could attend to
   * is absent from it.
   */
  const FUNCTION_WORDS = new Set([
    'a',
    'an',
    'and',
    'as',
    'in',
    'into',
    'no',
    'of',
    'on',
    'or',
    'the',
    'to',
    'with',
  ]);

  it.each(SUBJECT_CATEGORIES)('negates nothing %s’s own prompts require', (category) => {
    const required = [...requiredWords(category)];
    const { negatives, statement } = CATEGORY_ASSEMBLY[category];

    // The statement is held to the same rule as the terms. Flux reads it positively rather than as a
    // negative prompt, but the bleed is the same one that made "no shadows" take the form shadow a
    // 3D render is built from — a claim a generator can attend to word by word either way.
    for (const claim of [...negatives, statement]) {
      for (const word of claim.toLowerCase().match(/[a-z]+/g) ?? []) {
        if (FUNCTION_WORDS.has(word)) continue;
        const clash = required.find((requiredWord) => sameWord(word, requiredWord));
        expect(clash, `${category} negates “${word}”, which its own prompt requires as “${clash}”`).toBe(
          undefined,
        );
      }
    }
  });

  it.each(SUBJECT_CATEGORIES)('gives %s terms both channels can carry as written', (category) => {
    const { negatives, statement } = CATEGORY_ASSEMBLY[category];

    // Bare concepts: the weighting is Stable Diffusion's convention and is applied in its wrapper, so
    // a `(term:1.3)` stored here would reach Qwen as literal punctuation in a field documented to
    // take a description.
    expect(negatives, category).not.toEqual([]);
    for (const term of negatives) {
      expect(term, category).toBe(term.trim().toLowerCase());
      expect(term, category).not.toMatch(/[(),.:]/);
    }

    // The clause closes Flux's leading sentence — "…, with no cast shadow, no text, and " — so it
    // opens with its own negation and brings no punctuation of its own.
    expect(statement, category).toMatch(/^no /);
    expect(statement, category).toBe(statement.trim().toLowerCase());
    expect(statement, category).not.toMatch(/[.;]/);
  });

  it('gives no two categories the same statement and terms', () => {
    // Shared *terms* are fine and deliberate — OBJECT and VEHICLE both fail as a `product shot`. What
    // this catches is an entry copied wholesale when a category is added, which is how the figure
    // vocabulary reached all nine in the first place. CHARACTER and CREATURE are the one pair that
    // genuinely shares a failure, and they are named rather than derived. The three body forms get the
    // same check per sheet in `sheetPlans/sheetClaims.test.ts`.
    const seen = new Map<string, SubjectCategory[]>();
    for (const category of SUBJECT_CATEGORIES) {
      const { negatives, statement } = CATEGORY_ASSEMBLY[category];
      const key = [statement, ...negatives].join(' | ');
      seen.set(key, [...(seen.get(key) ?? []), category]);
    }
    expect([...seen.values()].filter((categories) => categories.length > 1)).toEqual([
      ['CHARACTER', 'CREATURE'],
    ]);
  });
});
