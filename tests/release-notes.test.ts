import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  FIELD,
  isAppFile,
  parseLog,
  previousRelease,
  RECORD,
  RELEASE_BODY_LIMIT,
  releaseNotes,
  type ReleaseCommit,
} from '../scripts/releaseNotes.ts';
import { retryRefusedStart } from '../scripts/retryRefusedStart.ts';

/**
 * The release notes the deploy workflow publishes, written from commits rather than pull requests.
 *
 * GitHub's generated notes for 0.14.0 listed eighteen pull requests, seventeen of them dependency
 * bumps, for a release of 522 commits besides merges: work here lands as a fast-forward, so almost
 * none of it is a pull request. These cases pin what replaced them — which commits each section
 * takes, which release a tag is measured from, and that the body fits the limit GitHub sets — and
 * the last suite runs the runner over a throwaway repository, so the log format it asks git for is
 * the one the parser reads.
 */

function commit(subject: string, files: readonly string[], author = 'Joe Cox', parents = 1): ReleaseCommit {
  return { sha: `${subject.length.toString(16).padStart(7, '0')}abcdef`, parents, author, subject, files };
}

describe('isAppFile', () => {
  it.each(['src/App.tsx', 'src/constants/ui.ts', 'public/coi-bootstrap.js', 'index.html'])(
    'ships %s',
    (path) => {
      expect(isAppFile(path)).toBe(true);
    },
  );

  it.each([
    'src/constants/ui.test.ts',
    'src/App.test.tsx',
    'tests/module-size.test.ts',
    'scripts/secret-scan.ts',
  ])('does not ship %s', (path) => {
    expect(isAppFile(path)).toBe(false);
  });
});

describe('previousRelease', () => {
  const tags = [
    'v0.1.0',
    'v0.11.0',
    'v0.12.0',
    'v0.13.0',
    'v0.14.0',
    'v1.0.0-rc.1',
    'v1.0.0-rc.2',
    'not-a-release',
  ];

  it('takes the highest tag below, ordering numerically rather than as text', () => {
    expect(previousRelease(tags, 'v0.12.0')).toBe('v0.11.0');
    expect(previousRelease(tags, 'v0.11.0')).toBe('v0.1.0');
  });

  it('measures an older tag from the one below it, not from the newest', () => {
    expect(previousRelease(tags, 'v0.13.0')).toBe('v0.12.0');
  });

  it('orders a prerelease before its release, and after the release below it', () => {
    expect(previousRelease(tags, 'v1.0.0')).toBe('v1.0.0-rc.2');
    expect(previousRelease(tags, 'v1.0.0-rc.2')).toBe('v1.0.0-rc.1');
    expect(previousRelease(tags, 'v1.0.0-rc.1')).toBe('v0.14.0');
  });

  it('has nothing before the first release', () => {
    expect(previousRelease(tags, 'v0.1.0')).toBeUndefined();
  });

  it('refuses a tag that is not a release', () => {
    expect(() => previousRelease(tags, 'latest')).toThrow('not a vMAJOR.MINOR.PATCH release tag');
  });
});

describe('releaseNotes', () => {
  const notes = (commits: readonly ReleaseCommit[], previous: string | null = 'v0.13.0'): string =>
    releaseNotes({
      commits,
      repository: 'BootBlock/SpriteGubbins',
      tag: 'v0.14.0',
      previous: previous ?? undefined,
    });

  it('files each commit by the paths it touches, and Dependabot’s apart', () => {
    const body = notes([
      commit('Add the icon library', ['src/stores/useIconStore.ts', 'src/stores/useIconStore.test.ts']),
      commit('Split a slow sweep', ['src/utils/sweep.test.ts', 'tests/sweep.test.ts']),
      commit(
        'Bump vite from 8.0.0 to 8.1.0 (#500)',
        ['package.json', 'package-lock.json'],
        'dependabot[bot]',
      ),
    ]);
    const [app = '', tooling = '', dependencies = ''] = body.split('## ').slice(1);

    expect(app).toMatch(/^Changes to the app\n\n- Add the icon library \(\w{7}\)\n/);
    expect(tooling).toMatch(/^Tests, tooling and documentation\n\n- Split a slow sweep \(\w{7}\)\n/);
    expect(dependencies).toMatch(
      /^Dependency updates\n\n- Bump vite from 8\.0\.0 to 8\.1\.0 \(#500\) \(\w{7}\)\n/,
    );
  });

  it('leaves merge commits out', () => {
    const body = notes([
      commit('Merge main into worktree-icons', [], 'Joe Cox', 2),
      commit('Add the icon library', ['src/App.tsx']),
    ]);
    expect(body).not.toContain('Merge main');
    expect(body).toContain('Add the icon library');
  });

  it('keeps each section oldest first, as the log gives them', () => {
    const body = notes([commit('First', ['src/a.ts']), commit('Second', ['src/b.ts'])]);
    expect(body.indexOf('First')).toBeLessThan(body.indexOf('Second'));
  });

  it('opens with the preamble and closes with the comparison', () => {
    const body = releaseNotes({
      commits: [commit('Add the icon library', ['src/App.tsx'])],
      repository: 'BootBlock/SpriteGubbins',
      tag: 'v0.14.0',
      previous: 'v0.13.0',
      preamble: 'Deployed to https://bootblock.github.io/SpriteGubbins/.',
    });
    expect(body.startsWith('Deployed to https://bootblock.github.io/SpriteGubbins/.\n\n## ')).toBe(true);
    expect(body.endsWith('https://github.com/BootBlock/SpriteGubbins/compare/v0.13.0...v0.14.0')).toBe(true);
  });

  it('links the first release to its history, and says when nothing changed', () => {
    expect(notes([], null)).toBe(
      'No commits.\n\n**Full changelog**: https://github.com/BootBlock/SpriteGubbins/commits/v0.14.0',
    );
    expect(notes([])).toContain('No commits since v0.13.0.');
  });

  it('folds the least-read sections into a count until the body fits GitHub’s limit', () => {
    const subject = 'x'.repeat(200);
    const many = (count: number, files: readonly string[], author?: string): ReleaseCommit[] =>
      Array.from({ length: count }, () => commit(subject, files, author));
    const body = notes([
      ...many(300, ['src/App.tsx']),
      ...many(300, ['tests/a.test.ts']),
      ...many(300, ['package.json'], 'dependabot[bot]'),
    ]);

    expect(body.length).toBeLessThanOrEqual(RELEASE_BODY_LIMIT);
    expect(body).toContain('## Dependency updates\n\n300 commits, which the full changelog below lists.');
    expect(body).toContain('## Tests, tooling and documentation\n\n300 commits');
    expect(body.match(/^- /gm)).toHaveLength(300);
  });
});

describe('parseLog', () => {
  const A = 'a'.repeat(40);
  const B = 'b'.repeat(40);

  it('reads the header fields and every path, and ignores blank lines', () => {
    const log = `${RECORD}${A}${FIELD}p1${FIELD}Joe Cox${FIELD}One\n\nsrc/a.ts\nsrc/b.ts\n${RECORD}${B}${FIELD}p1 p2${FIELD}Joe Cox${FIELD}Merge\n`;
    expect(parseLog(log)).toEqual([
      { sha: A, parents: 1, author: 'Joe Cox', subject: 'One', files: ['src/a.ts', 'src/b.ts'] },
      { sha: B, parents: 2, author: 'Joe Cox', subject: 'Merge', files: [] },
    ]);
  });

  it.each([
    ['a header with a field missing', `${RECORD}${A}${FIELD}p1${FIELD}Joe Cox\n`],
    ['a header that is not led by a commit id', `${RECORD}HEAD${FIELD}p1${FIELD}Joe Cox${FIELD}One\n`],
  ])('refuses %s', (_, log) => {
    expect(() => parseLog(log)).toThrow('cannot read');
  });
});

describe('the release-notes runner', () => {
  const RUNNER = resolve(process.cwd(), 'scripts/release-notes.ts');
  let scratch: string;
  let repo: string;
  let env: NodeJS.ProcessEnv;

  function git(...args: string[]): string {
    return retryRefusedStart(() =>
      execFileSync('git', args, { cwd: repo, env, encoding: 'utf8', stdio: 'pipe' }),
    );
  }

  function change(path: string, subject: string, author = 'Release Notes Test'): void {
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), `${subject}\n`);
    git('add', '-A');
    git(
      'commit',
      '-q',
      '--no-verify',
      `--author=${author} <BootBlock@users.noreply.github.com>`,
      '-m',
      subject,
    );
  }

  function run(...args: string[]): { status: number | null; stdout: string; stderr: string } {
    return retryRefusedStart(() => {
      const started = spawnSync(process.execPath, [RUNNER, ...args], { env, encoding: 'utf8' });
      if (started.error) throw started.error;
      return started;
    });
  }

  beforeAll(() => {
    scratch = mkdtempSync(join(tmpdir(), 'release-notes-'));
    repo = join(scratch, 'repo');
    mkdirSync(repo);
    env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
    Object.assign(env, {
      GIT_DIR: join(repo, '.git'),
      GIT_WORK_TREE: repo,
      GIT_CONFIG_GLOBAL: join(scratch, 'no-global-config'),
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_AUTHOR_NAME: 'Release Notes Test',
      GIT_AUTHOR_EMAIL: 'BootBlock@users.noreply.github.com',
      GIT_COMMITTER_NAME: 'Release Notes Test',
      GIT_COMMITTER_EMAIL: 'BootBlock@users.noreply.github.com',
    });
    git('init', '-q', '-b', 'main');

    change('README.md', 'Before the first release');
    git('tag', '-a', 'v0.1.0', '-m', 'v0.1.0');
    change('src/App.tsx', 'Add the icon library');
    git('checkout', '-q', '-b', 'side');
    change('tests/a.test.ts', 'Test the icon library');
    git('checkout', '-q', 'main');
    change('package.json', 'Bump vite from 8.0.0 to 8.1.0 (#500)', 'dependabot[bot]');
    git('merge', '-q', '--no-ff', '-m', 'Merge side into main', 'side');
    git('tag', '-a', 'v0.2.0', '-m', 'v0.2.0');
    change('src/later.ts', 'After the release');
    git('tag', '-a', 'v0.3.0', '-m', 'v0.3.0');
  }, 60_000);

  afterAll(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  it('writes the notes for the commits between a tag and the release before it', () => {
    const { status, stdout } = run(
      'v0.2.0',
      '--repository',
      'BootBlock/SpriteGubbins',
      '--preamble',
      'Deployed.',
    );
    expect(status).toBe(0);
    expect(stdout).toMatch(/^Deployed\.\n\n## Changes to the app\n\n- Add the icon library \(\w{7}\)\n\n/);
    expect(stdout).toContain('## Tests, tooling and documentation\n\n- Test the icon library');
    expect(stdout).toContain('## Dependency updates\n\n- Bump vite from 8.0.0 to 8.1.0 (#500)');
    expect(stdout).not.toContain('Before the first release');
    expect(stdout).not.toContain('After the release');
    expect(stdout).not.toContain('Merge side');
    expect(stdout.endsWith('/compare/v0.1.0...v0.2.0\n')).toBe(true);
  });

  it('writes the first release from every commit up to its tag', () => {
    const { status, stdout } = run('v0.1.0', '--repository', 'BootBlock/SpriteGubbins');
    expect(status).toBe(0);
    expect(stdout).toContain('- Before the first release');
    expect(stdout.endsWith('/commits/v0.1.0\n')).toBe(true);
  });

  it('refuses to run without a tag and a repository', () => {
    const { status, stderr } = run('v0.2.0');
    expect(status).toBe(2);
    expect(stderr).toContain('usage');
  });
});
