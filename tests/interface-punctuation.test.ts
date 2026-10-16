import { describe, expect, it } from 'vitest';
import { AUTHORED_SOURCES, authoredStrings } from './authoredStrings.ts';

/**
 * Every string the app writes is set with typographic marks, and this is where the *interface* half
 * of that is held.
 *
 * CLAUDE.md asks the shipped copy for `’` and `“ ”`, and the checks that existed each held one
 * surface: `src/constants/tooltips/tooltips.test.ts` walks the guidance records, and
 * `src/utils/promptCompiler.test.ts` sweeps the compiled prompt. Neither reaches a toast, a
 * live-region sentence, a `disabledReason` or a phrase assembled in `utils/colorReduction.ts`, and
 * seven such strings had drifted into straight quotes — including the two preset libraries, which
 * quoted the reader’s own preset name two different ways.
 *
 * So this walks the source rather than any list: a string is checked because it is written in
 * `src/`, not because somebody remembered to name the file it sits in. That inverts the problem into
 * deciding what to leave out, which is the design work — and **every exclusion below says the mark
 * is syntax**, never that a string reaches nobody. That second ground was tried first, on `Error`
 * messages, and it is false here: `hooks/useImageDownload.ts` puts `error.message` straight into a
 * toast, and `workers/autoTuneSession.ts` puts it into the paragraph under the Auto button. An
 * `Error` message is therefore held to the rule like anything else. Each exclusion is counted, and a
 * count of zero fails: one that stops suppressing anything has quietly become a hole.
 */

/**
 * The floor under the walk, split by extension because one number cannot hold both.
 *
 * A single count is the shape this started as, and at 200 against a real 481 it would have sat green
 * through the loss of every `.tsx` in the app — which is the half carrying the JSX text this suite
 * was written to reach. Each figure is set just under what the tree holds, so losing a directory
 * fails rather than merely shrinking a total nothing was measuring.
 */
const FEWEST = { modules: 340, components: 100, strings: 11_000 } as const;

/**
 * A line that is a whole JSON document, which is the one place in the app a straight quote is
 * correct: `constants/promptTemplate.ts` shows a model the manifest it must return, and a curly
 * quote in a key produces a document that does not parse.
 *
 * Decided by parsing rather than by matching a shape, so it cannot excuse a sentence that merely
 * opens and closes like one. `promptCompiler.test.ts` excuses the same line by a regex over the
 * compiled prompt; that is a different question — whether a *rendered* line is the example — and
 * these two deliberately do not share an answer, since a regex loose enough to survive
 * interpolation would be far too loose to run over every string in `src/`.
 */
function isJsonDocument(line: string): boolean {
  if (!line.startsWith('{') || !line.endsWith('}')) return false;
  try {
    return typeof (JSON.parse(line) as unknown) === 'object';
  } catch {
    // Not JSON, so not the example — the parse is the test, and its failure is the answer.
    return false;
  }
}

/** How often each exclusion actually suppressed a straight mark, so none of them can go vacuous. */
interface Tally {
  sql: number;
  class: number;
  json: number;
  modules: number;
  components: number;
  strings: number;
}

/** A string the reader sees, carrying a mark the app does not write. */
interface Offence {
  readonly where: string;
  readonly line: string;
}

/**
 * Every straight mark one file writes into a string the reader reaches.
 *
 * A mark under a `Silence` is syntax: SQLite's string delimiter is the straight apostrophe and its
 * quoted identifier the straight double quote, and Tailwind spells an arbitrary value with straight
 * quotes inside brackets. The SQL exclusion is counted like the others, so it fails once no statement
 * needs a quote, and it is then deleted rather than kept for later. Rewording SQL to dodge this suite
 * is not the answer.
 */
function offencesIn(path: string, tally: Tally): Offence[] {
  tally[path.endsWith('.tsx') ? 'components' : 'modules'] += 1;
  const offences: Offence[] = [];

  for (const { file, line: start, text, silence } of authoredStrings(path)) {
    tally.strings += 1;
    for (const [offset, raw] of text.split('\n').entries()) {
      const line = raw.trim();
      if (!/['"]/.test(line)) continue;
      if (silence !== null) {
        tally[silence] += 1;
        continue;
      }
      if (isJsonDocument(line)) {
        tally.json += 1;
        continue;
      }
      offences.push({ where: `${file}:${String(start + offset)}`, line });
    }
  }
  return offences;
}

const TALLY: Tally = { sql: 0, class: 0, json: 0, modules: 0, components: 0, strings: 0 };
const OFFENCES = AUTHORED_SOURCES.flatMap((path) => offencesIn(path, TALLY));

describe('the punctuation the interface ships with', () => {
  it.each([
    ['modules', FEWEST.modules],
    ['components', FEWEST.components],
    ['strings', FEWEST.strings],
  ] as const)('reads all of src/, counted in %s', (key, floor) => {
    expect(TALLY[key]).toBeGreaterThanOrEqual(floor);
  });

  it.each([
    ['a SQL statement', 'sql'],
    ['a class string', 'class'],
    ['the JSON manifest example', 'json'],
  ] as const)('still finds %s to excuse', (_what, key) => {
    // An exclusion nothing lands in is indistinguishable from one that has stopped matching, and the
    // second is a hole. Whichever of the two it turns out to be, it wants looking at.
    expect(TALLY[key]).toBeGreaterThan(0);
  });

  it('writes every string a reader sees with typographic marks', () => {
    const report = OFFENCES.map((offence) => `${offence.where}  ${offence.line}`).join('\n');
    expect(OFFENCES, `a straight quote reaches the reader:\n${report}`).toEqual([]);
  });
});
