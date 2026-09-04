/**
 * A count as the word prose spells it with — `spellNumber(14)` is `fourteen`.
 *
 * The sheet plans state counts in prose as well as in their entries: a group's intro says how many
 * tiles carry the boundary, an outro says how many components a sheet would be short. Those
 * sentences used to be written out by hand beside entries that summed to the same figure, which is
 * the arithmetic-stated-twice that `ComponentEntry.count` exists to have ended one layer down. They
 * are derived now, and this is what turns the sum back into the word the sentence needs.
 *
 * **The range stops at 99 and the refusal is loud.** Every figure a plan spells is a group total or
 * a small sum of one, and `PRACTICAL_COMPONENT_CEILING` is 43 — so a hundred is already past what
 * one generation can return, and a plan asking for one has a bigger problem than its wording. A
 * silent fallback to digits would put a numeral in the middle of a sentence written for a word, so
 * the function throws instead: every caller is a module-level constant, which makes the failure an
 * import-time one rather than something that reaches a prompt.
 *
 * Pure, as everything in this directory is.
 */

/** One to nineteen, which English names rather than composes. */
const UNITS = [
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
] as const;

/** Twenty to ninety, which the units above compose against with a hyphen. */
const TENS = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'] as const;

/**
 * The count as a lower-case word — `fourteen`, `twenty-six`.
 *
 * A hyphenated compound above twenty, which is the spelling CLAUDE.md's option pools already use
 * and the one the plans were written in before they derived it.
 */
export function spellNumber(count: number): string {
  const word = wordFor(count);
  if (word === undefined) {
    throw new RangeError(`spellNumber cannot spell ${String(count)}: it takes a whole number from 1 to 99`);
  }
  return word;
}

/**
 * The same word opening a sentence — `Fourteen tiles carrying the boundary…`.
 *
 * Beside {@link spellNumber} rather than left to the call site, because three plans open a sentence
 * with a derived count and a hand-rolled uppercase at each of them is the same phrase spelled three
 * ways. It capitalises the first letter alone, so a compound stays `Twenty-six` rather than becoming
 * a title.
 */
export function spellNumberCapitalised(count: number): string {
  const word = spellNumber(count);
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** The word, or `undefined` where the count is not a whole number this can name. */
function wordFor(count: number): string | undefined {
  if (!Number.isInteger(count) || count < 1 || count > 99) return undefined;
  if (count < 20) return UNITS[count - 1];

  const tens = TENS[Math.floor(count / 10) - 2];
  // `undefined` at a multiple of ten, where the index is -1 and there is no unit to hyphenate on.
  const unit = UNITS[(count % 10) - 1];
  if (tens === undefined) return undefined;
  return unit === undefined ? tens : `${tens}-${unit}`;
}
