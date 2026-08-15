import { describe, expect, it } from 'vitest';
import { DIRECTION_LISTS } from './camera.ts';
import { CATEGORY_SHEET_PLANS } from '../sheetPlans/modes.ts';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { CATEGORY_ASSEMBLY } from './categoryAssembly.ts';

/**
 * Whether each category's assembly terms negate anything its own section 4 requires.
 *
 * Checked against the sheet plans rather than against a second copy of the expected terms, for the
 * reason `renderStyleSurface.test.ts` checks its terms against `RENDER_STYLE_TEXT`: the defect being
 * guarded is two statements of one fact disagreeing, and a test listing the answers would be written
 * from whatever misunderstanding produced them. The plans are where a category says what it is made
 * of, so they are the honest opposition — a plan that grows an entry named for a term takes that
 * term out of the negative channel in the same edit.
 *
 * **This is the mechanical half of the rule, and the rule is wider than it.** `complete structure`
 * passes here, because BUILDING's entries spell their components "wall bay" and "roof section" — and
 * it is still wrong, because every one of them *is* a structure and the category's own section 4
 * guard says so in as many words. What this catches is a term contradicting an entry outright;
 * whether a term names the sheet's subject in a synonym is still a judgement, recorded per entry in
 * the record itself.
 */
describe('CATEGORY_ASSEMBLY', () => {
  /**
   * Every word section 4 will actually list for a category, over every mode and every direction set
   * its plans admit.
   *
   * Entry text alone, deliberately. A group's intro and a plan's assembly sentence both describe the
   * *assembled* result — "the complete vehicle at rest", "none of them a layer to be stacked on
   * another" — which is precisely what these terms exist to negate, so including them would fail the
   * terms for saying what they are for.
   */
  function componentWords(category: SubjectCategory): ReadonlySet<string> {
    const text = Object.values(CATEGORY_SHEET_PLANS[category])
      .flatMap((seriesFor) => Object.values(DIRECTION_LISTS).flatMap((facings) => seriesFor(facings)))
      .flatMap((plan) => plan.groups.flatMap((group) => group.entries.map((entry) => entry.text)))
      .join(' ');
    return new Set(text.toLowerCase().match(/[a-z]+/g) ?? []);
  }

  /**
   * Words carrying no claim, which a term may share with an entry.
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

  it.each(SUBJECT_CATEGORIES)('negates nothing %s’s own inventory lists', (category) => {
    const words = componentWords(category);
    const { negatives, statement } = CATEGORY_ASSEMBLY[category];

    // The statement is held to the same rule as the terms. Flux reads it positively rather than as a
    // negative prompt, but the bleed is the same one that made "no shadows" take the form shadow a
    // 3D render is built from — a claim a generator can attend to word by word either way.
    for (const claim of [...negatives, statement]) {
      for (const word of claim.toLowerCase().match(/[a-z]+/g) ?? []) {
        if (FUNCTION_WORDS.has(word)) continue;
        expect(words.has(word), `${category} negates “${word}”, which its own section 4 lists`).toBe(false);
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

  it('gives no two categories the same whole failure', () => {
    // Shared *terms* are fine and deliberate — OBJECT and VEHICLE both fail as a `product shot`. What
    // this catches is an entry copied wholesale when a category was added, which is how the figure
    // vocabulary reached all nine in the first place. CHARACTER and CREATURE are the one pair that
    // genuinely shares a failure, and they are named rather than derived.
    const seen = new Map<string, SubjectCategory[]>();
    for (const category of SUBJECT_CATEGORIES) {
      const { negatives, statement } = CATEGORY_ASSEMBLY[category];
      const key = `${statement} | ${negatives.join(', ')}`;
      seen.set(key, [...(seen.get(key) ?? []), category]);
    }
    expect([...seen.values()].filter((categories) => categories.length > 1)).toEqual([
      ['CHARACTER', 'CREATURE'],
    ]);
  });
});
