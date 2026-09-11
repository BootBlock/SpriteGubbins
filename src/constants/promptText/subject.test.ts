import { describe, expect, it } from 'vitest';
import { categoryProseFor } from '../../test/categoryProse.ts';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import { SCALE_UNIT_TEXT } from './subject.ts';

/**
 * The words of the unit phrase that have to be grounded — everything but the articles and the
 * quantifiers, which are the sentence's own scaffolding rather than the category's vocabulary.
 */
const SCAFFOLDING = new Set(['a', 'an', 'one', 'the', 'of', 'full', 'whole']);

function nounsOf(unit: string): readonly string[] {
  return unit.split(' ').filter((word) => !SCAFFOLDING.has(word));
}

/**
 * What the sheet *is*, as opposed to what is on it.
 *
 * A unit is a thing the sheet draws or the subject it draws parts of, never the surface itself — and
 * every one of these words is written all over the plans, so the grounding check above would pass a
 * unit reading `the whole sheet` without noticing. It is a rule rather than a list of rejected
 * values: the three nouns are the app's own names for the delivered image, from the template's
 * `sheet`, the aspect wording's `canvas` and `page`.
 */
const THE_SURFACE = new Set(['sheet', 'canvas', 'page']);

describe('SCALE_UNIT_TEXT', () => {
  it('prices every category in a noun that category’s own sheets use', () => {
    // The defect this map removes: `a full figure` was the unit on all thirteen, and "figure" is a
    // word ten of them never write anywhere. Matched with a leading boundary only, so a plan writing
    // the plural — `tiles`, `widgets` — still grounds the singular the phrase is stated in.
    //
    // **FONT is the one category this cannot hold, and the reason is worth knowing**: its digit sheet
    // writes "a column of figures", so `figure` grounds there in the *numeric* sense and the old flat
    // wording would survive this check on the very category the defect was reported against. No word
    // test can tell those two senses apart; what holds FONT is the literal assertion on the compiled
    // line in `promptCompiler.test.ts`, which is why that one names the sentence rather than the map.
    for (const category of SUBJECT_CATEGORIES) {
      const prose = categoryProseFor(category);
      const nouns = nounsOf(SCALE_UNIT_TEXT[category]);
      // Without this the loop below asserts nothing on a unit built only of scaffolding — `the whole`
      // is two words and no noun, and would pass silently.
      expect(nouns.length, `${category}: the unit is all scaffolding and names nothing`).toBeGreaterThan(0);

      for (const noun of nouns) {
        expect(THE_SURFACE.has(noun), `${category}: “${noun}” is the sheet, not a thing on it`).toBe(false);
        // `String.raw`, because a plain template literal reads \b as a backspace: the regex then
        // matches nothing and every category fails at once, which is loud but for the wrong reason.
        const grounded = new RegExp(String.raw`\b${noun}`, 'i').test(prose);
        expect(grounded, `${category}: “${noun}” is a word this category never writes`).toBe(true);
      }
    }
  });

  it('gives each unit a leading article, so it reads in both sentences that carry it', () => {
    // The phrase completes "… is roughly 64–96 pixels tall" and "… at the share of a full figure it
    // occupies", so it is a singular noun phrase carrying its own article and nothing else — no
    // leading capital, no trailing stop.
    for (const category of SUBJECT_CATEGORIES) {
      const unit = SCALE_UNIT_TEXT[category];
      expect(unit, category).toMatch(/^(a|an|one|the) [a-z]/);
      expect(unit.endsWith('.'), category).toBe(false);
    }
  });

  it('gives no two categories the same unit, which would be one of them priced in the other’s words', () => {
    const units = SUBJECT_CATEGORIES.map((category) => SCALE_UNIT_TEXT[category]);
    expect(new Set(units).size).toBe(units.length);
  });
});
