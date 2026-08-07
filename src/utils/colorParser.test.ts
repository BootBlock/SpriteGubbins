import { describe, expect, it } from 'vitest';
import { parseColorFromText } from './colorParser.ts';
import { COLOR_HEX_MAP } from '../constants/colors.ts';
import { CATEGORY_OPTIONS } from '../constants/categories/index.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';

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
    expect(parseColorFromText('deep obsidian')).toBe(COLOR_HEX_MAP['obsidian']);
    expect(parseColorFromText('PEARL WHITE & CHROME')).toBe(COLOR_HEX_MAP['white']);
  });

  /*
   * The four cases below are the rules that replaced the original's insertion-order substring
   * scan. Each fixes a specific way that scan produced a wrong or missing swatch.
   */
  it('takes the first colour named in the text', () => {
    // These fields are written most-important-first, so the leading colour is the subject's
    // dominant one. (The original returned whichever name sat earliest in COLOR_HEX_MAP, which
    // made this gold and the next one purple.)
    expect(parseColorFromText('Deep Obsidian & Gold')).toBe(COLOR_HEX_MAP['obsidian']);
    expect(parseColorFromText('Obsidian Black & Deep Purple')).toBe(COLOR_HEX_MAP['obsidian']);
  });

  it('resolves a multi-word name rather than the shorter name inside it', () => {
    // 'plasma cyan' was unreachable before — 'cyan' sat earlier in the map and always won.
    expect(parseColorFromText('Plasma Cyan')).toBe(COLOR_HEX_MAP['plasma cyan']);
    expect(parseColorFromText('Toxic Acid Green')).toBe(COLOR_HEX_MAP['acid green']);
  });

  it('does not match a colour name buried inside another word', () => {
    // Each of these previously produced a confident, wrong swatch: 'tan' inside Titanium and
    // Tank, 'red' inside Weathered and Armoured.
    expect(parseColorFromText('Titanium Grey & Black')).toBeNull();
    expect(parseColorFromText('Heavy Armoured Tank')).toBeNull();
    expect(parseColorFromText('Weathered Grey Stone & Oak')).toBeNull();
    expect(parseColorFromText('Carbon Fibre & Titanium')).toBeNull();
  });

  it('still resolves an inflected colour name', () => {
    // Whole-word matching would otherwise lose these three shipped options entirely.
    expect(parseColorFromText('Rusty Iron & Moss')).toBe(COLOR_HEX_MAP['rust']);
    expect(parseColorFromText('Rusted Iron & Olive')).toBe(COLOR_HEX_MAP['rust']);
    expect(parseColorFromText('Rusting Scrap & Wiring')).toBe(COLOR_HEX_MAP['rust']);
  });

  it('resolves real option strings the app ships', () => {
    expect(parseColorFromText('Matte Charcoal Black & Gunmetal')).toBe(COLOR_HEX_MAP['charcoal']);
    expect(parseColorFromText('Royal Navy & Deep Silver')).toBe(COLOR_HEX_MAP['navy']);
    expect(parseColorFromText('Crimson Red & Black')).toBe(COLOR_HEX_MAP['crimson']);
    expect(parseColorFromText('Emerald Green & Tan')).toBe(COLOR_HEX_MAP['emerald']);
    expect(parseColorFromText('Dark Stained Wood & Vermilion Red #EA580C')).toBe('#EA580C');
  });

  it('leaves every entry in COLOR_HEX_MAP reachable by its own name', () => {
    // 'plasma cyan' was dead data under the old scan. Nothing should be dead now.
    for (const [name, hex] of Object.entries(COLOR_HEX_MAP)) {
      expect(parseColorFromText(name), `"${name}" cannot be matched by its own name`).toBe(hex);
    }
  });

  it('returns a well-formed hex, or nothing, for every option the app ships', () => {
    // A sweep over the whole option pool: no input may crash the parser, and anything it does
    // return must be a real colour. Guards a future map entry with a malformed value.
    for (const category of SUBJECT_CATEGORIES) {
      for (const field of CATEGORY_OPTIONS[category].fields) {
        for (const option of field.options) {
          const parsed = parseColorFromText(option);
          if (parsed !== null) expect(parsed).toMatch(/^#[0-9a-fA-F]{3,6}$/);
        }
      }
    }
  });
});
