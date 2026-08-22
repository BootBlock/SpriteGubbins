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
 * Three guards walk the tree this way — `design-tokens.test.ts` for a bracketed font size and for a
 * `duration-` off the motion ladder, and `raw-colour-literals.test.ts` for a hex a component wrote
 * instead of taking a token — which is why the walk is a module rather than a function inside one of
 * them. A second copy would be a second answer to "what counts as source", and the one that went
 * stale would fail open: a directory the copy never learned about is a directory its guard silently
 * stops covering.
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
