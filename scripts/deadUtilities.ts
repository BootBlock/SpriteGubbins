import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import type { Plugin } from 'vite';
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
 *
 * **What is compared is a string in a file, exactly as Tailwind compares one, and that is the edge
 * of what this can claim.** Neither side can tell a class name from an identifier that happens to
 * spell one, so `const container` in `src/main.tsx` both puts a container rule into the sheet and
 * then justifies it. Closing that would take a parser that knows which strings are class strings,
 * which is a different tool; {@link PROSE_COLLISIONS} is the same fact wherever the identifier or
 * the sentence sits outside the markup set. What the guard does buy is that a class the app never
 * mentions at all cannot ship.
 */

/**
 * A utility whose name is also an ordinary word this repository has to be able to write.
 *
 * Five are prose. `shrink` is spelled in ten comment blocks — four about a flex item, the rest
 * about a border narrowing a content box, a generator rescaling artwork, an outline ring and a
 * select that truncates rather than shrinks. `invert` is in three, two about pixel data and one
 * about inverting a module dependency; `lowercase` in one, about the fifth bit of a PNG chunk name;
 * `isolate` in the isolation bootstrap; `sepia` in the note saying why that colour is *not* in the
 * app's colour vocabulary; and `backdrop-filter` in five explanations of the stacking context glass
 * creates. Rewriting those sentences to dodge the scanner would make them worse English in exchange
 * for a few hundred bytes.
 *
 * `filter` is the sixth and is not prose at all: it is a local variable and a parameter in
 * `src/test/pngScanlines.ts`, where a PNG scanline's filter byte has no other name. An identifier
 * is a candidate to the scanner exactly as a sentence is, and there is no more reason to rename one
 * than to reword the other.
 *
 * They are admissible because none of them is a class this project bans. Each is an unremarkable
 * Tailwind utility that a component could reach for and be right, so nothing hides behind the
 * exemption — which is the property that separates this list from the fill that opened the docblock
 * above, and the test an eighth entry has to pass.
 *
 * **An entry cannot be checked for having gone vacuous, and that is a property of where it lives.**
 * Tailwind reads `scripts/` along with everything else, so these strings are themselves candidates:
 * the names stay emitted whether or not any docblock still spells them. What *is* checked is the
 * other direction — an entry naming a class the app has since taken up is stale, and fails, because
 * the exemption is then covering nothing and reads as though it were.
 */
export const PROSE_COLLISIONS: readonly string[] = [
  'backdrop-filter',
  'filter',
  'invert',
  'isolate',
  'lowercase',
  'sepia',
  'shrink',
];

/**
 * Every selector prelude in `sheet`: the run of text before each `{`, back to whichever of `}` or
 * `;` last closed the thing before it.
 *
 * Both terms earn their place on this app's own built stylesheet, and neither is defensive. The
 * `}` is what stops a declaration value being read as a selector — a `background:url(a.zzz)}` in
 * front of the next rule offers `.zzz` to a scan that starts at the previous `{`. The `;` decides
 * exactly one prelude of the 976 in the sheet, `@layer components;@layer utilities`, where the
 * statement form of `@layer` closes with no brace at all.
 *
 * A `{` is deliberately **not** a third term: the cursor advances past every brace it finds, so a
 * prelude can never contain one. Measured on the built sheet, none of the 976 does.
 */
function preludes(sheet: string): string[] {
  const found: string[] = [];
  let cursor = 0;
  for (;;) {
    const brace = sheet.indexOf('{', cursor);
    if (brace === -1) return found;
    const before = sheet.slice(cursor, brace);
    found.push(before.slice(Math.max(before.lastIndexOf('}'), before.lastIndexOf(';')) + 1));
    cursor = brace + 1;
  }
}

/**
 * One character of a CSS identifier: an escape, or a character that needs none.
 *
 * The escape half has to be spelled out rather than written `\\.`, because CSS's commonest escape
 * is **not** one character. A leading digit is emitted as a backslash, up to six hex digits and one
 * optional space, so the stock breakpoint variant `2xl` reaches a selector as `\32 xl` — and a
 * pattern reading `\3` and then stopping stops mid-name, with the scan resuming past the rest and
 * no `.` left to find. That returned `32` for the first such class anyone writes: a build failure
 * naming a class nobody can delete, while the real one went unchecked.
 */
const IDENTIFIER_CHAR = String.raw`\\[0-9A-Fa-f]{1,6}[ \t\n\f\r]?|\\[^0-9A-Fa-f]`;

/**
 * A class selector, with CSS escaping intact.
 *
 * The first character is narrower than the rest, because an identifier may not open with an
 * unescaped digit. Skipping at-rule preludes covers the same ground for a media condition, and this
 * covers what that does not: an attribute selector is a prelude opening with no `@`, and a `.` in
 * one of its values is otherwise a class to anything matching on shape alone.
 */
const CLASS_SELECTOR = new RegExp(
  String.raw`\.((?:${IDENTIFIER_CHAR}|[A-Za-z_-])(?:${IDENTIFIER_CHAR}|[A-Za-z0-9_-])*)`,
  'g',
);

/** A selector's escaping undone, so the name reads as a `className` would write it. */
function unescape(selector: string): string {
  return selector.replace(
    /\\([0-9A-Fa-f]{1,6})[ \t\n\f\r]?|\\([^])/g,
    (_match: string, hex: string | undefined, literal: string | undefined) =>
      hex === undefined ? (literal ?? '') : String.fromCodePoint(Number.parseInt(hex, 16)),
  );
}

/** Every class name the stylesheet defines a rule for, in the spelling a `className` would use. */
export function emittedClassNames(css: string): string[] {
  const names = new Set<string>();
  for (const prelude of preludes(css.replace(/\/\*[^]*?\*\//g, ''))) {
    if (prelude.trimStart().startsWith('@')) continue;
    for (const match of prelude.matchAll(CLASS_SELECTOR)) names.add(unescape(match[1] ?? ''));
  }
  return [...names].sort();
}

/**
 * What a candidate may not touch on either side, so a `pb-` step is not found inside a longer one.
 *
 * `@` and `!` are here for the same reason `:` is: each opens a candidate, so a class following one
 * is a *different* class. `@container` would otherwise justify the plain container rule, and every
 * `@sm:`-style container variant would justify the viewport utility of the same name.
 *
 * The set stops short of `( ) , % & > * +`, which a candidate can also carry, and the asymmetry is
 * why. A character wrongly *in* this set turns a legitimate spelling into a failed build; one
 * wrongly out of it lets a longer candidate justify a shorter one. Every character above appears in
 * this app's class strings only inside a `[…]`, whose brackets are already here — while all eight
 * are ordinary punctuation that a sentence or a regex naming a class puts right beside it.
 */
const EDGE = String.raw`A-Za-z0-9_\-:./\[\]@!`;

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

/**
 * Where a name is spelled, for a failure to point at. A pointer, never part of the verdict.
 *
 * `tailwindScanned()` is narrower than Tailwind's own scan — the root configs and `.github/` are
 * outside it — so this can come back empty for a name that really is written somewhere. The message
 * says which directories were read rather than claiming the name is spelled nowhere, because the
 * verdict is drawn from the stylesheet and does not depend on finding the source at all.
 */
function spellings(name: string): string {
  const files = tailwindScanned()
    .filter((file) => spelledIn(name, readFileSync(file, 'utf8')))
    .map((file) => relative(process.cwd(), file).replaceAll('\\', '/'));
  return files.length > 0
    ? files.join(', ')
    : 'no file under src/, tests/, scripts/ or public/ — grep the project root too';
}

/**
 * Fail the build if the stylesheet carries a rule for a class the app never wears, or if an entry
 * in {@link PROSE_COLLISIONS} is exempting a class the app has since taken up.
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

/**
 * Run {@link assertNoDeadUtilities} over the built stylesheet, from the build itself.
 *
 * `closeBundle`, and not for the reason `spa404FallbackPlugin` is there. The natural hook is
 * `generateBundle`, which runs before anything is written and already holds the CSS asset in its
 * final form — `@tailwindcss/vite` generates and optimises in a `transform`, so nothing downstream
 * touches a class name. **Rolldown discards the error, though.** Measured against this build: a
 * `throw` from `generateBundle`, and `this.error()` with it, stop the build and print nothing but
 * `Build failed` — the message never reaches the console, and a guard whose failure nobody can read
 * is no guard. The same throw from `closeBundle` prints in full.
 *
 * So the stylesheet is read back off disk, and a failure here strands a written `dist/` that must
 * not be served — exactly the footing `scripts/precacheContract.ts` documents for itself. Build
 * again after fixing rather than reaching for the directory.
 *
 * There is no guard against running inside a worker build, because a worker build cannot run this.
 * Vite resolves a worker's plugins from `config.worker.plugins` alone, which this project does not
 * set; measured against this repo's own resolved config, the worker environment's user plugin list
 * is empty. A client build that emitted no stylesheet at all throws rather than passing quietly,
 * which is the check that would otherwise have been spent on the worker.
 */
export function deadUtilityPlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'sprite-gubbins-dead-utilities',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const assets = resolve(outDir, 'assets');
      const sheets = existsSync(assets) ? readdirSync(assets).filter((name) => name.endsWith('.css')) : [];
      if (sheets.length === 0) {
        throw new Error(
          `No stylesheet was written to ${assets}, so scripts/deadUtilities.ts had nothing to ` +
            'check. That is a broken build, not an empty one.',
        );
      }
      assertNoDeadUtilities(sheets.map((name) => readFileSync(resolve(assets, name), 'utf8')).join('\n'));
    },
  };
}
