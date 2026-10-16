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
 * Objects that carry markings of their own: numbered faces and letterforms. Section 0 forbids text on
 * the sheet, and a model fills a dial, a gauge or a keypad with numerals, a banknote with its value, a
 * dog tag with a name, a compass rose with its four letters, and a rune, a sigil or a glyph with a
 * letterform. `letteringTermIn` catches the words that ask for lettering outright; these are the objects
 * that bring it with them, however the look describes them.
 *
 * **A sigil and a glyph are banned beside the rune** (audit finding C3). Other categories draw a rune
 * or a sigil as carved ornament (`letteringMarks.ts`), but an icon is read at 16 to 32 px, where a
 * carved ornament and a letter are one shape, and ICON alone forbids every letterform. A look that wants
 * a mark names the picture it shows — a flame, a cracked ring — rather than a sigil of it.
 */
export const LETTERING_OBJECTS =
  /\b(?:runes?|runic|sigils?|glyphs?|dials?|gauges?|gauged|keypads?|inscrib\w*|stopwatch(?:es)?|clock ?faces?|banknotes?|dog ?tags?|compass ?roses?)\b/i;

/**
 * Surfaces made to be written on — a scroll, a map, a page, a calendar, a screen — which a model fills
 * with writing unless it is told the surface is empty. Unlike {@link LETTERING_OBJECTS} they are safe
 * where the same text calls them {@link UNWRITTEN}: a rolled scroll, a blank page, a plain calendar grid.
 *
 * A word that only shares the spelling is spared: a map pin, a star-chart crystal, a display case, a
 * peace sign and a life-sign are not surfaces anything is written on.
 */
export const WRITING_SURFACE =
  /\b(?:scrolls?|(?<!star-)charts?|maps?(?! pins?\b)|pages?|ledgers?|almanacs?|calendars?|clipboards?|tickets?|labels?|(?<!-|peace )signs?|monitors?|screens?|displays?(?! (?:cases?|pods?)\b))\b/i;

/** What makes a writing surface safe: rolled shut, closed, or stated to carry nothing. */
export const UNWRITTEN = /\b(?:rolled|closed|blank|plain|unmarked|wordless)\b/i;

/**
 * A capitalised acronym — “EMP”, “LEDs” — which a model may letter onto the object it names. Read from a
 * text with its hex colours taken out (`HEX_COLOUR`), since `#FFFFFF` is a colour, not letters.
 */
export const ACRONYM = /\b[A-Z]{2,}s?\b/;

/**
 * A colour written by hex, six digits or three — `#F97316`, `#FFF` — which a model paints rather than
 * letters, and which is measured against the key by value rather than by name.
 */
export const HEX_COLOUR = /#(?:[0-9a-f]{6}|[0-9a-f]{3})(?![\p{L}\p{N}])/giu;

/**
 * The words that name white, or a colour or finish a model paints at or next to it: chrome and silver
 * throw mirror highlights, and ivory, cream and frost lie inside the white key's reach outright
 * (`iconCatalogue.test.ts` measures them). A word cannot be measured against a key, so a text on the
 * white key names none of them (audit findings O2 and C2), and a colour it needs that light names its hex.
 */
export const NEAR_WHITE_WORDS: readonly string[] = [
  'white',
  'chrome',
  'silver',
  'pearl',
  'ivory',
  'snow',
  'cream',
  'bone',
  'bleached',
  'frost',
  'pale',
  'ice',
];

/**
 * The words a look could name each key's colour in, or none for a key that has no colour, read by
 * {@link wordNamed}.
 *
 * Section 0 forbids drawing anything in or near the key colour, and the Quantise tab keys out every pixel
 * in its reach wherever it sits, so a look naming the key's colour — white sparks on a white key — asks
 * for a hole. Pink is magenta's because neon pink as a model reads it, `#FF10F0` or `#FF6EC7`, lies inside
 * the magenta key's reach, measured in `iconCatalogue.test.ts`. White's are {@link NEAR_WHITE_WORDS},
 * because chrome on a white key is a hole wherever its highlights fall.
 */
export const KEY_COLOUR_WORDS: Readonly<Record<BackgroundKey, readonly string[]>> = {
  MAGENTA_FF00FF: ['magenta', 'fuchsia', 'pink'],
  PURE_WHITE: NEAR_WHITE_WORDS,
  PURE_BLACK: ['black'],
  TRANSPARENT: [],
};

/**
 * The endings a colour word keeps its meaning under — `blackened`, `pinkish`, `whitish`, `silvered`,
 * `pearlescent` — so {@link wordNamed} counts them and spares a word that only starts with the colour's
 * letters: `palette` and `paleo` are not `pale`, nor `iceberg` a colour.
 *
 * A word ending in “e” drops it only before an ending that starts with a vowel — `whitish`, `icy`,
 * `bony` — so the bare stem never counts: `bond` is not `bone`, nor `pal` `pale`.
 */
const COLOUR_ENDINGS = String.raw`(?:s|es|ed|n|ned|ened|ish|y|er|est|ness|escent)?`;

/** The endings after a final “e”: those that keep it, and those that take its place. */
const E_KEPT_ENDINGS = String.raw`(?:s|d|n|ned|ness|r|st)?`;
const E_DROPPED_ENDINGS = String.raw`(?:ish|y|ed|er|est|ened|escent)`;

/** The first of `words` that `text` names as a word or one of its colour endings, in any case, or `undefined`. */
export function wordNamed(text: string, words: readonly string[]): string | undefined {
  return words.find((word) => {
    const forms = word.endsWith('e')
      ? `(?:${word}${E_KEPT_ENDINGS}|${word.slice(0, -1)}${E_DROPPED_ENDINGS})`
      : `${word}${COLOUR_ENDINGS}`;
    return new RegExp(String.raw`\b${forms}\b`, 'i').test(text);
  });
}

/**
 * A count, as an inventory line states one or a reader would read one: `×` with a digit on either side
 * (`×5`, `5×`, `3×3`), or an `x` standing as a word of its own before a number (`x5`, `x 5`, `arrows
 * X10`) or straight after one (`5x`). Section 4 reads `×N` as N separate components, so a count in an
 * entry's own words asks the generator for that many drawings in one slot and shifts every cell and
 * every slot name after it. An `x` inside a word or between two numbers (`0x1F`, `4x4`) is not one.
 */
export const COUNT_MARKER = /\d\s*×|×\s*\d|(?<![\p{L}\p{N}])[xX]\s*\d|\d[xX](?![\p{L}\p{N}])/u;

/**
 * The dash an inventory line puts between an entry's role and its look (`Role ×1 — look`), and its en
 * dash twin: in a role or a state name it reads as the line's own separator, and the look appears to
 * start early.
 */
export const LINE_SEPARATOR = /[—–]/;

/** The words for red a look may colour a cross with — see {@link redCrossIn}. */
const RED_WORDS = new Set(['red', 'crimson', 'scarlet', 'vermilion']);

/**
 * The first clause of `text` that names a cross and a red together without calling the cross diagonal,
 * as written, or `undefined`. Drawn upright, and above all on white, a red cross is the emblem
 * international law reserves for medical services, which a game may not use; a medic's cross is green
 * or white, and a refusal's or a mute's mark is a diagonal cross.
 *
 * **Read a clause at a time, in any order**, because a look colours its cross before it (“a crimson
 * cross”), after it (“a cross of iron bars painted signal red”) or with words between, and one
 * pattern of “red” then “cross” let the second through. A clause ends at a comma, a semicolon, a colon
 * or a dash, so the red of one half of a two-state look does not reach the cross of the other. A
 * crosshair, crossed blades and a sash across a chest are not crosses; a cross-shaped part is one.
 */
export function redCrossIn(text: string): string | undefined {
  return text
    .split(/[,;:—–]/u)
    .find((clause) => {
      const words = clause.toLowerCase().split(/[^\p{L}]+/u);
      return (
        words.some((word) => word === 'cross' || word === 'crosses') &&
        words.some((word) => RED_WORDS.has(word)) &&
        !words.some((word) => word.startsWith('diagonal'))
      );
    })
    ?.trim();
}

/**
 * The first of `words` that `text` contains anywhere, inside a longer word too, in any case, or
 * `undefined` — the stricter reading the catalogue's own looks are held to, so `hotpink` and
 * `neonmagenta` count. A reader's text is read by {@link wordNamed}, which a word merely containing a
 * colour's letters does not trip, because a warning on `pinkerton` would be noise.
 */
export function wordWithin(text: string, words: readonly string[]): string | undefined {
  const lower = text.toLowerCase();
  return words.find((word) => lower.includes(word));
}
