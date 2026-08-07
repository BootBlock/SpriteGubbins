import { describe, expect, it } from 'vitest';
import { parseColorFromText } from './colorParser.ts';
import { COLOR_HEX_MAP } from '../constants/colors.ts';

describe('parseColorFromText', () => {
  it('returns null for text with no colour in it', () => {
    expect(parseColorFromText('Bulky Plated Layers')).toBeNull();
    expect(parseColorFromText('Full Enclosed Helmet')).toBeNull();
  });

  it('returns null for empty text', () => {
    expect(parseColorFromText('')).toBeNull();
  });

  it('extracts a six-digit hex from surrounding words', () => {
    expect(parseColorFromText('Cyan Neon #06B6D4')).toBe('#06B6D4');
  });

  it('extracts a three-digit hex', () => {
    expect(parseColorFromText('accent #f0a highlight')).toBe('#f0a');
  });

  it('does not truncate a six-digit hex to three digits', () => {
    // The alternation is ordered 6-then-3 for exactly this reason; reversing it would match
    // '#06b' here and preview a completely different colour.
    expect(parseColorFromText('#06b6d4')).toBe('#06b6d4');
  });

  it('prefers an explicit hex over a colour name in the same string', () => {
    // 'gold' maps to #f59e0b, but the author wrote a hex — that is the colour they meant.
    expect(parseColorFromText('Polished Gold #123456')).toBe('#123456');
  });

  it('maps a colour name case-insensitively', () => {
    expect(parseColorFromText('Rusty Iron & Moss')).toBe(COLOR_HEX_MAP['rust']);
    expect(parseColorFromText('PEARL WHITE & CHROME')).toBe(COLOR_HEX_MAP['white']);
  });

  /*
   * The three cases below pin behaviour inherited verbatim from the application being migrated.
   * They are quirks, not intentions — but they decide which swatch a user sees beside a saved
   * preset, so they are asserted rather than quietly corrected. Changing COLOR_HEX_MAP's order
   * or match strategy should fail here first, as a decision, not surface as a mystery in the UI.
   */
  it('lets an earlier map entry shadow a later, more specific one', () => {
    // 'cyan' precedes 'plasma cyan', so the specific entry is unreachable by that name...
    expect(parseColorFromText('Plasma Cyan')).toBe(COLOR_HEX_MAP['cyan']);
    // ...whereas 'acid green' precedes 'green', so that pair resolves the specific way round.
    expect(parseColorFromText('Toxic Acid Green')).toBe(COLOR_HEX_MAP['acid green']);
  });

  it('takes the first name in map order, not the most prominent word', () => {
    // 'gold' is earlier in the map than 'obsidian', so it wins regardless of word order.
    expect(parseColorFromText('Deep Obsidian & Gold')).toBe(COLOR_HEX_MAP['gold']);
  });

  it('matches a colour name inside a longer word', () => {
    // Substring, not word-boundary: 'tan' is found inside both of these.
    expect(parseColorFromText('Heavy Armoured Tank')).toBe(COLOR_HEX_MAP['tan']);
    expect(parseColorFromText('Titanium Grey & Black')).toBe(COLOR_HEX_MAP['tan']);
  });

  it('resolves real option strings the app ships', () => {
    // Spot-checks across the category pools, so a reordering that broke swatch previews would
    // fail here rather than in the UI.
    expect(parseColorFromText('Matte Charcoal Black & Gunmetal')).toBe(COLOR_HEX_MAP['charcoal']);
    expect(parseColorFromText('Royal Navy & Deep Silver')).toBe(COLOR_HEX_MAP['navy']);
    expect(parseColorFromText('Dark Stained Wood & Vermilion Red #EA580C')).toBe('#EA580C');
  });
});
