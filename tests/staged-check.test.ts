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
 * staged in part was judged on content the commit did not carry. Each case here stages one text and
 * leaves a different one in the working tree, and proves the runner judges the staged one, in both
 * directions: a staged fault the working tree has fixed still fails, and a working-tree fault that
 * is not staged does not.
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

function git(...args: string[]): void {
  retryRefusedStart(() => execFileSync('git', args, { cwd: repo, env, stdio: 'pipe' }));
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

function check(): { status: number | null; stderr: string } {
  const run = retryRefusedStart(() => {
    const started = spawnSync(process.execPath, [RUNNER], { env, encoding: 'utf8' });
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
    // One path, not the two an `xargs` split made of it.
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
});
