/** The named character references vendor pages were measured to use, and what each stands for. */
const NAMED: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  times: '×',
};

/** One character reference decoded, or left as it is when it names nothing this table knows. */
function decoded(reference: string, body: string): string {
  if (body.startsWith('#x') || body.startsWith('#X')) {
    return String.fromCodePoint(parseInt(body.slice(2), 16));
  }
  if (body.startsWith('#')) return String.fromCodePoint(Number(body.slice(1)));
  return NAMED[body] ?? reference;
}

/**
 * The text a page's markup carries: every tag replaced by a space and every character reference
 * decoded.
 *
 * **What is inside a `<script>` is kept.** A documentation site built on a client framework ships
 * the article twice, once as markup and once as the data the framework hydrates it from, and a
 * site may ship it only the second way. Black Forest Labs' guides carry their card text in both,
 * escaped inside the script as JavaScript strings, so the common escapes are undone there too. A
 * quotation that matches a stray string in a script is a false pass, and for a sentence of several
 * words that is far less likely than the false miss dropping the scripts would cause.
 */
export function pageText(html: string): string {
  return html
    .replaceAll(/<(script|style)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_tag, _name, body: string) =>
      body
        .replaceAll(/\\u([0-9a-f]{4})/gi, (_escape, hex: string) => String.fromCharCode(parseInt(hex, 16)))
        .replaceAll(/\\[nrt]/g, ' ')
        .replaceAll(/\\(["'/\\])/g, '$1'),
    )
    .replaceAll(/<[^>]*>/g, ' ')
    .replaceAll(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, decoded);
}
