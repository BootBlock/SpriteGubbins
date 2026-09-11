import { resolve } from 'node:path';
import { codeOnly } from '../scripts/codeOnly.ts';
import { sourceText } from '../scripts/sourceFiles.ts';
import { STOCK_BREAKPOINTS_PX } from './columnSplit.ts';
import { importGraph } from './importGraph.ts';

/**
 * Whether anything a split renders decides its layout by the page's width.
 *
 * **Two questions can be asked inside a column, and neither of them is the page's width.** How wide
 * the box is belongs to a container query. Whether the box is a column at all belongs to the split's
 * own variant — `PromptPreview` lifting its height cap once the sticky column exists is that
 * question, and it was asked on `lg` while the column answered on `studio:`, so across the 96px
 * between them the cap was gone with no column to replace it and the panel ran to 10,010px (#191). A
 * stock breakpoint is right about neither, and neither is another split's token.
 *
 * **What is read is a class token, not a match somewhere in the text.** Each string literal is split
 * into tokens, each token into its variants, and each variant is compared whole. That is what catches
 * `min-lg:` and `not-lg:`, which Tailwind emits as the same media query as `lg:` and its negation, and
 * what keeps a container query's `@lg:` from being mistaken for one. Comments are blanked first,
 * because the reasoning for a class is written beside it and names the variant it replaced.
 */

/** What a split renders, and every class in it that decides a layout by the page's width. */
interface PageWidthClasses {
  /** Every file the walk reached, so a caller can show it reached the panel it is about. */
  readonly files: readonly string[];
  /** Each offending class, as `file: class`. */
  readonly found: readonly string[];
}

/**
 * Every class `splitFile` renders that is prefixed with a page breakpoint other than `variant`.
 *
 * The walk starts at the split file, whose root has to be the grid — `split-page-width.test.ts`
 * asserts it of each — so everything reached is rendered inside one of its columns.
 */
export function pageWidthClassesIn(splitFile: string, variant: string): PageWidthClasses {
  const breakpoints = [...Object.keys(STOCK_BREAKPOINTS_PX), ...themeBreakpoints()].filter(
    (name) => name !== variant,
  );
  const files = [...importGraph(splitFile).keys()];
  const found = files.flatMap((file) =>
    pageWidthClassesInSource(codeOnly(sourceText(resolve(process.cwd(), file))), breakpoints).map(
      (token) => `${file}: ${token}`,
    ),
  );
  return { files, found };
}

/**
 * Every class token in `code` carrying one of `breakpoints` as a variant, in any spelling of it.
 *
 * **A string holding an unconditional `fixed` is passed whole.** A fixed box is laid out against a
 * viewport rather than against the column its component sits in, so the page's width is the right
 * thing for it to measure — the toast inside the detached preview window is the case in the tree, and
 * the viewport it measures is that window's own. The exemption is per string, and a string inside a
 * `${…}` is a string of its own, so a `fixed` that only applies on one branch exempts only that
 * branch.
 */
export function pageWidthClassesInSource(code: string, breakpoints: readonly string[]): string[] {
  return classStrings(code)
    .map(classTokens)
    .filter((tokens) => !tokens.some((token) => token.replace(/^!|!$/g, '') === 'fixed'))
    .flat()
    .filter((token) => variantsOf(token).some((variant) => isPageWidthVariant(variant, breakpoints)));
}

/** The `--breakpoint-*` tokens the theme declares, by name. */
function themeBreakpoints(): string[] {
  const css = sourceText(resolve(process.cwd(), 'src/index.css'));
  return [...css.matchAll(/--breakpoint-([\w-]+):/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
}

/**
 * Whether one variant asks the page's width: a breakpoint, its `min-`, `max-` or `not-` spelling, or an
 * arbitrary `min-[…]` / `max-[…]` query. A container query starts with `@` and never matches.
 */
export function isPageWidthVariant(variant: string, breakpoints: readonly string[]): boolean {
  const query = variant.replace(/^!/, '').replace(/^not-/, '');
  return (
    breakpoints.some((name) => query === name || query === `min-${name}` || query === `max-${name}`) ||
    /^(?:min|max)-\[[^\]]*\]$/.test(query)
  );
}

/**
 * A token's variants: every segment before its last colon, splitting only outside brackets, so an
 * arbitrary variant such as `[&:hover]` stays one segment.
 */
export function variantsOf(token: string): string[] {
  const variants: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < token.length; index += 1) {
    const character = token.charAt(index);
    if (character === '[') depth += 1;
    else if (character === ']') depth = Math.max(0, depth - 1);
    else if (character === ':' && depth === 0) {
      variants.push(token.slice(start, index));
      start = index + 1;
    }
  }
  return variants;
}

/**
 * A string split into class tokens.
 *
 * Quotes, braces, angle brackets and `=` split as well as whitespace. A real class string holds none
 * of them outside an arbitrary value, where splitting leaves the variants in front intact; what they
 * guard against is the string a stray apostrophe in JSX text opens, which runs to the end of its line
 * and can swallow a `className="…"` whole.
 */
function classTokens(text: string): string[] {
  return text.split(/[\s"'`{}<>=]+/).filter((token) => token !== '');
}

/**
 * Every string literal in comment-blanked `code`: each quoted string, each template literal's own
 * text, and each string inside a template's `${…}` as one of its own.
 *
 * `'` and `"` close at the end of their line, as `codeOnly` reads them and as JavaScript's grammar
 * requires. Its gap is `codeOnly`'s too: a regular-expression literal is read as code, so a quote
 * inside one opens a string — bounded to the line for `'` and `"`, and for a backtick it runs to the
 * next backtick, where the text between is still read as tokens rather than skipped.
 */
export function classStrings(code: string): string[] {
  const strings: string[] = [];
  readCode(code, 0, false, strings);
  return strings;
}

/** Reads code from `start`, collecting strings, to the end — or to the `}` closing an interpolation. */
function readCode(code: string, start: number, interpolation: boolean, strings: string[]): number {
  let depth = 0;
  let index = start;
  while (index < code.length) {
    const character = code.charAt(index);
    if (character === '"' || character === "'") {
      index = readQuoted(code, index, strings);
    } else if (character === '`') {
      index = readTemplate(code, index, strings);
    } else if (interpolation && character === '{') {
      depth += 1;
      index += 1;
    } else if (interpolation && character === '}') {
      if (depth === 0) return index + 1;
      depth -= 1;
      index += 1;
    } else {
      index += 1;
    }
  }
  return index;
}

function readQuoted(code: string, start: number, strings: string[]): number {
  const quote = code.charAt(start);
  let index = start + 1;
  while (index < code.length && code.charAt(index) !== quote && code.charAt(index) !== '\n') {
    index += code.charAt(index) === '\\' ? 2 : 1;
  }
  strings.push(code.slice(start + 1, index));
  return index + 1;
}

function readTemplate(code: string, start: number, strings: string[]): number {
  let text = '';
  let index = start + 1;
  while (index < code.length && code.charAt(index) !== '`') {
    if (code.startsWith('${', index)) {
      text += ' ';
      index = readCode(code, index + 2, true, strings);
    } else {
      const step = code.charAt(index) === '\\' ? 2 : 1;
      text += code.slice(index, index + step);
      index += step;
    }
  }
  strings.push(text);
  return index + 1;
}
