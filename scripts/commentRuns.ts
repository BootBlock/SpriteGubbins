/** One run of comment prose, where it starts in its file, and the text with the comment syntax gone. */
export interface CommentRun {
  /** The run as written, comment syntax included. */
  readonly raw: string;
  /** The 1-based line the run starts on. */
  readonly line: number;
  /** The run's words with every `//`, `/*`, `*` and `*\/` removed and all whitespace collapsed. */
  readonly prose: string;
}

/** A docblock or block comment, or an unbroken block of `//` lines and the newline before it. */
const RUN = /\/\*[\s\S]*?\*\/|(?:^|\n)(?:[ \t]*\/\/[^\n]*\n?)+/g;

/** The comment syntax at the start of one line of a run, and the `*\/` that may end it. */
const LINE_SYNTAX = /^[ \t]*(?:\/\*\*?|\*(?!\/)|\/\/)?[ \t]?|[ \t]*\*\/[ \t]*$/g;

/**
 * Every contiguous run of comment prose in a module — one docblock, or one unbroken block of `//`
 * lines, blank comment lines included.
 *
 * **Deliberately the whole run rather than the paragraph inside it**, and that was measured rather
 * than assumed. A paragraph-scoped version of the check in `tests/model-citations.test.ts` passes or
 * fails on whether the author left a bare `//` before the closing URL, which is a formatting choice
 * this repository makes both ways — and Prettier will insert one. Reformatting a comment must not
 * change what a guard says about it. The run is the smallest unit that is stable against that and
 * still narrow enough to mean something: it is one entry's own argument, so a URL from the entry
 * above cannot satisfy it.
 *
 * The walk is a regular expression rather than a parser, so a `/*` or a `//` inside a string
 * literal starts a run here. Every consumer asks its question of comments that carry a URL, and a
 * string that happens to hold one is rare enough that the simpler walk is the one kept.
 */
export function commentRuns(source: string): CommentRun[] {
  return [...source.matchAll(RUN)].map((match) => {
    const leading = match[0].startsWith('\n') ? 1 : 0;
    const raw = match[0].slice(leading);
    return {
      raw,
      line: source.slice(0, match.index + leading).split('\n').length,
      prose: raw
        .split('\n')
        .map((line) => line.replaceAll(LINE_SYNTAX, ''))
        .join(' ')
        .replaceAll(/\s+/g, ' ')
        .trim(),
    };
  });
}
