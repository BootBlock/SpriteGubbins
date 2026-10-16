import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { retryRefusedStart } from '../scripts/retryRefusedStart.ts';

/**
 * The pre-commit hook's Prettier and ESLint pass, run end to end over a throwaway repository
 * (issue #448).
 *
 * The hook used to hand the staged paths to both tools, which read the working tree, so a file
 * staged in part was judged on content the commit did not carry. Most cases here stage one text and
 * leave a different one in the working tree, and prove the runner judges the staged one, in both
 * directions: a staged fault the working tree has fixed still fails, and a working-tree fault that
 * is not staged does not. The rest prove it reads the index a commit names, reports a file it cannot
 * parse without stopping, and reads no index entry that is not a regular file.
 *
 * The runner reads git through `GIT_DIR` and `GIT_WORK_TREE`, as `secret-scan-commits.test.ts`
 * explains, but resolves each tool's configuration against this repository's root. So the staged
 * code file is `scripts/staged-check.ts`, a path that exists here and sits in `tsconfig.node.json`,
 * which ESLint's project service needs before it will lint a file with type information.
 */

const RUNNER = resolve(process.cwd(), 'scripts/staged-check.ts');
const CODE = 'scripts/staged-check.ts';
const SPACED = 'scripts/a spaced name.json';

const CLEAN = 'export const answer = 42;\n';
const UNFORMATTED = 'export const answer   =  42\n';
const LINT_ERROR = 'export const answer = 42;\nconst unused = 1;\n';

let scratch: string;
let repo: string;
let env: NodeJS.ProcessEnv;

function git(...args: string[]): string {
  return gitWith(env, undefined, ...args);
}

/** {@link git} under `over`, with `input` on its standard input. */
function gitWith(over: NodeJS.ProcessEnv, input: string | undefined, ...args: string[]): string {
  return retryRefusedStart(() =>
    execFileSync('git', args, {
      cwd: repo,
      env: over,
      encoding: 'utf8',
      stdio: 'pipe',
      ...(input === undefined ? {} : { input }),
    }),
  ).trim();
}

/** Stage `text` at `path` with the index mode `mode`, whatever the working tree holds there. */
function stageEntry(mode: string, path: string, text: string): void {
  const blob = gitWith(env, text, 'hash-object', '-w', '--stdin');
  git('update-index', '--add', '--cacheinfo', `${mode},${blob},${path}`);
}

function write(path: string, content: string): void {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), content);
}

/** Stage `staged` at `path`, then leave `working` in the working tree without staging it. */
function stageThenEdit(path: string, staged: string, working: string): void {
  write(path, staged);
  git('add', '--', path);
  write(path, working);
}

function check(over: NodeJS.ProcessEnv = env): { status: number | null; stderr: string } {
  const run = retryRefusedStart(() => {
    const started = spawnSync(process.execPath, [RUNNER], { env: over, encoding: 'utf8' });
    if (started.error) throw started.error;
    return started;
  });
  return { status: run.status, stderr: run.stderr };
}

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'staged-check-'));
  repo = join(scratch, 'repo');
  mkdirSync(repo);
  env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  Object.assign(env, {
    GIT_DIR: join(repo, '.git'),
    GIT_WORK_TREE: repo,
    GIT_CONFIG_GLOBAL: join(scratch, 'no-global-config'),
    GIT_CONFIG_NOSYSTEM: '1',
  });
  git('init', '-q', '-b', 'main');
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe('staged-check', () => {
  it('fails on an unformatted staged copy that the working tree has since fixed', () => {
    stageThenEdit(CODE, UNFORMATTED, CLEAN);
    stageThenEdit(SPACED, '{"a":1}\n', '{ "a": 1 }\n');
    const { status, stderr } = check();
    expect(status).toBe(1);
    expect(stderr).toContain(`  ${CODE}\n`);
    // One path, not two halves split at the space.
    expect(stderr).toContain(`  ${SPACED}\n`);
    expect(stderr).not.toContain('ESLint failed');
  }, 60_000);

  it('fails on a lint error in the staged copy that the working tree has since removed', () => {
    stageThenEdit(CODE, LINT_ERROR, CLEAN);
    const { status, stderr } = check();
    expect(status).toBe(1);
    expect(stderr).toContain('@typescript-eslint/no-unused-vars');
    expect(stderr).toContain('ESLint failed on the staged copy');
    expect(stderr).not.toContain('Prettier finds');
  }, 60_000);

  it('passes a clean staged copy whatever the working tree holds', () => {
    stageThenEdit(CODE, CLEAN, `${UNFORMATTED}const unused = 1;\n`);
    stageThenEdit(SPACED, '{ "a": 1 }\n', '{"a":1}\n');
    // Prettier ignores Markdown here, and ESLint lints none, so neither judges this one.
    stageThenEdit('notes.md', '*  not   formatted*\n', '');
    expect(check()).toEqual({ status: 0, stderr: '' });
  }, 60_000);

  it('reports a staged file Prettier cannot parse and still runs ESLint', () => {
    stageThenEdit(SPACED, '{"a":\n', '{ "a": 1 }\n');
    stageThenEdit(CODE, LINT_ERROR, CLEAN);
    const { status, stderr } = check();
    expect(status).toBe(1);
    expect(stderr).toContain(`  ${SPACED}: `);
    expect(stderr).toContain('@typescript-eslint/no-unused-vars');
  }, 60_000);

  it('reads the index GIT_INDEX_FILE names, as `git commit -a` and `git commit <paths>` set it', () => {
    stageThenEdit(CODE, CLEAN, CLEAN);
    const commitIndex = { ...env, GIT_INDEX_FILE: join(scratch, 'commit-index') };
    write(CODE, UNFORMATTED);
    gitWith(commitIndex, undefined, 'add', '--', CODE);
    write(CODE, CLEAN);
    expect(check().status).toBe(0);
    const { status, stderr } = check(commitIndex);
    expect(status).toBe(1);
    expect(stderr).toContain(`  ${CODE}\n`);
  }, 60_000);

  it('passes over a staged symlink and submodule, which are not files either tool reads', () => {
    // The symlink's blob would fail Prettier if it were read as a file's text, and the submodule's
    // entry names no blob at all, so reading it would crash the runner.
    stageEntry('120000', 'scripts/linked.ts', UNFORMATTED);
    stageEntry('160000', 'scripts/module.ts', '');
    expect(check()).toEqual({ status: 0, stderr: '' });
  }, 60_000);
});
