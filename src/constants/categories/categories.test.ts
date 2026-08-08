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

/** Every field set to its `pick`th option, wrapping round the shorter pools. */
function subjectAt(category: SubjectCategory, pick: number): SubjectDefinition {
  const subject = { ...defaultSubjectFor(category) };
  for (const field of CATEGORY_OPTIONS[category].fields) {
    subject[field.key] = field.options[pick % field.options.length] ?? '';
  }
  return subject;
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
