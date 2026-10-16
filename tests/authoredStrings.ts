import { relative, sep } from 'node:path';
import * as ts from 'typescript';
import { scannableSources, sourceText } from '../scripts/sourceFiles.ts';

/**
 * Every string the app writes, parsed out of `src/` rather than listed, for the suites that hold the
 * copy to a house rule.
 *
 * `interface-punctuation.test.ts` asks whether a string carries a straight quote and
 * `interface-spelling.test.ts` whether it carries an American spelling. They ask of the same strings,
 * so they ask through one walk: a second copy would be a second answer to "is this a string the
 * reader sees", and the two would drift apart the first time one of them learned a new node kind.
 *
 * **Parsed with the compiler** because a string cannot be delimited by hand — an apostrophe in a line
 * comment, a template's `${…}` or a regex literal each end a scanner's idea of a string somewhere the
 * compiler does not.
 */
export const AUTHORED_SOURCES = scannableSources().filter((path) => {
  if (!/\.tsx?$/.test(path)) return false;
  if (/\.test\.tsx?$/.test(path)) return false;
  // `src/test/` is the harness the suites are built from — doubles, fixtures and decoders. Nothing
  // in it renders, which is the same ground the colocated `*.test.ts` files stand on.
  return !relative(process.cwd(), path).split(sep).includes('test');
});

/**
 * Where a string is authored as input to a parser rather than as words for a reader.
 *
 * Both are decided by the *authoring position*, which is what lets them be settled without guessing
 * at prose. A statement bound to a `*_SQL` name is parsed by SQLite. A class string is read by
 * Tailwind, whose vocabulary is CSS's own — straight quotes inside an arbitrary value, and American
 * words such as `center` and `gray` in its utility names. It is matched by where the string is bound
 * rather than by what it looks like, because a rule loose enough to recognise a class list by shape
 * would excuse a sentence that merely resembles one.
 */
export type Silence = 'sql' | 'class';

/** One string literal, template part or run of JSX text, as the reader gets it. */
export interface AuthoredString {
  /** The file, relative to the root and written with `/`. */
  readonly file: string;
  /** The 1-based line the text begins on. */
  readonly line: number;
  readonly text: string;
  /** Why the text is syntax rather than copy, or `null` where it is copy. */
  readonly silence: Silence | null;
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

/** Every string one file writes, in source order, each with the silence it was authored under. */
export function authoredStrings(path: string): AuthoredString[] {
  const file = relative(process.cwd(), path).split(sep).join('/');
  const component = path.endsWith('.tsx');
  const tree = ts.createSourceFile(
    path,
    sourceText(path),
    ts.ScriptTarget.Latest,
    true,
    component ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const strings: AuthoredString[] = [];

  const visit = (node: ts.Node, silence: Silence | null): void => {
    const reason = silence ?? silencedBy(node);
    const text = authoredText(node);
    if (text !== null) {
      strings.push({
        file,
        line: tree.getLineAndCharacterOfPosition(textStart(node, tree)).line + 1,
        text: component
          ? HTML_MARKS.reduce((carried, [entity, mark]) => carried.replace(entity, mark), text)
          : text,
        silence: reason,
      });
    }
    ts.forEachChild(node, (child) => {
      visit(child, reason);
    });
  };

  visit(tree, null);
  return strings;
}
