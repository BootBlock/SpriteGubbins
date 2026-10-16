import { describe, expect, it } from 'vitest';
import { expandShortHex } from './expandShortHex.ts';

/** The CSS shorthand written out for `fromHex`, which reads six digits and nothing else. */
describe('expandShortHex', () => {
  it('doubles each digit of a three-digit hex, keeping its case', () => {
    expect(expandShortHex('#F0A')).toBe('#FF00AA');
    expect(expandShortHex('#fff')).toBe('#ffffff');
  });

  it('returns six digits, and anything that is not a three-digit hex, as it is', () => {
    expect(expandShortHex('#FAFAFA')).toBe('#FAFAFA');
    for (const text of ['F0A', '#F0', '#F0AB', '#GGG', '']) expect(expandShortHex(text)).toBe(text);
  });
});
