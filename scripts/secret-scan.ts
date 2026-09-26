/**
 * Credential-shaped secret scanner, used by the local `.githooks/pre-commit` hook and by the
 * `secret-scan` job in `.github/workflows/tests.yml`.
 *
 * Sprite Gubbins is a PUBLIC repository where a committed secret is treated as build-breaking
 * and is effectively permanent once pushed (see CLAUDE.md). The hook is the fast, local first
 * line of defence — but it runs only on a developer's machine, only against what a commit stages,
 * and can be skipped with `git commit --no-verify` or simply by never running `npm install` (which
 * is what wires the hook). It is a safety net, not a guarantee; the other two modes back the CI
 * gate, which runs both of them on every push.
 *
 *   node scripts/secret-scan.ts --staged             # pre-commit: what the staged diff adds
 *   node scripts/secret-scan.ts --diff <baseRef>     # what <baseRef>..HEAD adds
 *   node scripts/secret-scan.ts --commits <range>    # what each commit in <range> adds
 *
 * **`--diff` compares two trees, so it reads neither the commits between them nor any other.** CI
 * runs it against the empty tree, which makes every tracked line of the tip count as added, and
 * that reports whatever is still in the tree. It cannot report a credential that one commit added
 * and a later commit in the same push deleted: the tip no longer has it, but the history does, and
 * the history is what a push makes public (issue #444). `--commits` is the pass that reads it. It
 * walks `git rev-list <range>` and scans each commit against its parents, so the value is reported
 * at the commit that added it however many commits later it was removed.
 *
 * Every mode judges only what a diff *adds* — never the whole tree — so a value that has always
 * lived in a committed fixture is not re-flagged on every unrelated change. For a text file that
 * means its added lines. For a file git calls binary it means the whole file, for the reason the
 * next paragraph gives: git puts no lines of one into a diff at all, so there is no finer unit
 * available than the file itself.
 *
 * **A file git calls binary contributes no lines to a diff, so it is fetched and scanned whole.**
 * That is issue #211: git reports such a file as `Binary files a/… and b/… differ` with no `+`
 * lines at all, so a credential in a UTF-16LE file — or in any file carrying a null byte in its
 * first 8000 bytes, or marked `binary` by `.gitattributes` — passed every mode while the identical
 * value in a UTF-8 file was reported. `--numstat` names those files, `git cat-file` fetches each
 * one's blob, and `scanBytes` judges the bytes.
 *
 * Two consequences of that, both deliberate. There is no added-lines distinction available inside
 * one of these, so the **whole** blob is judged: a binary file already carrying a credential-shaped
 * value is re-reported on every commit that touches it, which is the safe direction for the one
 * check standing between a secret and a public history. And it is the **blob** that is scanned
 * rather than the working tree — `cat-file` applies no textconv and no smudge filter — because the
 * blob is the thing that reaches that history.
 *
 * This file is the runner alone: it resolves what to scan, asks git for it, and reports. The
 * judgement — which shapes count, which values are placeholders, which files git called binary, and
 * what a run of bytes says — is `secretScan.ts`, which is pure and is where
 * `tests/secret-scan.test.ts` exercises it. `tests/secret-scan-commits.test.ts` runs this runner
 * itself, over a throwaway repository, to prove the history pass. TypeScript run by node directly, as
 * `scripts/generate-icons.ts` is: node strips the types, and the file being in a program is what
 * type-checks the runner against the module it calls.
 *
 * Exits non-zero and prints every suspect entry (not just the first) so one run gives the full
 * list — an added line, or `<path>: <value>` where the value came out of a binary file's bytes,
 * prefixed in `--commits` mode with the id of the commit that added it.
 * A false positive is resolved with an obvious placeholder (`<YOUR_API_KEY>`, `sk-xxxx`) — the
 * placeholder exclusions in `secretScan.ts` let example snippets through.
 */
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { retryRefusedStart } from './retryRefusedStart.ts';
import { addedAgainstEveryParent, binaryPaths, scanAddedLines, scanBytes } from './secretScan.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '..');

/**
 * Run git in the repo root and return stdout as text. Every git this runner starts goes through
 * `retryRefusedStart`, so a start the machine refuses under load is tried again, not reported as a
 * crash.
 */
function git(args: string[], input?: string): string {
  return retryRefusedStart(() =>
    execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      ...(input === undefined ? {} : { input }),
    }),
  );
}

/** Run git in the repo root and return stdout as raw bytes, for a blob that is not text. */
function gitBytes(args: string[]): Uint8Array {
  return retryRefusedStart(() => execFileSync('git', args, { cwd: repoRoot, maxBuffer: 256 * 1024 * 1024 }));
}

/**
 * Every status but a deletion, which is the only one that cannot introduce new content.
 *
 * Stated as an exclusion rather than as the allow-list `ACM` it used to be, because an allow-list
 * silently omits whatever is not in it — and it had already silently omitted `R`. Rename detection
 * is on by default, so a `git mv` and an edit in one commit made the whole file a rename the hook
 * never looked at, whatever was added to it. Lower case is git's own spelling for "leave this
 * status out".
 */
const NOT_DELETED = '--diff-filter=d';

/**
 * What one diff adds: its suspect added lines, then every value read out of a binary file it adds
 * or changes. `diffArgs` selects the diff (`--cached`, or two revisions), and `blobRev` names where
 * a binary path's blob is read from. It is empty for the index, so the spec is `:path`, git's own
 * name for the index copy, and it is the diff's newer revision otherwise.
 */
function scanDiff(diffArgs: string[], blobRev: string): string[] {
  const hits = scanAddedLines(git(['diff', '--no-color', '-U0', NOT_DELETED, ...diffArgs]));
  for (const path of binaryPaths(git(['diff', '--numstat', '-z', NOT_DELETED, ...diffArgs]))) {
    for (const value of scanBytes(gitBytes(['cat-file', 'blob', `${blobRev}:${path}`]))) {
      hits.push(`${path}: ${value}`);
    }
  }
  return hits;
}

/**
 * What every commit in `range` adds of its own, each entry prefixed with the commit that added it.
 *
 * Each commit is diffed against each of its parents and keeps only what it adds against all of them
 * (`addedAgainstEveryParent`), so a merge answers for its own content and not for the side it
 * brought in. A root commit has no parent and is diffed against the empty tree, whose id is
 * computed rather than hard-coded because 4b825dc… is correct only for a SHA-1 repository.
 */
function scanCommits(range: string): string[] {
  const emptyTree = git(['hash-object', '-t', 'tree', '--stdin'], '').trim();
  const hits: string[] = [];
  for (const line of git(['rev-list', '--parents', '--end-of-options', range]).split('\n')) {
    const [commit, ...parents] = line.trim().split(' ');
    if (!commit) continue;
    const perParent = (parents.length > 0 ? parents : [emptyTree]).map((parent) =>
      scanDiff([parent, commit], commit),
    );
    for (const hit of addedAgainstEveryParent(perParent)) hits.push(`${commit}: ${hit.trim()}`);
  }
  return hits;
}

const args = process.argv.slice(2);
const diffIndex = args.indexOf('--diff');
const commitsIndex = args.indexOf('--commits');

let hits: string[];
let where: string;
if (args.includes('--staged')) {
  hits = scanDiff(['--cached'], '');
  where = 'staged changes';
} else if (diffIndex !== -1) {
  const baseRef = args[diffIndex + 1];
  if (!baseRef) {
    console.error('secret-scan: --diff requires a base ref, e.g. `--diff origin/main`.');
    process.exit(2);
  }
  hits = scanDiff([baseRef, 'HEAD'], 'HEAD');
  where = `changes since ${baseRef}`;
} else if (commitsIndex !== -1) {
  const range = args[commitsIndex + 1];
  if (!range) {
    console.error('secret-scan: --commits requires a range, e.g. `--commits origin/main..HEAD`.');
    process.exit(2);
  }
  hits = scanCommits(range);
  where = `the commits in ${range}`;
} else {
  console.error('secret-scan: usage — `--staged`, `--diff <baseRef>` or `--commits <revisionRange>`.');
  process.exit(2);
}

if (hits.length > 0) {
  console.error(
    `secret-scan: possible secret in ${where} — ${hits.length} suspect entr${hits.length === 1 ? 'y' : 'ies'}.`,
  );
  console.error('This is a PUBLIC repository; a secret is effectively permanent once pushed.');
  console.error('Each entry is an added line, or `<path>: <value>` read from a binary file.');
  if (commitsIndex !== -1) console.error('Each one is prefixed with the commit that added it.');
  console.error('Review each one and remove the secret or replace it with a placeholder:');
  for (const hit of hits) console.error(`  ${hit.trim()}`);
  console.error('False positive? Use a placeholder (<YOUR_API_KEY>, sk-xxxx).');
  process.exit(1);
}

process.exit(0);
