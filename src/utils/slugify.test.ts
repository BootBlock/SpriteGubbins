import { describe, expect, it } from 'vitest';
import { slugify } from './slugify.ts';

describe('slugify', () => {
  it('lower-cases and joins words with hyphens', () => {
    expect(slugify('Wall Top Corners')).toBe('wall-top-corners');
  });

  it('collapses runs of punctuation into one separator', () => {
    expect(slugify('Feet or claws: relaxed / spread')).toBe('feet-or-claws-relaxed-spread');
  });

  it('trims the ends rather than leaving them hanging', () => {
    // A facing arrives as `right side`, and a piece of anatomy as whatever a reader typed — both
    // reach a file name, where a leading or trailing hyphen is noise nobody chose.
    expect(slugify(' ×2 Demon Horn ')).toBe('2-demon-horn');
  });

  it('keeps digits, which a name may legitimately be made of', () => {
    expect(slugify('16-Bit')).toBe('16-bit');
  });

  it('comes back empty rather than as a string of hyphens', () => {
    // The caller decides what an unusable name becomes; this does not invent one.
    expect(slugify('—/—')).toBe('');
  });
});
