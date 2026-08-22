import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

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
 * Two suites walk `src/` this way — `design-tokens.test.ts` for a bracketed font size, and
 * `raw-colour-literals.test.ts` for a hex a component wrote instead of taking a token — which is
 * why the walk is a module rather than a function inside one of them. A second copy would be a
 * second answer to "what counts as source", and the one that went stale would fail open: a
 * directory the copy never learned about is a directory its guard silently stops covering.
 */
export function scannableSources(): string[] {
  const root = resolve(process.cwd(), 'src');
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(tsx?|css)$/.test(entry.name))
    .map((entry) => resolve(entry.parentPath, entry.name));
}
