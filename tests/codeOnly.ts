/**
 * The source with every comment blanked out, and newlines kept so a reported line still lands.
 *
 * Stripping comments is the whole difficulty, and skipping it is why this scan did not exist
 * before. Most of the hex in this repository is *prose* — a docblock explaining why the key colour
 * comes back visibly magenta and almost nowhere actually `#FF00FF` — so a scan that counted those
 * would report thirty-odd files on its first run and be switched off within the hour. A regex
 * cannot separate the two: `//` inside a string ends no comment, and this app writes URLs.
 *
 * Hence a character walk. Its one known gap is a regular-expression literal, which it reads as
 * division and whose body it therefore scans — that fails *safe*, reporting a hex rather than
 * missing one. A `'` in JSX text is the other ambiguity a walk without a parser cannot settle, so
 * `'` and `"` close at the end of their line as JavaScript's own grammar requires, which bounds
 * what a stray apostrophe can swallow to the line it sits on.
 */
export function codeOnly(source: string): string {
  let out = '';
  let index = 0;

  while (index < source.length) {
    const rest = source.slice(index);

    if (rest.startsWith('//')) {
      const end = source.indexOf('\n', index);
      const stop = end === -1 ? source.length : end;
      out += ' '.repeat(stop - index);
      index = stop;
      continue;
    }

    if (rest.startsWith('/*')) {
      const end = source.indexOf('*/', index + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += source.slice(index, stop).replace(/[^\n]/g, ' ');
      index = stop;
      continue;
    }

    const quote = rest[0];
    if (quote === "'" || quote === '"' || quote === '`') {
      let cursor = index + 1;
      while (cursor < source.length && source[cursor] !== quote) {
        if (quote !== '`' && source[cursor] === '\n') break;
        cursor += source[cursor] === '\\' ? 2 : 1;
      }
      const stop = Math.min(cursor + 1, source.length);
      out += source.slice(index, stop);
      index = stop;
      continue;
    }

    out += quote ?? '';
    index += 1;
  }

  return out;
}
