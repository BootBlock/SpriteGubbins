import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/** The shell document, which is markup like any other and is not under a directory of its own. */
const SHELL = 'index.html';

/** Every file under `root` whose extension can carry a Tailwind class name, as an absolute path. */
function filesUnder(root: string, extensions: RegExp): string[] {
  return readdirSync(resolve(process.cwd(), root), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && extensions.test(entry.name))
    .map((entry) => resolve(entry.parentPath, entry.name));
}

/**
 * Every file this module has been asked for, keyed by absolute path.
 *
 * A sweep asks the same question of the same file many times over, and two of them asked it
 * quadratically. `scannableSources()` returns **888 files** — `src/` is `.ts`, `.tsx` and `.css`,
 * colocated tests included — so the shared-component check in `design-tokens.test.ts`, which read
 * every one of them once per file under `components/common/`, was doing on the order of 24,000
 * synchronous reads for a question that needs each file's contents exactly once. That is not a
 * tidiness point. On Windows, with on-access scanning between the process and the disk, it took that
 * test to 18025 ms inside a full run and past Vitest's 5000 ms default at two runs in four on an
 * otherwise idle tree — a timeout, never an assertion, on a change that touched nothing it reads.
 *
 * The cache lives here rather than in the suite because the walk and the reading of what it returns
 * are one question, and it is the reading every consumer of {@link scannableSources},
 * {@link tailwindScanned} and {@link appMarkup} does first. A cache per suite would be the same fix
 * written nine times, eight of which would be written later or not at all.
 *
 * **It is the reading, and only the reading.** A suite that transforms what it reads — `codeOnly`
 * is a character walk over the whole file — can still repeat that work per question, and
 * `guidance-sentence-sharing.test.ts` did: one `it.each` case per shared sentence, each blanking
 * every source again. Nothing here can see that, so it hoists its own comment-blanked list to module
 * scope instead. Reach for this when a file is read more than once; reach for a hoisted derivation
 * when it is *processed* more than once.
 *
 * Safe because nothing in this repository writes a source file while a guard is reading one: the
 * suites and `deadUtilities.ts` alike run against a tree that is fixed for the length of the
 * process, and `deadUtilities.ts` reads the emitted stylesheet directly rather than through here.
 * A test that deliberately edits a file mid-run would need to read it itself, and there is none.
 */
const contents = new Map<string, string>();

/**
 * One source file's text, read at most once per process.
 *
 * Keyed by absolute path, so it does not care where the path came from: every sweep that walks a
 * list from this module reads through here, and so does a suite with a walk of its own that would
 * otherwise read one file twice — `target-model-fields.test.ts` reads each candidate once to decide
 * whether it names the table and again to scan it. What is left outside is
 * `optimize-deps-coverage.test.ts`, which builds its own list for a stated reason and reads each
 * file exactly once, so routing it through here would buy an import and nothing else.
 */
export function sourceText(file: string): string {
  const cached = contents.get(file);
  if (cached !== undefined) return cached;

  const text = readFileSync(file, 'utf8');
  contents.set(file, text);
  return text;
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
 * Seven suites walk the tree this way — `design-tokens.test.ts` for a bracketed font size and for a
 * `duration-` off the motion ladder, `raw-colour-literals.test.ts` for a hex a component wrote
 * instead of taking a token, `sticky-column-offset.test.ts` for a sticky column that clears the
 * wrong height, `interface-punctuation.test.ts` for a straight quote in a string a reader sees,
 * `module-size.test.ts` for a file that has taken on a second responsibility,
 * `select-call-site-counts.test.ts` for a select nobody budgeted, and
 * `guidance-sentence-sharing.test.ts` for a shared guidance sentence typed out instead of imported
 * — which is why the walk is a module rather than a function inside one of them. A second copy would be a second answer to
 * "what counts as source", and the one that went stale would fail open: a directory the copy never
 * learned about is a directory its guard silently stops covering.
 *
 * Three of them filter this list down themselves rather than asking for a walk apiece — the
 * punctuation sweep to the `.ts` and `.tsx` that carry authored strings, since `.css` holds none of
 * the app's prose, the size guard to the modules that are not themselves tests, and the sharing
 * sweep to everything but the one file those sentences are defined in.
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
 * **A second guard's verdict rests on it**, and for the same reason a class name has to be spelled
 * somewhere the app wears it: `design-tokens.test.ts` sweeps this list for every assignment of
 * `--color-tab`, so that none rests on the stop the palette reserves for the live state. A hole
 * here is a file that guard stops reading too — which is why the walk is a module, and why a
 * directory added to the app belongs in it rather than in a list one consumer keeps.
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
