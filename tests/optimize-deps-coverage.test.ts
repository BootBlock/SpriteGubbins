import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every bare dependency the app imports must be *named* in `optimizeDeps` — never left for the
 * dev server's scanner to discover.
 *
 * The dev server rewrites a bare import to `/node_modules/.vite/deps/<dep>.js?v=<hash>`, and that
 * hash belongs to one optimisation round. A request carrying a previous round's hash is answered
 * `504 Outdated Optimize Dep`, a response with **no `Content-Type`** — which Firefox refuses as
 * `disallowed MIME type ("")`. React, react-dom/client and the JSX runtime are all static imports
 * of `main.tsx`, so they die together and the page never boots; Vite's recovery is a reload pushed
 * over the HMR socket, which on a cold load is still connecting when the imports fail.
 *
 * **Granularity is the point.** Vite optimises per entry point, not per package, which is why
 * `react-dom/client` and the two JSX runtimes are named separately rather than folded into
 * `react` — and why this suite compares whole specifiers. Matching on package alone would let
 * `zustand/middleware` pass on the strength of `zustand` while Vite treated it as a fresh entry,
 * which is precisely the late discovery the config exists to prevent.
 *
 * Each list is read from **its own block** of `vite.config.ts`, never from the file at large:
 * there are two `exclude:` keys in it — `optimizeDeps`'s and Vitest's own `test.exclude` — so a
 * search across the whole text would find whichever came first. (Importing the config would
 * settle it outright, but `vite.config.ts` resolves `package.json` through `import.meta.url`, and
 * under Vitest's module runner that is not a `file:` URL, so the import throws.)
 */
const ROOT = process.cwd();
const SRC_DIR = resolve(ROOT, 'src');

/** Imports Vite resolves itself — they never reach the optimiser. */
const VIRTUAL_PREFIX = 'virtual:';

/** The top-level config properties this suite reads, and which must never bleed into each other. */
const BLOCKS = ['optimizeDeps', 'server', 'preview'] as const;

/**
 * Real import statements only, anchored to the start of a line.
 *
 * An unanchored `from\s*['"]…` also matches ordinary prose: a comment whose last word is "from",
 * wrapped onto the next line, is followed by a quoted string often enough to matter. Type-only
 * imports are skipped because they are erased before the browser sees anything.
 */
const STATIC_IMPORT = /^[ \t]*import\s+(?!type[\s{])(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/gmu;
const RE_EXPORT = /^[ \t]*export\s+(?!type[\s{])[^'"]*?\sfrom\s+['"]([^'"]+)['"]/gmu;
const DYNAMIC_IMPORT = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gu;

const config = readFileSync(resolve(ROOT, 'vite.config.ts'), 'utf8');

/**
 * The text of one top-level property's object literal, from `<name>: {` to the brace that closes
 * it — found by counting depth, not by looking for an indented `},`.
 *
 * The indentation shortcut is what a formatter is free to take away: Prettier's default
 * `objectWrap: 'preserve'` keeps a literal on one line when it was written that way and fits the
 * print width, and a terminator anchored to `\n  },` would then run straight past it and read the
 * *next* property's keys. That is the sibling-block mix-up this scoping exists to stop, so it must
 * not depend on how the file happens to be wrapped.
 */
function configBlock(name: string): string {
  const opening = config.indexOf(`${name}: {`);
  if (opening === -1) throw new Error(`vite.config.ts must declare ${name}`);
  let depth = 0;
  for (let index = config.indexOf('{', opening); index < config.length; index += 1) {
    if (config[index] === '{') depth += 1;
    else if (config[index] === '}' && --depth === 0) return config.slice(opening, index);
  }
  throw new Error(`${name} is never closed in vite.config.ts`);
}

/** Reads an array literal out of a block — `include: [...]` / `exclude: [...]`. */
function configList(block: string, key: 'include' | 'exclude'): readonly string[] {
  const matched = new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`, 'u').exec(block);
  if (!matched) throw new Error(`optimizeDeps.${key} must be present in vite.config.ts`);
  return [...matched[1].matchAll(/['"]([^'"]+)['"]/gu)].map((match) => match[1]);
}

const optimizeDeps = configBlock('optimizeDeps');
const include = configList(optimizeDeps, 'include');
const exclude = configList(optimizeDeps, 'exclude');

/** A bare specifier is one that is neither relative nor the `@/` source alias. */
function isBare(specifier: string): boolean {
  return !specifier.startsWith('.') && !specifier.startsWith('@/') && !specifier.startsWith(VIRTUAL_PREFIX);
}

/** The package a specifier belongs to — `react/jsx-runtime` → `react`, scoped names keep two segments. */
function packageOf(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/**
 * `include` has to name the exact entry point, because that is the granularity Vite optimises at.
 * `exclude` may also match at package level: excluding a package takes everything under it out of
 * pre-bundling, so a subpath of an excluded package needs no entry of its own.
 */
function isAccounted(specifier: string): boolean {
  if (include.includes(specifier)) return true;
  return exclude.some((entry) => entry === specifier || entry === packageOf(specifier));
}

/**
 * The modules the browser actually loads. Test files and the Vitest setup import
 * `@testing-library/*` and `vitest`, which are devDependencies the dev server never serves — so
 * counting them would demand `optimizeDeps` entries for packages that must not have any.
 */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'test' ? [] : sourceFiles(path);
    if (!['.ts', '.tsx'].includes(extname(entry.name))) return [];
    return /\.test\.tsx?$/u.test(entry.name) ? [] : [path];
  });
}

/** Every bare specifier written where the browser will load it, kept whole. */
const imported = new Set(
  sourceFiles(SRC_DIR)
    .flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      return [STATIC_IMPORT, RE_EXPORT, DYNAMIC_IMPORT].flatMap((pattern) =>
        [...text.matchAll(pattern)].map((match) => match[1]),
      );
    })
    .filter(isBare),
);

describe('optimizeDeps coverage', () => {
  it('actually finds the imports it is meant to be checking', () => {
    // Without this the suite below passes just as happily on a scan that matched nothing, and a
    // silently empty scan is how this guard would stop guarding. Membership rather than equality:
    // a newly added dependency should fail the coverage test with a useful message, not this one
    // with a confusing diff.
    expect(imported.size).toBeGreaterThan(0);
    // `react-dom/client` earns its place here: it is the specifier `main.tsx` imports and the one
    // `@vitejs/plugin-react`'s own include list omits, so a scan that collapsed it to `react-dom`
    // would hide the very gap this config closes.
    expect([...imported]).toEqual(expect.arrayContaining(['@sqlite.org/sqlite-wasm', 'react-dom/client']));
  });

  it('names every dependency src/ imports, so none is discovered late', () => {
    expect([...imported].filter((dep) => !isAccounted(dep)).sort()).toEqual([]);
  });

  it('never lists the same package as both included and excluded', () => {
    const excluded = new Set(exclude.map(packageOf));
    expect(include.map(packageOf).filter((dep) => excluded.has(dep))).toEqual([]);
  });

  it('reads each config block in isolation', () => {
    // The whole point of scoping is that a key can never be read out of a neighbouring block, so
    // assert the extraction rather than trusting it — an unbalanced brace in a comment would
    // silently run one block into the next.
    for (const name of BLOCKS) {
      const block = configBlock(name);
      for (const other of BLOCKS.filter((candidate) => candidate !== name)) {
        expect(block, `the ${name} block must not run into ${other}`).not.toContain(`${other}: {`);
      }
    }
  });

  it('pins the dev and preview ports rather than drifting to the next free one', () => {
    // A tab pointed at the usual address must be answered by the tree that was started, or by
    // nothing at all — never by whichever worktree's server claimed the port first.
    for (const name of ['server', 'preview']) {
      const block = configBlock(name);
      expect(block, `${name} must pin a port`).toMatch(/port:\s*\d+/u);
      expect(block, `${name} must fail rather than drift`).toMatch(/strictPort:\s*true/u);
    }
  });
});
