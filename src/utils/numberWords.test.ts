import { describe, expect, it } from 'vitest';
import { spellNumber, spellNumberCapitalised } from './numberWords.ts';

/**
 * The spellings the sheet plans actually reach for, pinned by value.
 *
 * Every one of these was written out by hand in a plan's prose before it was derived, so this is
 * the table that says the derivation still produces the words those sentences shipped with — a
 * `sixteen` that came back `six-teen` would be caught here rather than in a compiled prompt.
 */
const PLAN_FIGURES: readonly (readonly [number, string])[] = [
  [6, 'six'],
  [8, 'eight'],
  [9, 'nine'],
  [10, 'ten'],
  [11, 'eleven'],
  [12, 'twelve'],
  [14, 'fourteen'],
  [16, 'sixteen'],
  [21, 'twenty-one'],
  [26, 'twenty-six'],
];

describe('spellNumber', () => {
  it.each(PLAN_FIGURES)('spells %i as the plans state it', (count, word) => {
    expect(spellNumber(count)).toBe(word);
  });

  it('names one to nineteen rather than composing them', () => {
    // The teens are the range English does not build out of parts, so a composed `ten-four` is the
    // characteristic failure of a table that starts its arithmetic too early.
    expect(spellNumber(1)).toBe('one');
    expect(spellNumber(13)).toBe('thirteen');
    expect(spellNumber(19)).toBe('nineteen');
  });

  it('hyphenates a compound and leaves a round ten bare', () => {
    expect(spellNumber(20)).toBe('twenty');
    expect(spellNumber(21)).toBe('twenty-one');
    expect(spellNumber(34)).toBe('thirty-four');
    expect(spellNumber(90)).toBe('ninety');
    expect(spellNumber(99)).toBe('ninety-nine');
  });

  it('refuses what it cannot name, rather than returning a digit into a sentence', () => {
    // Every caller is a module-level constant, so the throw is an import-time failure. A silent
    // fallback would put `100` in the middle of a sentence written to carry a word.
    expect(() => spellNumber(0)).toThrow(RangeError);
    expect(() => spellNumber(-1)).toThrow(RangeError);
    expect(() => spellNumber(100)).toThrow(RangeError);
    expect(() => spellNumber(2.5)).toThrow(RangeError);
    expect(() => spellNumber(Number.NaN)).toThrow(RangeError);
  });
});

describe('spellNumberCapitalised', () => {
  it('opens a sentence with the same word', () => {
    expect(spellNumberCapitalised(12)).toBe('Twelve');
    expect(spellNumberCapitalised(14)).toBe('Fourteen');
  });

  it('capitalises the first letter alone, so a compound does not become a title', () => {
    expect(spellNumberCapitalised(26)).toBe('Twenty-six');
  });

  it('refuses exactly what the lower-case form refuses', () => {
    expect(() => spellNumberCapitalised(0)).toThrow(RangeError);
  });
});
