import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { codeOnly } from './codeOnly';
import { scannableSources } from './sourceFiles';

/**
 * The line count CLAUDE.md's first structural law states, and the quantity it is stated against.
 *
 * The law's subject is a file that has taken on a second responsibility, and for a long time its
 * threshold was raw lines — which in this repository measures something else entirely. The house
 * style is prose-heavy on purpose: a docblock here explains why a calibration figure is the figure
 * it is, and the same document asks for that everywhere else it says anything. So the two
 * quantities came apart, and 157 of 553 modules sat past a target nobody could act on, while only
 * 56 were past it on code. Nine phases of the codebase audit each recorded the overflow and each
 * handed the question on with the same three words — "mostly in docblock" — because the rule as
 * written could not tell a 2,038-line calibration record that is 279 lines of code from a component
 * that genuinely does two things.
 *
 * A quarter of the tree ignoring a structural law is worse than no law, since it teaches a reader
 * to skip the section. So the target is stated against the quantity its rationale names: source
 * with every comment blanked by `codeOnly`, and blank lines dropped.
 */
const CODE_LINE_TARGET = 150;

/**
 * Where a module may run past the target, and the one reason that admits all of them.
 *
 * Each of these files is long because **its length is its own subject matter**. A category's option
 * pool, a preset library, the plan of what a sheet contains, a style reference, the prompt skeleton,
 * the quantiser's calibration record, what each target model can do, the type vocabulary — none of
 * them has a second responsibility to separate,
 * because none of them has a first one in the sense the law means. There is no control flow to
 * disentangle and nothing to name and lift out. Splitting one does not divide two concerns; it
 * scatters a single record across files.
 *
 * A trailing `/` exempts a directory, because the whole directory is that kind of file: a tenth
 * category's pool is the same claim as the nine before it, and a new one should not have to argue
 * the case again. A path with no trailing slash exempts exactly that file, so a second long module
 * arriving in `src/constants/` is held to the target until somebody says in this list why it is a
 * declaration too.
 *
 * **This is not a blanket pass for `src/constants/`.** That directory holds small resolvers as well
 * as declarations — `resolveDirectionSet`, `paletteFor`, `directionSetChoices` — and a long one of
 * those is exactly what the law is about. It would also be a directory violation under the
 * separation-of-concerns law two bullets down, so a file arguing its way onto this list on the
 * strength of its folder rather than its contents is answering the wrong rule.
 */
const DECLARATION_PATHS = [
  // The option pools each category's fields offer, and the prompt carries verbatim.
  'src/constants/categories/',
  // The pinned configurations each preset library ships.
  'src/constants/presets/',
  // What a sheet contains, keyed by category and mode.
  'src/constants/sheetPlans/',
  // The named looks a style reference may cite.
  'src/constants/styleReferences/',
  // The prompt skeleton, mirrored character for character into the baseline document.
  'src/constants/promptTemplate.ts',
  // The quantiser's calibration record — every figure measured on `test_sprites/armour.png`.
  'src/constants/quantiser.ts',
  // What each target model is, and what it can be asked to do.
  'src/constants/models.ts',
  // The type vocabulary. A type is a declaration by construction.
  'src/types/',
];

/** The file's path from the project root, in the spelling `DECLARATION_PATHS` is written in. */
function sourcePath(file: string): string {
  return relative(process.cwd(), file).replaceAll('\\', '/');
}

function isExempt(path: string, allowed: string): boolean {
  return allowed.endsWith('/') ? path.startsWith(allowed) : path === allowed;
}

/**
 * A module of the app, which is every `.ts`/`.tsx` under `src/` that is not itself a test.
 *
 * `src/test/` is deliberately **inside** this. Its decoders read a PNG and an `.aseprite` document
 * back apart so a writer's output can be checked against what it claims to have written, and a
 * decoder is precisely the kind of file that grows a second responsibility — it is only the
 * assertions that are not app code. `.css` is outside it, since a stylesheet's length is not what
 * this law is about and `index.css` is one deliberate record of the palette.
 */
function appModules(): string[] {
  return scannableSources().filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file));
}

/** Lines of `file` that survive comment blanking and are not blank. */
function codeLines(file: string): number {
  return codeOnly(readFileSync(file, 'utf8'))
    .split('\n')
    .filter((line) => line.trim() !== '').length;
}

describe('module size', () => {
  it('scanned the source tree it is meant to be scanning', () => {
    // A walk that returned nothing — a moved directory, a changed `cwd` — would make every filter
    // below trivially empty and all three checks pass while reading no code at all.
    expect(appModules().length).toBeGreaterThan(400);
  });

  it('blanks the prose it is meant to be blanking', () => {
    // The whole change this file records is the gap between the two counts, so a `codeOnly` that
    // had stopped blanking would quietly restore the raw-line rule under the new name and report
    // every docblock-heavy module as an offender. The calibration record is the widest case in the
    // tree: 2,038 lines carrying 279 of code.
    const record = appModules().find((file) => sourcePath(file) === 'src/constants/quantiser.ts');
    if (record === undefined) {
      throw new Error('src/constants/quantiser.ts is no longer where this expects it');
    }

    const raw = readFileSync(record, 'utf8').split('\n').length;
    expect(codeLines(record)).toBeLessThan(raw / 4);
  });

  it('still has a declaration past the target behind every path it exempts', () => {
    // An exemption that has stopped suppressing anything has become a hole: it reads as a standing
    // permission while covering nothing, and the next long module filed under it is admitted
    // without anybody deciding to admit it. Each entry earns its place by still naming a file the
    // target would otherwise catch.
    const overTarget = appModules()
      .filter((file) => codeLines(file) > CODE_LINE_TARGET)
      .map(sourcePath);

    const exercised = DECLARATION_PATHS.filter((allowed) =>
      overTarget.some((path) => isExempt(path, allowed)),
    );

    expect(exercised).toStrictEqual(DECLARATION_PATHS);
  });

  it('leaves no module past the target outside the declaration paths', () => {
    const offenders = appModules()
      .map((file) => ({ path: sourcePath(file), lines: codeLines(file) }))
      .filter(({ lines }) => lines > CODE_LINE_TARGET)
      .filter(({ path }) => !DECLARATION_PATHS.some((allowed) => isExempt(path, allowed)))
      .sort((left, right) => right.lines - left.lines)
      .map(({ path, lines }) => `${path}: ${String(lines)}`);

    expect(offenders).toStrictEqual([]);
  });
});
