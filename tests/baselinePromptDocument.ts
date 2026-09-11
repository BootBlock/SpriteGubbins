import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * `docs/todo/baseline-prompt-new.md`, read the way the suites that hold it to the code need it.
 *
 * The document is a `📘 REFERENCE` record, and three of its sections make claims about the code
 * rather than arguing for it: §1 describes the placeholder forms the template uses, §2 the
 * parameters the compiler offers, and §3 is the template itself. §3 is compared character for
 * character by `prompt-template-mirror.test.ts`; §1 and §2 are read back by the
 * `baseline-prompt-*.test.ts` suites, and this is the parsing all of them share.
 *
 * **The parsing is deliberately shallow.** It finds a heading, the tables under it and the code
 * spans in a cell — which is all the document's claims are written in — and it throws, naming the
 * heading, when a block it expects is gone. A restructured section therefore fails the suite that
 * reads it rather than leaving an assertion to pass over nothing.
 */
export const BASELINE_PROMPT_DOC = 'docs/todo/baseline-prompt-new.md';

/**
 * The document's text, with line endings normalised on the way in so that a failure is always about
 * content.
 *
 * `.gitattributes` pins the checkout to LF, so what this defends against is an editor writing CRLF
 * back into the working tree, where a comparison would otherwise fail on line breaks git normalises
 * away again at commit.
 */
export function baselinePromptText(): string {
  return readFileSync(resolve(process.cwd(), BASELINE_PROMPT_DOC), 'utf8').replaceAll('\r\n', '\n');
}

/** How deep a Markdown heading line is, or 0 for a line that is not a heading. */
function headingDepth(line: string): number {
  return /^(#+) /.exec(line)?.[1]?.length ?? 0;
}

/**
 * The block under a nested run of headings, each found inside the one before it.
 *
 * A block runs from its heading to the next heading at the same depth or shallower. Each heading is
 * matched by how its line opens, so `### \`RENDER_STYLE\`` finds the subsection whatever follows the
 * parameter name in its title.
 */
export function documentBlock(...headings: readonly string[]): string {
  return headings.reduce((text, heading) => {
    const lines = text.split('\n');
    const start = lines.findIndex((line) => line.startsWith(heading));
    if (start < 0) {
      throw new Error(
        `${BASELINE_PROMPT_DOC} has no heading opening “${heading}” where a check expects one.`,
      );
    }

    const depth = headingDepth(heading);
    const end = lines.findIndex(
      (line, index) => index > start && headingDepth(line) > 0 && headingDepth(line) <= depth,
    );
    return lines.slice(start, end < 0 ? undefined : end).join('\n');
  }, baselinePromptText());
}

/** One Markdown table: its header cells and the cells of each body row. */
export interface MarkdownTable {
  readonly header: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

/** The row under a table's header, which is what marks the line above it as one. */
const SEPARATOR = /^\|(?:\s*:?-+:?\s*\|)+$/;

function cells(line: string): readonly string[] {
  return line
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

/** Every table in a block, in the order they appear. */
export function markdownTables(block: string): readonly MarkdownTable[] {
  const lines = block.split('\n');
  const tables: MarkdownTable[] = [];

  lines.forEach((line, index) => {
    if (!SEPARATOR.test(line)) return;
    const rows: (readonly string[])[] = [];
    for (let next = index + 1; lines[next]?.startsWith('|') === true; next += 1) {
      rows.push(cells(lines[next] ?? ''));
    }
    tables.push({ header: cells(lines[index - 1] ?? ''), rows });
  });

  return tables;
}

/** The contents of every code span in `text`, in order. */
export function codeSpans(text: string): readonly string[] {
  return [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? '');
}

/**
 * Prose as one line, because the document is hard-wrapped and Prettier rewraps it. An assertion that
 * breaks when a paragraph reflows is an assertion someone deletes.
 *
 * A callout's `> ` markers go too: the document states several of its current facts in blockquotes,
 * and a phrase wrapped across two of their lines otherwise reads back with a `>` in the middle. So do
 * fenced code blocks, which are not prose — and whose backtick runs, left in, pair with the backticks
 * of the code spans after them and shift every one of those spans by a character.
 */
export function oneLine(text: string): string {
  return text
    .replace(/^(`{3,}).*\n[\s\S]*?^\1[ \t]*$/gm, '')
    .replace(/^>[ \t]?/gm, '')
    .replace(/\s+/g, ' ');
}

/** `a, b and c` — how the document joins a list, with no serial comma. */
export function asProse(items: readonly string[]): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${String(items.at(-1))}`;
}
