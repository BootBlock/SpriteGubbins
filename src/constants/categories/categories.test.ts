import { describe, expect, it } from 'vitest';
import { generatePrompt } from '../../utils/promptCompiler.ts';
import { SUBJECT_CATEGORIES, SUBJECT_FIELD_KEYS } from '../../types/subject.ts';
import type { SubjectCategory, SubjectDefinition } from '../../types/subject.ts';
import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../output/index.ts';
import { CATEGORY_OPTIONS, defaultSubjectFor } from './index.ts';

/**
 * The option pools are the app's vocabulary, and an option that does not reach the compiled prompt is
 * a suggestion that quietly does nothing.
 *
 * The combo boxes are unfiltered, so anything a user types works whether or not it is pooled — which
 * is exactly why a *pooled* value going nowhere would be invisible: the field would look answered and
 * the generator would never be told. These tests are the check that every offered value is live.
 */

/**
 * A word of an option that opens in lower case — every match is a title-case violation.
 *
 * A word is a run of letters and digits, so both halves of a hyphenated compound are checked
 * separately: `Pocket-Sized` is the pools' own spelling and `Over-sized` was the odd one out. The
 * lookbehind is what makes the run's *first* character the one under test, and it excludes the two
 * positions that legitimately hold a lower-case letter — after another letter or digit (the rest of
 * any word, and the `s` of `(20s)`), and after an apostrophe (the `s` of `Surgeon’s`).
 *
 * A word opening with a digit is not matched at all and needs no exemption: `#06B6D4`, `16-Bit` and
 * `1940s` have no case to get wrong.
 */
const LOWER_CASE_WORD = /(?<![\p{L}\p{N}'’])\p{Ll}[\p{L}\p{N}]*/gu;

/** Every field set to its `pick`th option, wrapping round the shorter pools. */
function subjectAt(category: SubjectCategory, pick: number): SubjectDefinition {
  const subject = { ...defaultSubjectFor(category) };
  for (const field of CATEGORY_OPTIONS[category].fields) {
    subject[field.key] = field.options[pick % field.options.length] ?? '';
  }
  return subject;
}

/**
 * Section 1's `- Label: value` lines, in the order the compiled prompt carries them.
 *
 * Read off the rendered prompt rather than off the template, because what is being checked is what a
 * model is actually shown. The list runs from the `- Category:` line to the first line that is not a
 * bullet, which is the paragraph beneath it.
 */
function subjectLines(prompt: string): readonly string[] {
  const lines = prompt.split('\n');
  const start = lines.findIndex((line) => line.startsWith('- Category: '));
  const bullets: string[] = [];
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (!line.startsWith('- ')) break;
    bullets.push(line);
  }
  return bullets;
}

/** A section 1 label, with the qualifier the template adds to the two colour lines removed. */
function labelOf(bullet: string): string {
  const [label = ''] = bullet.slice('- '.length).split(': ');
  return label.replace(/ \((?:dominant|highlights only)\)$/, '');
}

describe.each(SUBJECT_CATEGORIES)('%s options', (category) => {
  const { fields } = CATEGORY_OPTIONS[category];

  it('defines each of the sixteen fields exactly once', () => {
    expect(fields.map((field) => field.key).sort()).toEqual([...SUBJECT_FIELD_KEYS].sort());
  });

  it('offers no blank or duplicated option, and explains every field', () => {
    for (const field of fields) {
      expect(field.tooltip.length, `${category}.${field.key} has no tooltip`).toBeGreaterThan(0);
      expect(field.options.length, `${category}.${field.key} has an empty pool`).toBeGreaterThan(0);
      expect(new Set(field.options).size, `${category}.${field.key} repeats an option`).toBe(
        field.options.length,
      );
      for (const option of field.options) {
        expect(option.trim(), `${category}.${field.key} offers a blank option`).not.toBe('');
      }
    }
  });

  it('writes every option in the app’s own casing, and shouts only the sentinel', () => {
    // The defect this pins: the `anatomy` pool of all nine categories was written in full capitals,
    // so `STANDARD HUMANOID` sat one row under `Athletic & Slender` in the same column of the
    // studio. A pooled value is user-facing copy *and* the text section 1 carries verbatim, so its
    // casing is read twice and has to be the app's own.
    //
    // `NONE` is the one value that may shout, wherever it is offered: a sentinel standing for "this
    // subject has none" rather than a description of anything, which is why `additional_anatomy`
    // names it as a constant and why the two `clothing` pools offering no harness and no holster
    // spell the same word. Exempted by value for that reason, not by field.
    for (const field of fields) {
      const shouting = field.options.filter(
        (option) => option !== NO_ADDITIONAL_ANATOMY && /\p{Lu}/u.test(option) && !/\p{Ll}/u.test(option),
      );
      expect(shouting, `${category}.${field.key} offers an all-capitals option`).toEqual([]);
    }
  });

  it('capitalises every word of every option, outside the exclusions pool', () => {
    // The defect this pins: the pools disagreed about title case in the one place a reader sees both
    // spellings at once. `Relic of Lost Era` sat forty-seven lines from `Nautical Age Of Sail` in the
    // same file, and `Over-sized Colossal` shared a pool with `Pocket-Sized Device` — two spellings
    // of one rule, in a list scanned in a single glance and carried verbatim into section 1.
    //
    // The house style is that every word takes a capital, which is what the large majority already
    // did: eighteen mid-title function words were capitalised against five that were not. It is also
    // the half of the choice a test can hold, because there is no judgement in it — the alternative
    // needs a hand-kept list of function words and still cannot tell a preposition from the particle
    // of a phrasal verb (`Frozen Over`, `Charging / Spooling Up`, both capitalised either way).
    //
    // `exclusions` is the one pool exempt, and by field rather than by value: each of its options is
    // a negative statement rather than a name ("No ground terrain tiles, no characters"), so sentence
    // case is what it means to write.
    for (const field of fields) {
      if (field.key === 'exclusions') continue;

      for (const option of field.options) {
        const lowered = [...option.matchAll(LOWER_CASE_WORD)].map((match) => match[0]);
        expect(lowered, `${category}.${field.key} option "${option}" opens a word in lower case`).toEqual([]);
      }
    }
  });

  it('labels section 1 in its own vocabulary, and in nobody else’s', () => {
    // The defect this pins: section 1 used to write its labels into the template, so one category's
    // words reached all six. A vehicle's *Service Condition* arrived as "Age / Vitality", its turret
    // under "Anatomy base" and its vision slit under "Head & sensory features" — every value right
    // and every label from the category the sixteen keys were first designed for, in the section the
    // prompt calls the sole authority for the subject's design.
    //
    // Checked against the *rendered* prompt rather than the template, because what matters is what a
    // model is shown, and per label rather than by grepping for the retired ones: a label this
    // category does not define is the failure, whichever category it came from.
    const byLabel = new Map(fields.map((field) => [field.label, field.key]));
    expect(byLabel.size, `${category} gives two fields the same label`).toBe(fields.length);

    // The second option of every pool rather than the defaults, because `additional_anatomy` defaults
    // to `NONE` and that line is deliberately omitted — which would leave the one field whose label
    // section 4 reads as well untested.
    const subject = subjectAt(category, 1);
    const bullets = subjectLines(generatePrompt(category, subject, DEFAULT_OUTPUT_CONFIG));

    // The category line, then one per field except `exclusions`, which section 8 carries instead.
    expect(bullets[0]).toBe(`- Category: ${category}`);
    expect(bullets.length).toBe(fields.length);

    for (const bullet of bullets.slice(1)) {
      const label = labelOf(bullet);
      const key = byLabel.get(label);
      expect(key, `section 1 labels a line "${label}", which ${category} does not define`).toBeDefined();
      expect(key, 'section 8 carries the exclusions, not section 1').not.toBe('exclusions');
      if (key === undefined) continue;
      // `additional_anatomy` is the one field rendered from its parse rather than passed through, so
      // a pooled value with no multiplier comes back carrying the `×1` the inventory counts it by.
      if (key === 'additional_anatomy') expect(bullet).toContain(subject[key]);
      else expect(bullet.endsWith(`: ${subject[key]}`), `"${bullet}" does not state ${key}`).toBe(true);
    }
  });

  it('writes every offered option into the compiled prompt verbatim', () => {
    // One prompt per index rather than one per option: each pass sets every field at once, and the
    // longest pool decides how many passes it takes for every option in every field to have had a
    // turn. Cheaper than a prompt per option and just as complete.
    const passes = Math.max(...fields.map((field) => field.options.length));

    for (let pick = 0; pick < passes; pick += 1) {
      const subject = subjectAt(category, pick);
      const prompt = generatePrompt(category, subject, DEFAULT_OUTPUT_CONFIG);

      for (const field of fields) {
        const value = subject[field.key];
        // `NONE` is the one pooled value that deliberately says nothing: it states that there is no
        // additional anatomy, and the way to state that is to omit the line. Every other option —
        // including a `NONE` in the clothing pool — is expected to appear.
        if (field.key === 'additional_anatomy' && value === NO_ADDITIONAL_ANATOMY) continue;
        expect(prompt, `${category}.${field.key} option "${value}" never reaches the prompt`).toContain(
          value,
        );
      }
    }
  });
});
