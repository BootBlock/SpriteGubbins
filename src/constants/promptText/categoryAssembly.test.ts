import { describe, expect, it } from 'vitest';
import { CATEGORY_OPTIONS } from '../categories/index.ts';
import { PROMPT_TEMPLATE } from '../promptTemplate.ts';
import { CATEGORY_SHEET_PLANS } from '../sheetPlans/modes.ts';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { DIRECTION_LISTS } from './camera.ts';
import { CATEGORY_ASSEMBLY } from './categoryAssembly.ts';
import { CATEGORY_AUDIT_TEXT, CATEGORY_EXCLUSION_TEXT, CATEGORY_GUARD_TEXT } from './exclusions.ts';

/**
 * Whether each category's assembly wording negates anything its own prompt requires, and whether its
 * five forms hold to the shapes the sections they land in expect.
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
 * still wrong, because every one of them *is* a structure and the category's own section 4 guard
 * says so. Whether a term names the sheet's subject in a synonym is a judgement, recorded per entry
 * in the record itself.
 *
 * **The word-by-word opposition covers the two wrapper forms and deliberately not the three body
 * ones.** A negative prompt reads a phrase as its words, so a weighted `frame` suppresses every entry
 * on an EFFECT sheet — but "the frames overlaid into one composited picture" is a clause stating a
 * relation between them, and banning that relation bans nothing the sheet requires. Running the terms
 * rule over the body forms would fail exactly the wording those sections need: TERRAIN's would lose
 * "tiles" and "landscape", which is the half its negative channel already had to give up. What the
 * body forms get instead is a shape check per section, and a check that neither restates the
 * per-category line it sits beside.
 */
describe('CATEGORY_ASSEMBLY', () => {
  /** The contract's own nouns, which belong to no category and are required by all nine. */
  const HEADING_WORDS = wordsIn((PROMPT_TEMPLATE.match(/^#+ .*$/gm) ?? []).join(' '));

  function wordsIn(text: string): ReadonlySet<string> {
    return new Set(text.toLowerCase().match(/[a-z]+/g) ?? []);
  }

  /**
   * Every run of `length` consecutive words in a text, punctuation and case discarded.
   *
   * Words rather than characters, so that a comma moved or a hyphen dropped cannot hide a phrase
   * from the comparison — which is the shape the duplication takes when one of a pair is edited.
   */
  function runsOf(text: string, length: number): ReadonlySet<string> {
    const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
    return new Set(
      words.slice(0, Math.max(0, words.length - length + 1)).map((_, at) => {
        return words.slice(at, at + length).join(' ');
      }),
    );
  }

  /**
   * Every word this category's own prompt will state as a requirement.
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

  /**
   * A term's word against a required one, singular and plural counted as the same word.
   *
   * `stacked layers` is why: section 1's field is *Secondary Layer* and section 4 asks for "whatever
   * secondary layer the subject named", both singular, against a plural term — and a generator reads
   * the stem, not the inflection. Crude on purpose; the alternative is a stemmer, and every word this
   * has to catch differs by an `s` or a `-ed`.
   */
  function sameWord(term: string, required: string): boolean {
    const stem = (word: string): string => word.replace(/(ed|es|s)$/, '');
    return term === required || stem(term) === stem(required);
  }

  it.each(SUBJECT_CATEGORIES)('negates nothing %s’s own prompt requires', (category) => {
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

  it.each(SUBJECT_CATEGORIES)('shapes %s’s three body forms for the sections they land in', (category) => {
    const { audit, exclusion, instruction } = CATEGORY_ASSEMBLY[category];

    // Section 4's closes the paragraph that has just banned merging, substituting, padding and
    // omitting, so it is a whole sentence and it tells the generator what not to draw. The tail is
    // the load-bearing half: a reference key drawn beside the grid is the commonest way an otherwise
    // correct sheet arrives with the finished thing on it.
    expect(instruction, category).toMatch(/^Do not draw .+\.$/);
    expect(instruction, category).toContain('anywhere on the sheet, including as a reference or key.');

    // Section 8's is a bullet under "Absent from the image entirely:", beside four fixed ones — so a
    // noun phrase in sentence case, not an instruction and not a clause.
    expect(exclusion, category).toMatch(/^[A-Z][^.]*\.$/);
    expect(exclusion, category).not.toMatch(/^Do not /);

    // Section 9's completes "…no entry arrives with a neighbouring piece attached, and …", which the
    // template closes with its own full stop.
    expect(audit, category).toBe(audit.trim());
    expect(audit, category).toMatch(/^[a-z]/);
    expect(audit, category).not.toMatch(/[.;]/);
  });

  it.each(SUBJECT_CATEGORIES)('does not restate the per-category line %s already carries', (category) => {
    // Section 8 lists this category's exclusion bullet directly above its assembly one, and section 9
    // runs the two checks two items apart — so a phrase shared between a pair is one claim made
    // twice in one list, which is what a reader resolves as two separate demands. TERRAIN is why the
    // check exists: it was the one category whose assembly failure had already reached the body,
    // written into both of those records because they were the only per-category lines that could
    // hold it, and both gave the wording up when this record gained somewhere to put it.
    //
    // Four words rather than three, because "on the sheet and" and its like are connective tissue
    // every one of these lines is built from; four in a row is a phrase somebody wrote twice.
    const { audit, exclusion, instruction } = CATEGORY_ASSEMBLY[category];
    for (const [form, neighbour, where] of [
      [instruction, CATEGORY_GUARD_TEXT[category], 'the section 4 guard'],
      [exclusion, CATEGORY_EXCLUSION_TEXT[category], 'the section 8 exclusion line'],
      [audit, CATEGORY_AUDIT_TEXT[category], 'the section 9 category check'],
    ] as const) {
      const shared = [...runsOf(form, 4)].filter((run) => runsOf(neighbour, 4).has(run));
      expect(shared, `${category} repeats ${where}: “${shared.join('”, “')}”`).toEqual([]);
    }
  });

  it('gives no two categories the same whole failure', () => {
    // Shared *terms* are fine and deliberate — OBJECT and VEHICLE both fail as a `product shot`. What
    // this catches is an entry copied wholesale when a category was added, which is how the figure
    // vocabulary reached all nine in the first place, in all five of these forms at once. CHARACTER
    // and CREATURE are the one pair that genuinely shares a failure, and they are named rather than
    // derived.
    const seen = new Map<string, SubjectCategory[]>();
    for (const category of SUBJECT_CATEGORIES) {
      const { audit, exclusion, instruction, negatives, statement } = CATEGORY_ASSEMBLY[category];
      const key = [statement, negatives.join(', '), instruction, exclusion, audit].join(' | ');
      seen.set(key, [...(seen.get(key) ?? []), category]);
    }
    expect([...seen.values()].filter((categories) => categories.length > 1)).toEqual([
      ['CHARACTER', 'CREATURE'],
    ]);
  });
});
