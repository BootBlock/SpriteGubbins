import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/** Every `.ts`, `.tsx` and `.css` file under `root`, resolved to an absolute path. */
function filesUnder(root: string): string[] {
  return readdirSync(resolve(process.cwd(), root), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(tsx?|css)$/.test(entry.name))
    .map((entry) => resolve(entry.parentPath, entry.name));
}

/**
 * Every source file under `src/` that can carry a Tailwind class name.
 *
 * Deliberately not just `.tsx`. A class string does not have to sit in JSX to reach the bundle —
 * Tailwind reads whatever its content scan reads, so a `.ts` module hoisting a shared `className`
 * constant (this repo already has three) counts, and so does `index.css` itself, where a class
 * written even inside a comment is a candidate the build emits. Scanning components alone would
 * leave the one place a size could hide from the guard: `src/constants/`, which is exactly where
 * CLAUDE.md's directory rule sends a hoisted constant.
 *
 * Six suites walk the tree this way — `design-tokens.test.ts` for a bracketed font size and for a
 * `duration-` off the motion ladder, `raw-colour-literals.test.ts` for a hex a component wrote
 * instead of taking a token, `sticky-column-offset.test.ts` for a sticky column that clears the
 * wrong height, `interface-punctuation.test.ts` for a straight quote in a string a reader sees,
 * `module-size.test.ts` for a file that has taken on a second responsibility, and
 * `select-call-site-counts.test.ts` for a select nobody budgeted — which is why the walk is a
 * module rather than a function inside one of them. A second copy would be a second answer to
 * "what counts as source", and the one that went stale would fail open: a directory the copy never
 * learned about is a directory its guard silently stops covering.
 *
 * Two of them filter this list down themselves rather than asking for a seventh walk — the
 * punctuation sweep to the `.ts` and `.tsx` that carry authored strings, since `.css` holds none of
 * the app's prose, and the size guard to the modules that are not themselves tests.
 */
export function scannableSources(): string[] {
  return filesUnder('src');
}

/**
 * Everything Tailwind's content scan actually reads — `src/` **and** `tests/`.
 *
 * The two are not the same question, and conflating them is what let a dead class into the bundle.
 * `scannableSources()` asks what the *app* is styled with, so a test file is rightly outside it.
 * This asks what the *build emits from*, and Tailwind does not care which directory a candidate
 * came from or whether it was inside a comment: a whole class name written in a docblock under
 * `tests/` is compiled into the stylesheet exactly as one written in a `className` is.
 *
 * That is not hypothetical. The rung guard's own docblock named `.duration-` and its retired figure
 * in full while explaining why nobody should, and the class it was warning about reappeared in
 * `dist/` — from the test written to keep it out. So a guard whose subject is the bundle walks this
 * list, and one whose subject is the app walks the one above.
 */
export function tailwindScanned(): string[] {
  return [...filesUnder('src'), ...filesUnder('tests')];
}

/**
 * What the app is **actually styled with** — the only files whose class names have a right to be in
 * the stylesheet.
 *
 * The third answer to "what counts as source", and the three are genuinely three questions.
 * `tailwindScanned()` is where a candidate may come *from*, which is why it reaches `tests/` and
 * reads comments; this is where a candidate may be *justified*, which is a strictly smaller set.
 * `scripts/deadUtilities.ts` compares the two, so the difference between them is the dead CSS the
 * build ships — and every hole in this list is a utility that guard stops asking about.
 *
 * Three inclusions decide it, and each is a class name the app really can carry:
 *
 * - **`.ts` as well as `.tsx`**, for the hoisted `className` constants, exactly as above.
 * - **`index.css`**, because `@utility glass-panel { … }` is where several of the app's own
 *   utilities are declared, and nothing else spells `bg-spectrum` or `section-reveal` as a class.
 * - **`index.html`**, the document the app renders into. It carries no class today and the guard
 *   would report one as dead if it did — which would be wrong, since the shell is markup like any
 *   other. Reading it costs one file.
 *
 * A colocated `*.test.tsx` is the one thing under `src/` left out. It renders nothing a reader
 * sees, so a class name it spells — in a fixture, an assertion or a docblock — is dead CSS on the
 * same footing as one spelled under `tests/`, and counting it as justification would be a hole
 * inside the very tree this list exists to speak for.
 */
export function appMarkup(): string[] {
  return [
    ...filesUnder('src').filter((file) => !/\.test\.tsx?$/.test(file)),
    resolve(process.cwd(), 'index.html'),
  ];
}
