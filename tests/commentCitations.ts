import { relative, sep } from 'node:path';
import * as ts from 'typescript';
import { sourceText } from '../scripts/sourceFiles.ts';

/** One code-shaped name a comment cites in backticks, and where. */
export interface Citation {
  /** The file, relative to the root and written with `/`. */
  readonly file: string;
  readonly line: number;
  readonly name: string;
}

/** What {@link readCitations} finds: the names comments cite, and every name the code spells. */
export interface CitationReading {
  readonly citations: readonly Citation[];
  readonly spelled: ReadonlySet<string>;
}

/** A backticked span shaped like a name or a dotted path of names — `a` or `a.b.c`. */
const CITED = /`([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)`/gu;

/**
 * The extensions that make a dotted span a file rather than a member path — `oklab.ts`,
 * `humanoid_rig.tres`. A file citation is a different question from a name citation, and not this
 * reading's.
 */
const FILE_EXTENSION = /^(?:c?js|mjs|tsx?|jsx|json|md|css|html|ya?ml|gd|tres|png|svg|wasm|py)$/u;

/**
 * Whether a segment is shaped like code rather than like a word: a capital or an underscore after
 * its first character, which is what camelCase, PascalCase with a second hump and upper snake case
 * share. A lower-case word such as `despeckle` is a name, but it is also English, and a check that
 * read it could not tell a citation from a phrase set in code type.
 */
function isCodeShaped(segment: string): boolean {
  return /[A-Z_]/u.test(segment.slice(1));
}

/** Every word-shaped run in a literal's text: a string key or a template's words are spellings too. */
function wordsOf(text: string): string[] {
  return text.match(/[A-Za-z_$][\w$]*/gu) ?? [];
}

/** Whether a node is part of a JSDoc comment, which is read as comment text rather than walked. */
function isJsDoc(node: ts.Node): boolean {
  return node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode;
}

/**
 * Read one file's text for the code-shaped names its comments cite and every name its code spells,
 * adding both to `into`.
 *
 * **Parsed with the compiler, and read token by token.** A scanner run over the raw text reads a
 * `//` inside a template's text or a regex literal as a comment. Walking the tree's nodes instead
 * misses a comment whose next token starts no node — one on its own line before a closing brace —
 * so the walk goes down to the tokens, because every comment is trivia in front of one. The
 * trailing ranges are read at the same position because the compiler hands a comment on the same
 * line as the token before it to that token rather than the next.
 *
 * A spelling is an identifier, or a word inside a string, template or regex literal: a union
 * member such as `'SNAP'` or a template token such as `MIRRORED_SIDES` is a name the code states
 * without declaring it.
 */
export function readSource(
  file: string,
  text: string,
  into: { citations: Citation[]; spelled: Set<string> },
): void {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const read = new Set<number>();

  const cite = (range: ts.CommentRange): void => {
    if (read.has(range.pos)) return;
    read.add(range.pos);
    const comment = text.slice(range.pos, range.end);
    for (const match of comment.matchAll(CITED)) {
      const segments = (match[1] ?? '').split('.');
      if (segments.length > 1 && FILE_EXTENSION.test(segments.at(-1) ?? '')) continue;
      const line = source.getLineAndCharacterOfPosition(range.pos + match.index).line + 1;
      for (const name of segments.filter(isCodeShaped)) into.citations.push({ file, line, name });
    }
  };

  const visit = (node: ts.Node): void => {
    if (isJsDoc(node)) return;
    if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) into.spelled.add(node.text);
    else if (ts.isStringLiteralLike(node) || ts.isTemplateLiteralToken(node) || ts.isJsxText(node)) {
      for (const word of wordsOf(node.text)) into.spelled.add(word);
    } else if (ts.isRegularExpressionLiteral(node)) {
      // An escape is not part of a word: a pattern of \bOpenAPI\b spells OpenAPI, not bOpenAPI.
      for (const word of wordsOf(node.text.replaceAll(/\\./gu, ' '))) into.spelled.add(word);
    }

    if (node.kind <= ts.SyntaxKind.LastToken) {
      for (const range of ts.getLeadingCommentRanges(text, node.pos) ?? []) cite(range);
      for (const range of ts.getTrailingCommentRanges(text, node.pos) ?? []) cite(range);
    }
    for (const child of node.getChildren(source)) visit(child);
  };
  visit(source);
}

/** {@link readSource} over every one of `files`, each read once and named relative to the root. */
export function readCitations(files: readonly string[]): CitationReading {
  const reading = { citations: [] as Citation[], spelled: new Set<string>() };
  for (const path of files) {
    readSource(relative(process.cwd(), path).split(sep).join('/'), sourceText(path), reading);
  }
  return reading;
}
