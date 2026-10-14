import { relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { codeOnly } from '../scripts/codeOnly.ts';
import { scannableSources, sourceText } from '../scripts/sourceFiles.ts';

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
  // The one colour each damage school's icons are led by, stated in every spell's inventory line.
  'src/constants/iconCatalogue/damageSchools.ts',
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

/**
 * Every CSS colour function that writes a colour down, rather than mixing two that already exist.
 *
 * The hex was the only spelling this suite looked for, so a component could write the same colour
 * as `rgb()`, `hsl()` or `oklch()` and pass the gate — in an inline `style`, or inside the brackets
 * of an arbitrary background value, both of which Tailwind and the browser render as written. `color-mix()`
 * is not here: it blends colours that must already be named, and this app mixes tokens with it.
 * `color()` is, since it takes a colour space and a triple like the rest.
 *
 * `src/index.css` is where these are written down, and is exempt below. The domain paths are exempt
 * for the reason they are exempt from the hex.
 */
const COLOUR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/;

/** The one file a colour value may be written in as a function of any kind. */
const STYLESHEET = 'src/index.css';

/** The file's path from the project root, in the spelling `DOMAIN_COLOUR_PATHS` is written in. */
function sourcePath(file: string): string {
  return relative(process.cwd(), file).replaceAll('\\', '/');
}

function isExempt(path: string, allowed: string): boolean {
  return allowed.endsWith('/') ? path.startsWith(allowed) : path === allowed;
}

/** Every line of `file` outside a comment that `pattern` matches, as `path:line`. */
function offendingLines(file: string, pattern: RegExp = HEX): string[] {
  return codeOnly(sourceText(file))
    .split('\n')
    .map((line, index) => (pattern.test(line) ? `${sourcePath(file)}:${index + 1}` : ''))
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

/** Every app source a raw colour could be painted from, with the tests and the domain files left out. */
function appSources(): string[] {
  return scannableSources()
    .filter((file) => !isColocatedTest(file))
    .filter((file) => !DOMAIN_COLOUR_PATHS.some((allowed) => isExempt(sourcePath(file), allowed)));
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
    expect(appSources().flatMap((file) => offendingLines(file))).toStrictEqual([]);
  });

  it('leaves no colour function under src/ outside the stylesheet and the domain-colour files', () => {
    // The stylesheet is exempt because it is full of these, so it has to still show them, or a
    // `codeOnly` that blanked too much would pass this for the best possible reason.
    expect(offendingLines(resolve(process.cwd(), STYLESHEET), COLOUR_FUNCTION)).not.toStrictEqual([]);

    const offenders = appSources()
      .filter((file) => sourcePath(file) !== STYLESHEET)
      .flatMap((file) => offendingLines(file, COLOUR_FUNCTION));

    expect(offenders).toStrictEqual([]);
  });
});
