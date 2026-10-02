import type { BackgroundKey } from '../../types/rendering.ts';

/**
 * The words that break an icon's drawing, held against every catalogue look by `iconCatalogue.test.ts`
 * and warned of in the reader's own entries by `customIconWarnings` — one list for both, so the rules
 * the catalogue was written to and the rules a reader is warned of cannot drift apart.
 *
 * Each protects the output from a rule elsewhere in the prompt that outranks an inventory line, so a
 * look naming one asks for something the sheet will not draw, or draws and then loses.
 */

/**
 * Words that put a person, or part of one, in a drawing — what an entry declaring no `figure` may not
 * name. ICON's exclusions forbid a hand or a figure no entry names, so a look naming one without the
 * declaration asks for what the exclusion removes.
 */
export const FIGURE_WORDS =
  /\b(?:hands?|faces?|heads?|busts?|figures?|persons?|people|torsos?|fingers?|arms?)\b/i;

/**
 * Objects that carry markings of their own: numbered faces, letterforms and open writing surfaces.
 * Section 0 forbids text on the sheet, and a model fills a dial, a gauge or a keypad with numerals and a
 * rune with a letterform. `letteringTermIn` catches the words that ask for lettering outright; these are
 * the objects that bring it with them.
 */
export const LETTERING_OBJECTS =
  /\b(?:runes?|runic|dials?|gauges?|gauged|keypads?|inscrib\w*|stopwatch(?:es)?|clock ?faces?)\b/i;

/** A capitalised acronym — “EMP”, “LEDs” — which a model may letter onto the object it names. */
export const ACRONYM = /\b[A-Z]{2,}s?\b/;

/** A scroll, which a model writes on unless it is rolled. */
export const SCROLL = /\bscrolls?\b/i;

/** What makes a scroll safe: rolled shut, its writing out of sight. */
export const ROLLED = /\brolled\b/i;

/**
 * The words a look could name each key's colour in, matched from the start of a word so `blackened` and
 * `pinkish` count, or none for a key that has no colour.
 *
 * Section 0 forbids drawing anything in or near the key colour, and the Quantise tab keys out every pixel
 * in its reach wherever it sits, so a look naming the key's colour — white sparks on a white key — asks
 * for a hole. Pink is magenta's because neon pink as a model reads it, `#FF10F0` or `#FF6EC7`, lies inside
 * the magenta key's reach, measured in `iconCatalogue.test.ts`.
 */
export const KEY_COLOUR_WORDS: Readonly<Record<BackgroundKey, readonly string[]>> = {
  MAGENTA_FF00FF: ['magenta', 'fuchsia', 'pink'],
  PURE_WHITE: ['white'],
  PURE_BLACK: ['black'],
  TRANSPARENT: [],
};

/** The first of `words` that `text` names from the start of a word, in any case, or `undefined`. */
export function wordNamed(text: string, words: readonly string[]): string | undefined {
  return words.find((word) => new RegExp(String.raw`\b${word}`, 'i').test(text));
}
