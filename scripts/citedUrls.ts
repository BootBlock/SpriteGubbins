/** Punctuation that ends a sentence or a markup span around a URL rather than belonging to it. */
const TRAILING = new Set(['.', ',', ';', ':', '!', '?', "'", '"', '`', '*', '’', '”']);

/** Each closing bracket a URL may end with, and the opening bracket that balances it. */
const PAIRS: Readonly<Record<string, string>> = { ')': '(', ']': '[' };

/** How many times `character` occurs in `text`. */
function count(text: string, character: string): number {
  return text.split(character).length - 1;
}

/**
 * One URL as a comment writes it, with the prose punctuation after it removed.
 *
 * A bracket stays when the URL opens it as well: Black Forest Labs' reference pages are named
 * `…flux2-[pro]`, and a comment closing a parenthesis after a link writes `(see https://…)`. So a
 * closing bracket is part of the URL exactly when the URL holds more openers than closers without
 * it.
 */
function trimmed(url: string): string {
  let text = url;
  for (;;) {
    const last = text.at(-1) ?? '';
    const opener = PAIRS[last];
    if (TRAILING.has(last)) text = text.slice(0, -1);
    else if (opener !== undefined && count(text, opener) < count(text, last)) text = text.slice(0, -1);
    else return text;
  }
}

/** Every distinct `http` or `https` URL in a run of comment prose, in the order it first appears. */
export function citedUrls(prose: string): string[] {
  return [...new Set((prose.match(/https?:\/\/\S+/g) ?? []).map(trimmed))];
}
