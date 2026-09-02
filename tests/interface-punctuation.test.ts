import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { scannableSources } from '../scripts/sourceFiles.ts';

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
const SOURCES = scannableSources().filter((path) => {
  if (!/\.tsx?$/.test(path)) return false;
  if (/\.test\.tsx?$/.test(path)) return false;
  // `src/test/` is the harness the suites are built from — doubles, fixtures and decoders. Nothing
  // in it renders, which is the same ground the colocated `*.test.ts` files stand on.
  return !relative(process.cwd(), path).split(sep).includes('test');
});

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

/**
 * The marks a `.tsx` file can spell as an HTML entity, which JSX decodes on the way to the reader.
 *
 * Two components already write `&rsquo;` and `&ldquo;` in JSX text, so the straight counterparts are
 * the next thing somebody types — and a scan reading the source characters alone would never see
 * them. They are put back into the marks they stand for, which is what the reader gets.
 */
const HTML_MARKS: readonly (readonly [RegExp, string])[] = [
  [/&(?:apos|#0*39|#x0*27);/gi, "'"],
  [/&(?:quot|#0*34|#x0*22);/gi, '"'],
];

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

/** The two exclusions decided by where a string is authored rather than by what it says. */
type Silence = 'sql' | 'class';

/**
 * Why the marks beneath this node are syntax, or `null` where they are punctuation.
 *
 * Both answers are about the *authoring position*, which is what lets them be decided without
 * guessing at prose. A statement bound to a `*_SQL` name is parsed by SQLite, whose own string
 * delimiter is the straight apostrophe. A class string is read by Tailwind, which spells an
 * arbitrary value with straight quotes inside brackets — matched by where the string is bound rather
 * than by that bracket syntax, because a run of `[…]` is also how an array prints, and a rule loose
 * enough to blank one would excuse a straight-quoted array in a sentence.
 */
function silencedBy(node: ts.Node): Silence | null {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    if (node.name.text.endsWith('_SQL')) return 'sql';
    if (/_CLASS(ES)?$/.test(node.name.text)) return 'class';
  }
  if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && node.name.text === 'className') {
    return 'class';
  }
  return null;
}

/** The text of a node that carries authored characters, or `null` for everything else. */
function authoredText(node: ts.Node): string | null {
  if (ts.isJsxText(node)) return node.text;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) return node.text;
  return null;
}

/**
 * The offset the node's own text begins at.
 *
 * `getStart` skips leading trivia, which for a JSX text node is the indentation and the newlines
 * that are *part of* `node.text` — so anchoring there and then counting lines within the text
 * reports an offence several lines below where it was written. A JSX text node has no delimiter to
 * step over, so its full start is its text's start.
 */
function textStart(node: ts.Node, tree: ts.SourceFile): number {
  return ts.isJsxText(node) ? node.pos : node.getStart(tree);
}

/** Every straight mark one file writes into a string the reader reaches. */
function offencesIn(path: string, tally: Tally): Offence[] {
  const source = readFileSync(path, 'utf8');
  const file = relative(process.cwd(), path).split(sep).join('/');
  const component = path.endsWith('.tsx');
  tally[component ? 'components' : 'modules'] += 1;
  const tree = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    component ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const offences: Offence[] = [];

  const visit = (node: ts.Node, silence: Silence | null): void => {
    const reason = silence ?? silencedBy(node);
    const text = authoredText(node);

    if (text !== null) {
      tally.strings += 1;
      const start = tree.getLineAndCharacterOfPosition(textStart(node, tree)).line + 1;
      const decoded = component
        ? HTML_MARKS.reduce((carried, [entity, mark]) => carried.replace(entity, mark), text)
        : text;
      for (const [offset, raw] of decoded.split('\n').entries()) {
        const line = raw.trim();
        if (!/['"]/.test(line)) continue;
        if (reason !== null) {
          tally[reason] += 1;
          continue;
        }
        if (isJsonDocument(line)) {
          tally.json += 1;
          continue;
        }
        offences.push({ where: `${file}:${String(start + offset)}`, line });
      }
    }

    ts.forEachChild(node, (child) => {
      visit(child, reason);
    });
  };

  visit(tree, null);
  return offences;
}

const TALLY: Tally = { sql: 0, class: 0, json: 0, modules: 0, components: 0, strings: 0 };
const OFFENCES = SOURCES.flatMap((path) => offencesIn(path, TALLY));

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
