import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scannableSources } from '../scripts/sourceFiles.ts';
import { ARCHITECTURE_SECTIONS } from '../src/constants/architecture.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../src/constants/output/index.ts';
import { SUBJECT_FIELD_KEYS } from '../src/types/subject.ts';

/**
 * The counts the Architecture tab states, re-derived from the tree it is describing.
 *
 * That tab renders `ARCHITECTURE_SECTIONS` verbatim, and its own docblock says why the words have
 * to be true: a specification tab documenting an architecture the app no longer has is worse than
 * no tab at all. Two of its figures had stopped being true anyway — six Zustand stores against
 * thirteen on disk, and twenty-five output settings against twenty-eight on `OutputConfig` — and
 * neither growth had any reason to open this file. A correction pass had already been made once, in
 * August 2026, and it rewrote the very sentence that carried the twenty-five.
 *
 * So the fix is not a third correction. Both numbers are counts of something the tree already
 * knows, and this is what reads them back: adding a store or an output setting fails here, naming
 * the sentence whose figure it moved. The tab beside it does the same thing for the version number,
 * in `src/components/tabs/AboutSection.test.tsx`, and for the same reason.
 *
 * **It pins the figures, not the wording.** A sentence rewritten around the same true count still
 * has to keep the phrase these assertions look for, which is deliberate: the phrase is short, and
 * an author changing it is an author reading the count as they go.
 */

/** English number words, as the sections spell them. The tables cover every count up to 99. */
const UNITS = [
  'zero',
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

const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'] as const;

function unitWord(value: number): string {
  const word = UNITS[value];
  if (word === undefined) throw new Error(`No word for ${value}: extend UNITS.`);
  return word;
}

/** `13` becomes `thirteen`, `28` becomes `twenty-eight`. Prose spells a count; this is how. */
function spell(count: number): string {
  if (!Number.isInteger(count) || count < 0 || count > 99) {
    throw new Error(`spell() covers 0 to 99, and was asked for ${count}: extend the tables.`);
  }
  if (count < 20) return unitWord(count);

  const tens = TENS[Math.floor(count / 10)] ?? '';
  const unit = count % 10;
  return unit === 0 ? tens : `${tens}-${unitWord(unit)}`;
}

/** Where a store is filed, once the walk's absolute paths are made relative and POSIX. */
const STORES = 'src/stores/';

/**
 * What marks a file in there as a Zustand store: it imports `create` from the library.
 *
 * Reading the *binding* instead — `= create<` — would have read a spelling rather than a fact. A
 * store written `create(persist<FooState>(…))`, or one whose type arrives as an annotation on the
 * constant, makes a store and binds no such text, and that difference fails **open**: the count
 * stays where it was, the prose still matches it, and the drift this suite exists to catch goes
 * straight past. The import is the one thing every store has to do, however it is written, and
 * an import nothing calls does not survive the lint gate.
 */
const MAKES_A_STORE = /import\s*\{[^}]*\bcreate\b[^}]*\}\s*from\s*'zustand'/;

/**
 * Every Zustand store in the app, by path.
 *
 * Read off disk rather than imported, because importing them is what the assertion is trying not
 * to depend on: a store nobody has wired up yet is still a store the sentence is counting, and a
 * barrel file listing them would be one more hand-kept list to drift. The walk is
 * `scannableSources()`, this repository's one answer to what counts as source — a second walk
 * here would be a second answer, and it would be the shallower of the two, blind to a store filed
 * a directory further down.
 *
 * The two helpers filed beside the stores — the dial snapshot and its setters — import nothing
 * from the library, which is what keeps them out. The colocated tests do import it, and are kept
 * out by name: a suite exercising a store is not one.
 */
function zustandStores(): string[] {
  return scannableSources()
    .map((file) => relative(process.cwd(), file).split(sep).join('/'))
    .filter((path) => path.startsWith(STORES) && !path.endsWith('.test.ts'))
    .filter((path) => MAKES_A_STORE.test(readFileSync(path, 'utf8')))
    .sort();
}

/** Whichever section states `phrase`, or `undefined` where none of them does. */
function sectionStating(phrase: string): string | undefined {
  return ARCHITECTURE_SECTIONS.find((section) => section.body.includes(phrase))?.heading;
}

describe('the figures the Architecture tab states', () => {
  it('counts the Zustand stores the app is built on', () => {
    const stores = zustandStores();
    const phrase = `${spell(stores.length)} independent Zustand stores`;

    expect(
      sectionStating(phrase),
      `No Architecture section says “${phrase}”. src/stores/ holds ${stores.length}: ${stores.join(', ')}.`,
    ).toBeDefined();
  });

  it('counts the subject fields and the output settings the compiler is a function of', () => {
    const settings = Object.keys(DEFAULT_OUTPUT_CONFIG);
    const phrase = `${spell(SUBJECT_FIELD_KEYS.length)} subject fields and the ${spell(settings.length)} output settings`;

    expect(
      sectionStating(phrase),
      `No Architecture section says “${phrase}”. SUBJECT_FIELD_KEYS has ${SUBJECT_FIELD_KEYS.length} entries and OutputConfig has ${settings.length}.`,
    ).toBeDefined();
  });
});
