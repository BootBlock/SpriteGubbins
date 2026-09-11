import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

/**
 * Every rule that needs type information must run on every TypeScript file the repository lints.
 *
 * `@typescript-eslint/no-floating-promises`, `no-misused-promises` and `await-thenable` are the
 * spec's "NO Fire-and-Forget Async Logic" ban made mechanical, and for as long as they existed they
 * ran on `src/` alone. They shared a config block with the React rules because both were written
 * beside a parser pointed at a tsconfig, and the React rules are rightly `src/`-only — so the async
 * rules inherited a scope nobody chose for them. A floating promise or a `forEach(async …)` in
 * `tests/`, in `scripts/` or in `vite.config.ts` passed `npm run lint` with zero errors, while the
 * same two lines in `src/` were two errors (issue #257). `tsc` reports neither shape, so nothing
 * else in the gate did either.
 *
 * It is the lint half of what `tsconfig-strictness.test.ts` guards for the compiler, and it went
 * wrong the same way: nothing related the two scopes, so nothing could notice one was narrower.
 *
 * This suite asks ESLint rather than reading the config. `calculateConfigForFile` is the answer the
 * CLI acts on, so a file it resolves no config for is a file `eslint .` skips, and one it resolves is
 * a file whose enabled rules are exactly the ones returned. Reading the blocks' `files` patterns
 * instead would test a description of the scope rather than the scope, and would pass a pattern that
 * matched nothing.
 *
 * **Which rules are type-aware is read off each rule's own definition**, not kept in a list here.
 * The three above are named only as a floor, so a comparison that stayed green while all three were
 * dropped is still a failure. A type-aware rule added to one directory's block by habit — the way
 * these three were — fails below the day it is added, whoever wrote it.
 *
 * **That reading reaches only a rule that declares itself.** `meta.docs.requiresTypeChecking` is
 * typescript-eslint's convention: every one of its type-aware rules sets it, and ESLint itself
 * defines no such field. A rule from another plugin that reads the TypeScript program without
 * setting it is invisible here, and could sit in one directory's block with this suite green. No
 * plugin this config loads has one today. Adding a plugin with one means teaching this suite to
 * recognise its rules, in the same change.
 *
 * What it cannot judge is whether a rule should be enabled at all. Adding one everywhere satisfies
 * this suite whatever it does; that stays a decision.
 */
const ASYNC_SAFETY: readonly string[] = [
  '@typescript-eslint/no-floating-promises',
  '@typescript-eslint/no-misused-promises',
  '@typescript-eslint/await-thenable',
];

/** Every extension TypeScript compiles, and so every file a type-aware rule could run on. */
const TYPESCRIPT = /\.[cm]?tsx?$/;

/**
 * The files `eslint .` lints that TypeScript does not compile, and so no type-aware rule can reach.
 *
 * Each is a tool's own configuration, loaded by that tool before anything else in the repository
 * runs, and neither holds a line of logic that could leave a promise floating. The list is compared
 * whole, in both directions: a `.js` or `.mjs` file lint picks up anywhere else fails, which is the
 * prompt to write it in TypeScript — the conclusion `tsconfig.node.json` already reached about
 * `scripts/` — and an entry naming a file lint no longer visits fails too, so the list cannot rot
 * into a permission covering nothing.
 */
const OUTSIDE_TYPESCRIPT: readonly string[] = ['eslint.config.js', 'prettier.config.js'];

/** Narrowed rather than cast, because a cast here would assert the shape this suite is reading. */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

/**
 * Every file the repository holds on disk, tracked or not yet added, relative to the root.
 *
 * Git's list rather than a walk of the disk, because a walk descends into `node_modules` and every
 * other worktree's checkout before ESLint's ignores could prune them. The two differ only on a file
 * git ignores that ESLint does not, and nothing git ignores is repository content.
 *
 * **The index still lists a tracked file deleted from the working tree**, until the deletion is
 * staged, and `calculateConfigForFile` matches a path without asking whether a file is there. So a
 * deleted `prettier.config.js` would go on satisfying the exemption list below while `eslint .`,
 * which walks the disk, no longer visits it. The existence check is what keeps the two lists the
 * same list in a tree that is mid-edit.
 */
function repositoryFiles(): string[] {
  const listing = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return listing.split('\0').filter((file) => file !== '' && existsSync(file));
}

/** One enabled rule as ESLint resolved it for one file. */
interface EnabledRule {
  /** The normalised entry — severity, then options — serialised so two files can be compared. */
  readonly setting: string;
  /** `2` is an error, `1` a warning. */
  readonly severity: number;
  /** Whether the rule's definition declares that it cannot run without type information. */
  readonly typeAware: boolean;
}

/** The definition ESLint loaded for a rule id, which names its plugin before the last slash. */
function ruleDefinition(plugins: Readonly<Record<string, unknown>>, id: string): unknown {
  const slash = id.lastIndexOf('/');
  const plugin = plugins[slash === -1 ? '@' : id.slice(0, slash)];
  const rules = isRecord(plugin) ? plugin['rules'] : undefined;
  return isRecord(rules) ? rules[id.slice(slash + 1)] : undefined;
}

/** Whether a rule definition declares `meta.docs.requiresTypeChecking`. */
function requiresTypeChecking(definition: unknown): boolean {
  const meta = isRecord(definition) ? definition['meta'] : undefined;
  const docs = isRecord(meta) ? meta['docs'] : undefined;
  return isRecord(docs) && docs['requiresTypeChecking'] === true;
}

/** Every rule enabled for one file, or `undefined` for a file `eslint .` does not lint. */
async function enabledRules(eslint: ESLint, file: string): Promise<Map<string, EnabledRule> | undefined> {
  const config: unknown = await eslint.calculateConfigForFile(file);
  if (config === undefined) return undefined;
  if (!isRecord(config) || !isRecord(config['rules']) || !isRecord(config['plugins'])) {
    throw new Error(`${file} resolves to a config with no rules or plugins object`);
  }
  const plugins = config['plugins'];
  const enabled = new Map<string, EnabledRule>();
  for (const [id, entry] of Object.entries(config['rules'])) {
    const severity: unknown = Array.isArray(entry) ? entry[0] : undefined;
    if (severity !== 0 && severity !== 1 && severity !== 2) {
      throw new Error(`${file} resolves ${id} to an entry with no numeric severity`);
    }
    if (severity === 0) continue;
    const definition = ruleDefinition(plugins, id);
    if (definition === undefined) throw new Error(`${file} enables ${id}, which no loaded plugin defines`);
    enabled.set(id, {
      setting: JSON.stringify(entry),
      severity,
      typeAware: requiresTypeChecking(definition),
    });
  }
  return enabled;
}

const eslint = new ESLint({ cwd: process.cwd() });
const resolved = await Promise.all(
  repositoryFiles().map(async (file) => ({ file, rules: await enabledRules(eslint, file) })),
);
const linted = new Map(resolved.flatMap(({ file, rules }) => (rules ? [[file, rules] as const] : [])));
const typescriptFiles = [...linted.keys()].filter((file) => TYPESCRIPT.test(file));
const typeAware = [
  ...new Set(
    [...linted.values()].flatMap((rules) =>
      [...rules].filter(([, rule]) => rule.typeAware).map(([id]) => id),
    ),
  ),
].sort();

describe('type-aware lint scope', () => {
  it('reads the files a lint run visits, rather than agreeing perfectly on none', () => {
    for (const root of ['src/', 'tests/', 'scripts/']) {
      expect(
        typescriptFiles.some((file) => file.startsWith(root)),
        `lint visits no TypeScript file under ${root}`,
      ).toBe(true);
    }
    expect(typescriptFiles, 'lint does not visit vite.config.ts').toContain('vite.config.ts');
    expect(typeAware, 'a named async-safety rule is not enabled as a type-aware rule anywhere').toStrictEqual(
      expect.arrayContaining([...ASYNC_SAFETY]),
    );
  });

  it('enables every type-aware rule on every TypeScript file it lints, set the same way', () => {
    for (const id of typeAware) {
      const rules = typescriptFiles.map((file) => ({ file, rule: linted.get(file)?.get(id) }));
      expect(
        rules.filter(({ rule }) => rule === undefined).map(({ file }) => file),
        `${id} is enabled on some TypeScript files and not these`,
      ).toStrictEqual([]);
      const settings = new Set(rules.map(({ rule }) => rule?.setting));
      expect([...settings], `${id} is configured differently across the tree`).toHaveLength(1);
    }
  });

  it('holds the async-safety ban at error, not at warning', () => {
    for (const id of ASYNC_SAFETY) {
      const severities = new Set(typescriptFiles.map((file) => linted.get(file)?.get(id)?.severity));
      expect([...severities], `${id} is not an error on every TypeScript file`).toStrictEqual([2]);
    }
  });

  it('lints nothing TypeScript does not compile except the named configuration files', () => {
    const outside = [...linted.keys()].filter((file) => !TYPESCRIPT.test(file)).sort();
    expect(outside).toStrictEqual([...OUTSIDE_TYPESCRIPT].sort());
  });
});
