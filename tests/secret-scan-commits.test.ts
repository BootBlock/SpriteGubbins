import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { shape } from './credentialShape.ts';

/**
 * The CI secret scan's history pass, run end to end over a throwaway repository (issue #444).
 *
 * The gate used to run one pass, `--diff` against the empty tree, which compares two trees and so
 * reads only the tip. A credential that one commit added and a later commit in the same push
 * deleted was absent from the tip, so the gate went green while the value sat in public history.
 * This suite builds exactly that history and proves both halves: the tree pass is clean over it,
 * and `--commits` reports the value at the commit that added it.
 *
 * The same history carries the other cases the walk has to get right. A clean merge brings a
 * side's credential in and answers for none of it, because the side's own commit already did. A
 * merge that adds a value of its own while it is being made answers for that. A binary file
 * added and then deleted is read from the commit that added it, not from a tip that lacks it.
 *
 * The runner pins git to this repository's root, so the throwaway repository is reached through
 * `GIT_DIR` and `GIT_WORK_TREE`, which git honours wherever it runs. The inherited `GIT_*` variables
 * are dropped and the global and system configuration are switched off, so neither a hook's
 * environment nor the machine's own git settings can change what the history looks like.
 *
 * **Every process this file starts is one more chance for the machine to refuse to start it**, and
 * under a full parallel run on Windows it sometimes does: a `git` the runner spawns fails with
 * `spawnSync git EPERM` before it has run at all, the runner dies of the uncaught error, and its
 * stderr holds a stack trace rather than a report. So the history is walked once and read by both
 * cases that ask about it, and the commit ids are read back in one `git log` rather than one
 * `rev-parse` per commit. The rarer the spawn, the rarer that refusal; it is the runner's to survive,
 * not this suite's to retry.
 */

const RUNNER = resolve(process.cwd(), 'scripts/secret-scan.ts');

const TOKEN = shape('ghp_', 'e'.repeat(40));
const SIDE_KEY = shape('sk-', 'f'.repeat(24));
const WIDE_KEY = shape('AKIA', 'IOSFODNN7HISTORY');

let scratch: string;
let repo: string;
let env: NodeJS.ProcessEnv;
const commits: Record<string, string> = {};

/** The runner's walk of the whole history the fixture builds, run once for the cases that read it. */
let history: { status: number | null; stderr: string };

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: repo, env, encoding: 'utf8', stdio: 'pipe' }).trim();
}

/** Commit everything in the work tree, with `name` as the message its id is read back under. */
function commit(name: string): void {
  git('add', '-A');
  git('commit', '-q', '--no-verify', '-m', name);
}

/** Remember every commit's id under its message, read back in one walk once the history is built. */
function rememberCommits(): void {
  for (const line of git('log', '--all', '--format=%H %s').split('\n')) {
    const [id = '', ...subject] = line.split(' ');
    commits[subject.join(' ')] = id;
  }
}

/** The id of the commit remembered under `name`. */
function idOf(name: string): string {
  const id = commits[name];
  if (!id) throw new Error(`No commit is remembered as “${name}”.`);
  return id;
}

function write(path: string, content: string | Uint8Array): void {
  writeFileSync(join(repo, path), content);
}

function scan(...args: string[]): { status: number | null; stderr: string } {
  const run = spawnSync(process.execPath, [RUNNER, ...args], { env, encoding: 'utf8' });
  return { status: run.status, stderr: run.stderr };
}

beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), 'secret-scan-commits-'));
  repo = join(scratch, 'repo');
  mkdirSync(repo);
  env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  Object.assign(env, {
    GIT_DIR: join(repo, '.git'),
    GIT_WORK_TREE: repo,
    GIT_CONFIG_GLOBAL: join(scratch, 'no-global-config'),
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Secret Scan Test',
    GIT_AUTHOR_EMAIL: 'BootBlock@users.noreply.github.com',
    GIT_COMMITTER_NAME: 'Secret Scan Test',
    GIT_COMMITTER_EMAIL: 'BootBlock@users.noreply.github.com',
  });
  git('init', '-q', '-b', 'main');

  write('README.md', 'A throwaway repository.\n');
  commit('base');

  // #444 as reported: added in one commit, deleted in the next, pushed together.
  write('config.ts', `export const added = '${TOKEN}';\n`);
  commit('adds');
  unlinkSync(join(repo, 'config.ts'));
  commit('deletes');

  // A side branch whose own commit adds a value, merged cleanly.
  git('checkout', '-q', '-b', 'side');
  write('side.ts', `export const side = '${SIDE_KEY}';\n`);
  commit('side');
  git('checkout', '-q', 'main');
  write('notes.md', 'Main moved on.\n');
  commit('main moves');
  git('merge', '-q', '--no-ff', '-m', 'clean merge', 'side');

  // A merge that adds a value of its own while it is being made.
  git('checkout', '-q', '-b', 'second-side');
  write('other.md', 'Harmless.\n');
  commit('second side');
  git('checkout', '-q', 'main');
  write('notes.md', 'Main moved on again.\n');
  commit('main moves again');
  git('merge', '-q', '--no-ff', '--no-commit', 'second-side');
  write('evil.ts', `export const evil = '${TOKEN}';\n`);
  commit('evil merge');

  // A UTF-16LE file git calls binary, added and then deleted.
  write('wide.txt', new Uint8Array(Buffer.from(`${WIDE_KEY}\n`, 'utf16le')));
  commit('adds wide');
  unlinkSync(join(repo, 'wide.txt'));
  unlinkSync(join(repo, 'side.ts'));
  unlinkSync(join(repo, 'evil.ts'));
  commit('cleans up');

  rememberCommits();
  history = scan('--commits', `${idOf('base')}..HEAD`);
}, 60_000);

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe('secret-scan --commits', () => {
  it('reads a clean tip as clean, which is the whole of what the tree pass can see', () => {
    const emptyTree = execFileSync('git', ['hash-object', '-t', 'tree', '--stdin'], {
      cwd: repo,
      env,
      encoding: 'utf8',
      input: '',
    }).trim();
    expect(scan('--diff', emptyTree).status).toBe(0);
  }, 60_000);

  it('reports each value at the commit that added it, however soon it was deleted', () => {
    const { status, stderr } = history;
    expect(status).toBe(1);
    expect(stderr).toContain('4 suspect entries');
    expect(stderr).toContain(`${idOf('adds')}: export const added = '${TOKEN}';`);
    expect(stderr).toContain(`${idOf('side')}: export const side = '${SIDE_KEY}';`);
    // Two parents, so the value is judged by the merge rule and not as an ordinary commit's own.
    expect(git('rev-list', '--parents', '-n', '1', idOf('evil merge')).split(' ')).toHaveLength(3);
    expect(stderr).toContain(`${idOf('evil merge')}: export const evil = '${TOKEN}';`);
    expect(stderr).toContain(`${idOf('adds wide')}: wide.txt: ${WIDE_KEY}`);
  }, 60_000);

  it('holds a clean merge to nothing, because the side it brought in answered already', () => {
    // Only worth asserting over a walk that reported at all: a runner that died before printing
    // anything would hold every commit to nothing.
    expect(history.stderr).toContain('4 suspect entries');
    expect(history.stderr).not.toContain(idOf('clean merge'));
  }, 60_000);

  it('reads an empty range as clean', () => {
    expect(scan('--commits', 'HEAD..HEAD').status).toBe(0);
  }, 60_000);

  it('fails closed on a range git cannot resolve, rather than scanning nothing', () => {
    expect(scan('--commits', `${'0'.repeat(40)}..HEAD`).status).not.toBe(0);
  }, 60_000);

  it('refuses to run without a range', () => {
    expect(scan('--commits').status).toBe(2);
  }, 60_000);
});
