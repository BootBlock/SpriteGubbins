import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { codeOnly } from './codeOnly.ts';
import { appMarkup, tailwindScanned } from './sourceFiles.ts';

/**
 * Nothing may reach the stylesheet that the app never wears.
 *
 * Tailwind's content scan reads every file in the project as a template and emits a utility for
 * each class name it finds, without caring whether that name was code, a docblock, a test fixture
 * or an ordinary English sentence. So prose ships CSS. `TabSwitcher`'s note on the tab pill's
 * retired speed put the stock-500ms rung back into the bundle long after the figure was corrected,
 * and the guard written to catch *that* was itself emitting a translucent ink fill from the
 * paragraph explaining why nothing may wear one — the rule against ink on a role colour, shipping a
 * working version of the class it bans.
 *
 * The wasted bytes are not the cost. `src/index.css` states the real one where it excludes the
 * documentation: a class the app bans but the build emits **works**, so a component reaching for it
 * renders correctly, and the thing that normally catches the mistake — an unknown utility emitting
 * no CSS at all — never fires.
 *
 * The rung guard in `tests/design-tokens.test.ts` asks this question for one family of utilities,
 * which is why it caught the speed and missed the fill. This asks it for all of them, from the only
 * place both halves are in hand: the build. Vitest never builds, so the general form cannot be a
 * suite — the same constraint `scripts/precacheContract.ts` states for its own contract — and
 * `tests/dead-utilities.test.ts` drives the pure half instead.
 */

/**
 * A utility whose name is an ordinary English word, which no rule can keep out of prose.
 *
 * `shrink` appears in eight docblocks about flex layout, `invert` and `lowercase` in two about
 * pixel data and PNG chunk names, `isolate` in the isolation bootstrap, `sepia` in the note saying
 * why that colour is *not* in the vocabulary, and `backdrop-filter` in five explanations of the
 * stacking context it creates. Rewriting those sentences to dodge the scanner would make them worse
 * English in exchange for a few hundred bytes.
 *
 * They are admissible because none of them is a class this project bans. Each is an unremarkable
 * Tailwind utility that a component could reach for and be right, so nothing hides behind the
 * exemption — which is the property that separates this list from the fill that opened the docblock
 * above, and the test a seventh entry has to pass.
 *
 * **An entry cannot be checked for having gone vacuous, and that is a property of where it lives.**
 * Tailwind reads `scripts/` along with everything else, so these six strings are themselves
 * candidates: the names stay emitted whether or not any docblock still spells them. What *is*
 * checked is the other direction — an entry naming a class the app has since taken up is stale, and
 * fails, because the exemption is then covering nothing and reads as though it were.
 */
export const PROSE_COLLISIONS: readonly string[] = [
  'backdrop-filter',
  'invert',
  'isolate',
  'lowercase',
  'sepia',
  'shrink',
];

/**
 * Every selector prelude in `sheet`: the run of text before each `{`, back to whichever of `}`, `;`
 * or `{` last closed the thing before it.
 *
 * `{` has to be one of the three. Built CSS is minified, so a nested rule reads
 * `@media (min-width:1120px){.foo{…}}` — cut back to the last `}` alone and the inner prelude
 * arrives as `@media (min-width:1120px){.foo`, which the at-rule test below then discards along
 * with every class inside every media query in the sheet.
 */
function preludes(sheet: string): string[] {
  const found: string[] = [];
  let cursor = 0;
  for (;;) {
    const brace = sheet.indexOf('{', cursor);
    if (brace === -1) return found;
    const before = sheet.slice(cursor, brace);
    const start = Math.max(before.lastIndexOf('}'), before.lastIndexOf(';'), before.lastIndexOf('{'));
    found.push(before.slice(start + 1));
    cursor = brace + 1;
  }
}

/**
 * A class selector, with CSS escaping intact.
 *
 * The first character is deliberately narrower than the rest: an identifier may not open with a
 * digit unescaped, and allowing one would read the `5rem` of a `(min-width:71.5rem)` media query as
 * a class. Skipping at-rule preludes is the other half of that, and neither is sufficient alone.
 */
const CLASS_SELECTOR = /\.((?:\\.|[A-Za-z_-])(?:\\.|[A-Za-z0-9_-])*)/g;

/** Every class name the stylesheet defines a rule for, in the spelling a `className` would use. */
export function emittedClassNames(css: string): string[] {
  const names = new Set<string>();
  for (const prelude of preludes(css.replace(/\/\*[^]*?\*\//g, ''))) {
    if (prelude.trimStart().startsWith('@')) continue;
    for (const match of prelude.matchAll(CLASS_SELECTOR)) {
      names.add((match[1] ?? '').replace(/\\(.)/g, '$1'));
    }
  }
  return [...names].sort();
}

/**
 * What a candidate may not touch on either side, so a `pb-` step is not found inside a longer one.
 *
 * These are the characters a Tailwind class can carry, not "anything but whitespace". A candidate
 * abuts a quote, a backtick, a brace or a space wherever it is genuinely written, and abuts one of
 * these wherever a match would be an accident.
 */
const EDGE = String.raw`A-Za-z0-9_\-:./\[\]`;

/** Whether `text` spells `name` as a whole candidate rather than as part of a longer one. */
export function spelledIn(name: string, text: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return new RegExp(`(?<![${EDGE}])${escaped}(?![${EDGE}])`).test(text);
}

/** Every emitted class the app's own markup never spells, exemptions removed. */
export function deadUtilities(css: string, sources: readonly string[]): string[] {
  return emittedClassNames(css).filter(
    (name) => !PROSE_COLLISIONS.includes(name) && !sources.some((text) => spelledIn(name, text)),
  );
}

/** Every exemption the app has since made redundant by taking the class up for real. */
export function staleCollisions(sources: readonly string[]): string[] {
  return PROSE_COLLISIONS.filter((name) => sources.some((text) => spelledIn(name, text)));
}

/** The app's own markup, with every comment blanked, so only what the app *wears* can answer. */
function markup(): string[] {
  return appMarkup().map((file) => {
    const source = readFileSync(file, 'utf8');
    // `codeOnly` walks JavaScript and CSS comments; the shell document is neither.
    return file.endsWith('.html') ? source.replace(/<!--[^]*?-->/g, '') : codeOnly(source);
  });
}

/** Where a name is spelled across everything Tailwind reads — the diagnostic half of a failure. */
function spellings(name: string): string {
  const files = tailwindScanned()
    .filter((file) => spelledIn(name, readFileSync(file, 'utf8')))
    .map((file) => relative(process.cwd(), file).replaceAll('\\', '/'));
  return files.length > 0 ? files.join(', ') : 'nowhere under src/ or tests/';
}

/**
 * Fail the build if the stylesheet carries a rule for a class the app never wears, or if an entry
 * in {@link PROSE_COLLISIONS} is exempting a class the app has since taken up.
 *
 * Called from a `closeBundle` hook, which is late enough that a failure strands a written `dist/`
 * that must not be served — the same footing `scripts/precacheContract.ts` documents for itself.
 * `vite.config.ts` says why the earlier hook could not be used.
 */
export function assertNoDeadUtilities(css: string): void {
  const sources = markup();

  const dead = deadUtilities(css, sources);
  if (dead.length > 0) {
    throw new Error(
      [
        'The stylesheet carries rules no markup in this app asks for:',
        ...dead.map((name) => `  ${name} — spelled at ${spellings(name)}`),
        "Tailwind reads prose as markup, so a whole class name written in a comment, a test's",
        'assertion or a regex is emitted exactly as one written in a className. Split the name into',
        'two halves that are not a class apart, or take the class off whatever has stopped wearing',
        'it. See scripts/deadUtilities.ts.',
      ].join('\n'),
    );
  }

  const stale = staleCollisions(sources);
  if (stale.length > 0) {
    throw new Error(
      [
        'PROSE_COLLISIONS in scripts/deadUtilities.ts exempts a class the app now uses:',
        ...stale.map((name) => `  ${name}`),
        'The exemption is covering nothing. Delete the entry.',
      ].join('\n'),
    );
  }
}
