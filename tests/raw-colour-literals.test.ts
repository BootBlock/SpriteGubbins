import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { scannableSources } from './sourceFiles';

/**
 * Where a raw colour literal may appear in `src/`, and the rule that decides it.
 *
 * CLAUDE.md's design-token rule has two halves: a colour the app *paints with* comes from a token
 * in `index.css`, and a colour the app merely *names* is domain data that cannot be one. Only the
 * first half was ever checkable, and it was checkable by nobody — an unknown Tailwind utility emits
 * no CSS and raises no error, so a component that writes `#0a0c12` instead of `bg-foundry-900`
 * renders exactly as its author intended, and is caught in review or not at all.
 *
 * It was not caught. The rule was written naming two files as the whole of the exemption while six
 * paths held hundreds of literals, every one of them legitimate under the rule's own reasoning —
 * which is the state that stops a rule being read as a rule, and the reason this suite exists
 * rather than a longer paragraph.
 *
 * Each entry is a *kind* of domain colour rather than a file that happens to have one. A trailing
 * `/` exempts a directory, because the whole directory is that kind: a category's colour options
 * are filed beside the fields that offer them, and a tenth category's pool is the same claim as the
 * nine before it.
 */
const DOMAIN_COLOUR_PATHS = [
  // The colour names a subject field may use, which `parseColorFromText` resolves.
  'src/constants/colors.ts',
  // What real hardware could display.
  'src/constants/palettes/',
  // The colour options each category's own fields offer.
  'src/constants/categories/',
  // The pooled values a preset pins.
  'src/constants/presets/',
  // The background key: named to the reader, and stated verbatim in the compiled prompt.
  'src/constants/output/choices.ts',
  'src/constants/promptText/sheet.ts',
];

/**
 * Any hex colour, in every length CSS and this app's own parser accept.
 *
 * A colour written into pixel data or into another application's document is not on this list and
 * needs no entry above: `differenceRamp.ts` and `spriteMarker.ts` mirror an `oklch()` triple and
 * `aseprite.ts` states an RGB triple, so none of the three is reachable by this pattern at all. A
 * hex appearing in one of them would mean a colour had been chosen there rather than mirrored,
 * which is exactly what those exemptions forbid — so the failure it would cause here is the right
 * one.
 */
const HEX = /#[0-9a-fA-F]{3,8}\b/;

/** The file's path from the project root, in the spelling `DOMAIN_COLOUR_PATHS` is written in. */
function sourcePath(file: string): string {
  return relative(process.cwd(), file).replaceAll('\\', '/');
}

function isExempt(path: string, allowed: string): boolean {
  return allowed.endsWith('/') ? path.startsWith(allowed) : path === allowed;
}

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
function codeOnly(source: string): string {
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

/** Every line of `file` outside a comment that carries a hex literal, as `path:line`. */
function offendingLines(file: string): string[] {
  return codeOnly(readFileSync(file, 'utf8'))
    .split('\n')
    .map((line, index) => (HEX.test(line) ? `${sourcePath(file)}:${index + 1}` : ''))
    .filter(Boolean);
}

/**
 * A colocated test is not app styling and its literals never render, so a fixture pixel may be
 * written as a hex wherever the test lives. The component or utility it exercises is still scanned,
 * which is the half that decides whether the app itself took a token.
 */
function isColocatedTest(file: string): boolean {
  return /\.test\.tsx?$/.test(file);
}

describe('raw colour literals', () => {
  it('scanned the source tree it is meant to be scanning', () => {
    // A `scannableSources()` that returned nothing — a moved directory, a changed `cwd` — would
    // make every filter below trivially empty and both guards pass while reading no code at all.
    expect(scannableSources().length).toBeGreaterThan(20);
  });

  it('still finds a literal in every kind of domain colour it exempts', () => {
    // The scan is worth nothing unless `codeOnly` leaves a literal standing, and a walk that
    // blanked too much would report an empty offender list for the best possible reason. Each path
    // above is exempt because it *holds* colours, so each one has to still show them.
    const carrying = scannableSources()
      .filter((file) => offendingLines(file).length > 0)
      .map(sourcePath);

    const found = DOMAIN_COLOUR_PATHS.filter((allowed) => carrying.some((path) => isExempt(path, allowed)));

    expect(found).toStrictEqual(DOMAIN_COLOUR_PATHS);
  });

  it('leaves no hex literal under src/ outside the domain-colour files', () => {
    const offenders = scannableSources()
      .filter((file) => !isColocatedTest(file))
      .filter((file) => !DOMAIN_COLOUR_PATHS.some((allowed) => isExempt(sourcePath(file), allowed)))
      .flatMap(offendingLines);

    expect(offenders).toStrictEqual([]);
  });
});
