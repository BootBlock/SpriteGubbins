import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The npm that writes `package-lock.json` decides what the file says, so the repository refuses an
 * npm too old to agree with the one that last wrote it — loudly, at install time.
 *
 * npm 11.6.3 changed how dependency flags are calculated (npm/cli #8645). Every npm from 11.6.3 on,
 * npm 12 included, leaves the committed lockfile byte-identical. npm 11.6.2 rewrites it: `peer:
 * true` moves onto 15 packages and off 9, two bundled `@emnapi` entries under
 * `@tailwindcss/oxide-wasm32-wasi` disappear, and `@emnapi/wasi-threads` and `tslib` appear at the
 * root. Dependabot runs a current npm, so the two flipped the file back and forth, and because a
 * fresh worktree runs `npm install` before anything else, every tree on the older npm was dirty
 * before its first edit — and CLAUDE.md's `git add -A` committed the rewrite into unrelated work.
 *
 * npm ignores `engines` unless `engine-strict` is set, so the floor in `package.json` means
 * nothing without `.npmrc`: both halves are held here. `devEngines.packageManager` would say the
 * same thing in npm's newer field, but Dependabot cannot yet update a project that declares one
 * with a range.
 *
 * The Node version is written in one place, `.nvmrc`, and every `actions/setup-node` step reads it
 * from there: a second hand-written copy is what lets CI and a developer's machine run different
 * Nodes, and so different npms, without anything noticing.
 */
const ROOT = process.cwd();
const WORKFLOWS_DIR = '.github/workflows';

/** The first npm whose lockfile agrees with Dependabot's and with every later npm's. */
const NPM_FLOOR = [11, 6, 3] as const;

const read = (path: string): string => readFileSync(resolve(ROOT, path), 'utf8');

function isPackageJson(value: unknown): value is { engines: Record<string, string> } {
  if (typeof value !== 'object' || value === null || !('engines' in value)) return false;
  const { engines } = value;
  return typeof engines === 'object' && engines !== null;
}

/** A `>=MAJOR.MINOR.PATCH` range as its three numbers, or `null` for any other shape. */
function lowerBound(range: string | undefined): number[] | null {
  const match = /^>=(\d+)\.(\d+)\.(\d+)$/u.exec(range ?? '');
  return match ? match.slice(1).map(Number) : null;
}

function atLeast(version: readonly number[], floor: readonly number[]): boolean {
  const index = version.findIndex((part, i) => part !== floor[i]);
  return index === -1 || (version[index] ?? 0) > (floor[index] ?? 0);
}

/** Each `- name:` step of a workflow that installs Node, as its own text. */
function setupNodeSteps(workflow: string): string[] {
  return workflow.split(/^\s*- name:/mu).filter((step) => step.includes('actions/setup-node@'));
}

describe('the npm toolchain floor', () => {
  it('declares an npm floor that includes the dependency-flag fix', () => {
    const manifest: unknown = JSON.parse(read('package.json'));
    if (!isPackageJson(manifest)) throw new Error('package.json has no engines field');
    const bound = lowerBound(manifest.engines['npm']);
    expect(bound, 'engines.npm must be a ">=MAJOR.MINOR.PATCH" range').not.toBeNull();
    expect(atLeast(bound ?? [], NPM_FLOOR)).toBe(true);
  });

  it('makes npm enforce that floor', () => {
    const settings = read('.npmrc')
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line !== '' && !line.startsWith('#') && !line.startsWith(';'));
    expect(settings).toContain('engine-strict=true');
  });
});

describe('the pinned Node version', () => {
  const workflows = readdirSync(resolve(ROOT, WORKFLOWS_DIR))
    .filter((name) => /\.ya?ml$/u.test(name))
    .filter((name) => setupNodeSteps(read(`${WORKFLOWS_DIR}/${name}`)).length > 0);

  it('is installed by at least one workflow', () => {
    expect(workflows.length).toBeGreaterThan(0);
  });

  it.each(workflows)('is read from .nvmrc by every setup-node step in %s', (name) => {
    for (const step of setupNodeSteps(read(`${WORKFLOWS_DIR}/${name}`))) {
      expect(step).toMatch(/^\s*node-version-file: \.nvmrc$/mu);
      expect(step).not.toMatch(/^\s*node-version:/mu);
    }
  });
});
