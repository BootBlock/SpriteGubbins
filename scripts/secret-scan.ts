/**
 * Credential-shaped secret scanner, used by the local `.githooks/pre-commit` hook and by the
 * `secret-scan` job in `.github/workflows/tests.yml`.
 *
 * Sprite Gubbins is a PUBLIC repository where a committed secret is treated as build-breaking
 * and is effectively permanent once pushed (see CLAUDE.md). The hook is the fast, local first
 * line of defence — but it runs only on a developer's machine, only against what a commit stages,
 * and can be skipped with `git commit --no-verify` or simply by never running `npm install` (which
 * is what wires the hook). It is a safety net, not a guarantee; the `--diff` mode below is what
 * backs the CI gate, which diffs against the empty tree so the whole tracked tree counts as added.
 *
 *   node scripts/secret-scan.ts --staged          # pre-commit: what the staged diff adds
 *   node scripts/secret-scan.ts --diff <baseRef>  # what <baseRef>..HEAD adds
 *
 * Both modes judge only what a diff *adds* — never the whole tree — so a value that has always
 * lived in a committed fixture is not re-flagged on every unrelated change. For a text file that
 * means its added lines. For a file git calls binary it means the whole file, for the reason the
 * next paragraph gives: git puts no lines of one into a diff at all, so there is no finer unit
 * available than the file itself.
 *
 * **A file git calls binary contributes no lines to a diff, so it is fetched and scanned whole.**
 * That is issue #211: git reports such a file as `Binary files a/… and b/… differ` with no `+`
 * lines at all, so a credential in a UTF-16LE file — or in any file carrying a null byte in its
 * first 8000 bytes, or marked `binary` by `.gitattributes` — passed both modes while the identical
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
 * `tests/secret-scan.test.ts` exercises it. TypeScript run by node directly, as
 * `scripts/generate-icons.ts` is: node strips the types, and the file being in a program is what
 * type-checks the runner against the module it calls.
 *
 * Exits non-zero and prints every suspect entry (not just the first) so one run gives the full
 * list — an added line, or `<path>: <value>` where the value came out of a binary file's bytes.
 * A false positive is resolved with an obvious placeholder (`<YOUR_API_KEY>`, `sk-xxxx`) — the
 * placeholder exclusions in `secretScan.ts` let example snippets through.
 */
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { binaryPaths, scanAddedLines, scanBytes } from './secretScan.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '..');

/** Run git in the repo root and return stdout as text. */
function git(args: string[]): string {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** Run git in the repo root and return stdout as raw bytes, for a blob that is not text. */
function gitBytes(args: string[]): Uint8Array {
  return execFileSync('git', args, { cwd: repoRoot, maxBuffer: 256 * 1024 * 1024 });
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

const args = process.argv.slice(2);
const diffIndex = args.indexOf('--diff');

let diff: string;
let numstat: string;
/** The revision a binary path's blob is read from — the index, or the tip being scanned. */
let blobRev: string;
let where: string;
if (args.includes('--staged')) {
  diff = git(['diff', '--cached', '--no-color', '-U0', NOT_DELETED]);
  numstat = git(['diff', '--cached', '--numstat', '-z', NOT_DELETED]);
  blobRev = '';
  where = 'staged changes';
} else if (diffIndex !== -1) {
  const baseRef = args[diffIndex + 1];
  if (!baseRef) {
    console.error('secret-scan: --diff requires a base ref, e.g. `--diff origin/main`.');
    process.exit(2);
  }
  diff = git(['diff', '--no-color', '-U0', NOT_DELETED, baseRef, 'HEAD']);
  numstat = git(['diff', '--numstat', '-z', NOT_DELETED, baseRef, 'HEAD']);
  blobRev = 'HEAD';
  where = `changes since ${baseRef}`;
} else {
  console.error('secret-scan: usage — `--staged` or `--diff <baseRef>`.');
  process.exit(2);
}

const hits = scanAddedLines(diff);

// The files the diff above could not carry. `blobRev` is empty in staged mode, so the spec is
// `:path` — git's own name for the index copy — and `HEAD:path` otherwise.
for (const path of binaryPaths(numstat)) {
  for (const value of scanBytes(gitBytes(['cat-file', 'blob', `${blobRev}:${path}`]))) {
    hits.push(`${path}: ${value}`);
  }
}

if (hits.length > 0) {
  console.error(
    `secret-scan: possible secret in ${where} — ${hits.length} suspect entr${hits.length === 1 ? 'y' : 'ies'}.`,
  );
  console.error('This is a PUBLIC repository; a secret is effectively permanent once pushed.');
  console.error('Each entry is an added line, or `<path>: <value>` read from a binary file.');
  console.error('Review each one and remove the secret or replace it with a placeholder:');
  for (const hit of hits) console.error(`  ${hit.trim()}`);
  console.error('False positive? Use a placeholder (<YOUR_API_KEY>, sk-xxxx).');
  process.exit(1);
}

process.exit(0);
