import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every bare dependency the app imports must be *named* in `optimizeDeps` — never left for the
 * dev server's scanner to discover.
 *
 * The dev server rewrites a bare import to `/node_modules/.vite/deps/<dep>.js?v=<hash>`, and that
 * hash belongs to one optimisation round. When a dependency turns up that the initial scan missed,
 * Vite optimises again and every hash it had already handed out goes stale — and a request for a
 * stale one is answered `504 Outdated Optimize Dep`, a response carrying **no `Content-Type`**.
 * Firefox refuses such a module as `disallowed MIME type ("")`. React, react-dom/client and the
 * JSX runtime are all static imports of `main.tsx`, so they die together and the page never boots.
 * The recovery Vite offers is a reload pushed over the HMR socket, which on a cold load is still
 * connecting when the imports fail — so the blank page is permanent rather than a flicker.
 *
 * The scan is what makes this reachable: it crawls the static import graph from `index.html`, and
 * that graph does not include `src/db/sqliteWorker.ts`, which is loaded via
 * `new Worker(new URL(…, import.meta.url))` — constructed at runtime, not imported. Anything only
 * the worker pulls in is discovered after the page has booted.
 *
 * So the invariant is coverage, in the direction that matters: `include` may name more than the
 * source does (the JSX runtimes are injected by the transform and appear in no import statement),
 * but the source may never name a dependency that neither `include` nor `exclude` accounts for.
 */
const ROOT = process.cwd();
const SRC_DIR = resolve(ROOT, 'src');

/** Imports Vite resolves itself — they never reach the optimiser. */
const VIRTUAL_PREFIX = 'virtual:';

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

/** A bare specifier is one that is neither relative nor the `@/` source alias. */
function isBare(specifier: string): boolean {
  return !specifier.startsWith('.') && !specifier.startsWith('@/') && !specifier.startsWith(VIRTUAL_PREFIX);
}

/**
 * The package a specifier belongs to — `react/jsx-runtime` is served by `react`, and a scoped
 * name keeps two segments. `optimizeDeps` entries are matched at this granularity by Vite.
 */
function packageOf(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : (parts[0] ?? specifier);
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

/** Reads an array literal out of the config text — `include: [...]` / `exclude: [...]`. */
function configList(text: string, key: 'include' | 'exclude'): readonly string[] {
  const block = new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`, 'u').exec(text);
  expect(block, `optimizeDeps.${key} must be present in vite.config.ts`).not.toBeNull();
  return [...(block?.[1] ?? '').matchAll(/['"]([^'"]+)['"]/gu)].map((match) => match[1] ?? '');
}

const config = readFileSync(resolve(ROOT, 'vite.config.ts'), 'utf8');
const include = configList(config, 'include');
const exclude = configList(config, 'exclude');

/** Bare specifiers written anywhere the browser will actually load, mapped to their package. */
const imported = new Set(
  sourceFiles(SRC_DIR)
    .flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      return [STATIC_IMPORT, RE_EXPORT, DYNAMIC_IMPORT].flatMap((pattern) =>
        [...text.matchAll(pattern)].map((match) => match[1] ?? ''),
      );
    })
    .filter(isBare)
    .map(packageOf),
);

describe('optimizeDeps coverage', () => {
  it('actually finds the imports it is meant to be checking', () => {
    // Without this the suite below passes just as happily on a scan that matched nothing — and a
    // silently empty scan is exactly how this guard would stop guarding.
    expect([...imported].sort()).toEqual(['@sqlite.org/sqlite-wasm', 'react', 'react-dom', 'zustand']);
  });

  it('names every dependency src/ imports, so none is discovered late', () => {
    const accounted = new Set([...include, ...exclude].map(packageOf));
    expect([...imported].filter((dep) => !accounted.has(dep)).sort()).toEqual([]);
  });

  it('never lists the same package as both included and excluded', () => {
    const excluded = new Set(exclude.map(packageOf));
    expect(include.map(packageOf).filter((dep) => excluded.has(dep))).toEqual([]);
  });

  it('keeps the dev server on a fixed port rather than drifting to the next free one', () => {
    // A tab pointed at the usual address must be answered by the tree that was started, not by
    // whichever worktree's server claimed the port first — their dep hashes are unrelated.
    expect(config).toMatch(/strictPort:\s*true/u);
  });
});
