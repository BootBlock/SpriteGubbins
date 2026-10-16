/** A private-use character standing in for a `"` that opens or closes no quotation. */
const HIDDEN = '';

/**
 * Every quotation in a run of comment prose: each span between typographic double quotes, and each
 * between straight ones.
 *
 * Both kinds are read because this repository writes both: the ChatGPT entry quotes OpenAI's help
 * page in straight quotes and the image tool's guide in typographic ones. A straight `"` inside a
 * backtick span or inside a typographic quotation belongs to that span — the image tool's guide is
 * quoted as “set `background: "transparent"` to request one” — so it is hidden before the straight
 * quotes are paired, and put back in the quotation it belongs to.
 *
 * Single quotes are not read. `’` is this repository's apostrophe as well as its closing single
 * quote, so a pairing would run from one possessive to the next.
 */
export function quotationsIn(prose: string): string[] {
  const masked = prose.replaceAll(/`[^`]*`|“[^”]*”/g, (span) => span.replaceAll('"', HIDDEN));
  return [...masked.matchAll(/“([^”]+)”|"([^"]+)"/g)].map((match) =>
    (match[1] ?? match[2] ?? '').replaceAll(HIDDEN, '"'),
  );
}
