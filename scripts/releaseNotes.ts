/**
 * The body of a GitHub Release, written from the commits between two release tags.
 *
 * **GitHub's own generated notes list pull requests, and most of this project's work is not one.**
 * Work lands as a fast-forward of a worktree branch (CLAUDE.md), so the only pull requests are
 * Dependabot's and the occasional outside one. The 0.14.0 notes GitHub wrote listed thirteen of
 * them — twelve dependency bumps — for a release of 719 commits that added the icon library, the
 * overlay sheets and Keep place, none of which a reader of the Releases page could learn of. The
 * commits are the record of what changed, so the notes are written from them.
 *
 * Each commit is filed by the paths it touches, which is a fact about the commit rather than a
 * judgement of its subject line:
 *
 * - **Changes to the app** — a commit that touches a file the app ships: `src/` outside its
 *   colocated tests, `public/`, or `index.html`.
 * - **Tests, tooling and documentation** — every other commit a person wrote.
 * - **Dependency updates** — every commit Dependabot authored, whatever it touches.
 *
 * A merge commit is left out. It brings in commits the list already names, and the merges here are
 * of `main` into a worktree branch, which say nothing a reader needs. Each section lists its commits
 * oldest first, the order the work was done in.
 *
 * This file is pure. `release-notes.ts` asks git for the history and prints what this writes, and
 * `tests/release-notes.test.ts` exercises both.
 */

/** One commit as `git log` reports it, with the paths it touches. */
export interface ReleaseCommit {
  readonly sha: string;
  readonly parents: number;
  readonly author: string;
  readonly subject: string;
  readonly files: readonly string[];
}

/** The longest body GitHub accepts for a release, in characters. */
export const RELEASE_BODY_LIMIT = 125_000;

/** Dependabot's author name on every commit it writes. */
const DEPENDABOT = 'dependabot[bot]';

/** Separates one commit from the next in the log the runner asks for. */
export const RECORD = '\u001e';

/** Separates the fields of one commit's header line. */
export const FIELD = '\u001f';

/** The `git log --format` that {@link parseLog} reads: header fields, then one path per line. */
export const LOG_FORMAT = `${RECORD}%H${FIELD}%P${FIELD}%an${FIELD}%s`;

/** Whether a path is part of what the app ships, rather than a test, a tool or a document. */
export function isAppFile(path: string): boolean {
  if (path === 'index.html' || path.startsWith('public/')) return true;
  return path.startsWith('src/') && !/\.test\.tsx?$/.test(path);
}

/** Every commit in a `git log --format=LOG_FORMAT --name-only` listing. */
export function parseLog(log: string): ReleaseCommit[] {
  return log
    .split(RECORD)
    .filter((record) => record.trim() !== '')
    .map((record) => {
      const [header = '', ...paths] = record.split('\n');
      const [sha = '', parents = '', author = '', subject = ''] = header.split(FIELD);
      return {
        sha,
        parents: parents.split(' ').filter(Boolean).length,
        author,
        subject,
        files: paths.map((path) => path.trim()).filter(Boolean),
      };
    });
}

interface Version {
  readonly core: readonly [number, number, number];
  readonly prerelease: readonly string[];
}

/** A `vMAJOR.MINOR.PATCH[-prerelease]` tag's version, or `undefined` for any other tag. */
function versionOf(tag: string): Version | undefined {
  const match = /^v(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(tag);
  if (!match) return undefined;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] === undefined ? [] : match[4].split('.'),
  };
}

/** One prerelease identifier against another, as semantic versioning orders them. */
function compareIdentifier(a: string, b: string): number {
  const numericA = /^\d+$/.test(a);
  const numericB = /^\d+$/.test(b);
  if (numericA && numericB) return Number(a) - Number(b);
  if (numericA !== numericB) return numericA ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Semantic-versioning order, in which `1.0.0-rc.1` comes before `1.0.0`. */
function compareVersions(a: Version, b: Version): number {
  const core = a.core[0] - b.core[0] || a.core[1] - b.core[1] || a.core[2] - b.core[2];
  if (core !== 0) return core;
  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    return b.prerelease.length - a.prerelease.length;
  }
  for (const [index, identifier] of a.prerelease.entries()) {
    const other = b.prerelease[index];
    // Every identifier so far is equal and `b` has run out, so the longer `a` sorts after it.
    if (other === undefined) return 1;
    const difference = compareIdentifier(identifier, other);
    if (difference !== 0) return difference;
  }
  return a.prerelease.length - b.prerelease.length;
}

/**
 * The release before `tag`: the highest version tag that sorts below it, or `undefined` for the
 * first release.
 *
 * Below `tag`, not the highest other tag, because the two differ whenever the tag being published
 * is not the newest — a rollback re-deploying an older tag, or a catch-up publish of one pushed
 * before its release was written.
 */
export function previousRelease(tags: readonly string[], tag: string): string | undefined {
  const own = versionOf(tag);
  if (!own) throw new Error(`“${tag}” is not a vMAJOR.MINOR.PATCH release tag.`);
  let best: { tag: string; version: Version } | undefined;
  for (const candidate of tags) {
    const version = versionOf(candidate);
    if (!version || compareVersions(version, own) >= 0) continue;
    if (!best || compareVersions(version, best.version) > 0) best = { tag: candidate, version };
  }
  return best?.tag;
}

interface Section {
  readonly heading: string;
  readonly lines: readonly string[];
}

/** One commit as a list item: its subject, then its short id, which GitHub links to the commit. */
function item(commit: ReleaseCommit): string {
  return `- ${commit.subject} (${commit.sha.slice(0, 7)})`;
}

/** One section as Markdown, or as a count of its commits when the whole list cannot fit. */
function render(section: Section, folded: boolean): string {
  const body = folded
    ? `${String(section.lines.length)} commits, which the full changelog below lists.`
    : section.lines.join('\n');
  return `## ${section.heading}\n\n${body}`;
}

/**
 * The release body for `tag`, from the commits since `previous` (or every commit, for the first).
 *
 * `preamble` is the paragraph that opens the body — the deploy workflow's account of where and from
 * which commit it published — and it is written here rather than prepended afterwards so that the
 * limit is measured against the whole body GitHub receives.
 */
export function releaseNotes(options: {
  readonly commits: readonly ReleaseCommit[];
  readonly repository: string;
  readonly tag: string;
  readonly previous: string | undefined;
  readonly preamble?: string | undefined;
}): string {
  const { commits, repository, tag, previous, preamble } = options;
  const own = commits.filter((commit) => commit.parents <= 1);
  const byPerson = own.filter((commit) => commit.author !== DEPENDABOT);
  const sections: Section[] = [
    { heading: 'Changes to the app', lines: byPerson.filter((c) => c.files.some(isAppFile)).map(item) },
    {
      heading: 'Tests, tooling and documentation',
      lines: byPerson.filter((c) => !c.files.some(isAppFile)).map(item),
    },
    { heading: 'Dependency updates', lines: own.filter((c) => c.author === DEPENDABOT).map(item) },
  ].filter((section) => section.lines.length > 0);

  const changelog = previous
    ? `**Full changelog**: https://github.com/${repository}/compare/${previous}...${tag}`
    : `**Full changelog**: https://github.com/${repository}/commits/${tag}`;
  const empty = previous ? `No commits since ${previous}.` : 'No commits.';

  // Fold the least-read sections into a count, last first, until the body fits GitHub's limit.
  const folded = sections.map(() => false);
  const body = (): string =>
    [
      ...(preamble ? [preamble] : []),
      ...(sections.length === 0 ? [empty] : sections.map((s, i) => render(s, folded[i] === true))),
      changelog,
    ].join('\n\n');
  for (let index = sections.length - 1; index >= 0 && body().length > RELEASE_BODY_LIMIT; index--) {
    folded[index] = true;
  }
  return body();
}
