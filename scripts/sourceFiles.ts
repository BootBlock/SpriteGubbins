import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/** The shell document, which is markup like any other and is not under a directory of its own. */
const SHELL = 'index.html';

/** Every file under `root` whose extension can carry a Tailwind class name, as an absolute path. */
function filesUnder(root: string, extensions: RegExp): string[] {
  return readdirSync(resolve(process.cwd(), root), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && extensions.test(entry.name))
    .map((entry) => resolve(entry.parentPath, entry.name));
}

/** What the app itself is written in. */
const APP_SOURCE = /\.(tsx?|css)$/;

/** That, plus the two extensions the tooling and the served files outside `src/` are written in. */
const ANY_SOURCE = /\.(tsx?|jsx?|mjs|css|html)$/;

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
  return filesUnder('src', APP_SOURCE);
}

/**
 * Where a Tailwind candidate can come *from* — every directory this repository writes prose or
 * class strings in, plus the shell document.
 *
 * Tailwind's automatic content detection reads the whole non-ignored project, and `src/index.css`
 * subtracts only the Markdown and the archived single-file app. So the scan is wider than `src/` in
 * a way that matters: `.isolate` ships today from one word in `public/coi-bootstrap.js`, and the
 * strings in `scripts/deadUtilities.ts`'s own exemption list are candidates in their own right.
 * A list that stopped at `src/` and `tests/` would have said that word is spelled nowhere.
 *
 * **It is still narrower than the scan, and the difference is deliberate.** The root configs,
 * `.github/` and the non-Markdown files under `docs/` are read by Tailwind and are not walked here,
 * because this list is consulted for two things that both tolerate the gap: the raw-source sweep
 * for a `duration-` off the ladder, and the diagnostic naming where a dead class was spelled. **No
 * guard's *verdict* rests on it** — `scripts/deadUtilities.ts` decides from the emitted stylesheet,
 * so a class written anywhere at all still fails the build. Only the pointer would go quiet, and
 * the message says so rather than claiming the name is spelled nowhere.
 *
 * The narrower question — what the app is styled *with* — is {@link appMarkup} below, and it is a
 * strict subset of this.
 */
export function tailwindScanned(): string[] {
  return [
    ...filesUnder('src', ANY_SOURCE),
    ...filesUnder('tests', ANY_SOURCE),
    ...filesUnder('scripts', ANY_SOURCE),
    ...filesUnder('public', ANY_SOURCE),
    resolve(process.cwd(), SHELL),
  ];
}

/** Whether `file` is a test rather than something the app renders. */
function isTest(file: string): boolean {
  return /\.test\.tsx?$/.test(file) || /[\\/]src[\\/]test[\\/]/.test(file);
}

/**
 * What the app is **actually styled with** — the only files whose class names have a right to be in
 * the stylesheet.
 *
 * `tailwindScanned()` is where a candidate may come *from*; this is where one may be *justified*,
 * and the difference between the two is the dead CSS the build ships. `scripts/deadUtilities.ts`
 * compares them, so every hole in this list is a utility that guard stops asking about.
 *
 * Two inclusions decide it, beyond the `.ts` as well as `.tsx` that `scannableSources` explains
 * above: **`index.css`**, because `@utility glass-panel { … }` is where several of the app's own
 * utilities are declared and nothing else spells them as a class; and **`index.html`**, the
 * document the app renders into, which carries no class today and would have one reported as dead
 * if it did.
 *
 * **Two kinds of test are left out, and the second was a live hole.** A colocated `*.test.tsx`
 * renders nothing a reader sees, so a class name it spells is dead CSS on the same footing as one
 * spelled under `tests/`. `src/test/` is the same claim about the same kind of file, and matches
 * neither that pattern nor the directory: its eighteen helpers are decoders and fakes, and one
 * local variable in `pngScanlines.ts` was on its own justifying a `.filter` rule that the app has
 * never worn. `module-size.test.ts` deliberately keeps `src/test/` *inside* its own walk, and that
 * is not a disagreement — a decoder is app-shaped code whose length is worth bounding, and is still
 * not markup.
 */
export function appMarkup(): string[] {
  return [...filesUnder('src', APP_SOURCE).filter((file) => !isTest(file)), resolve(process.cwd(), SHELL)];
}
