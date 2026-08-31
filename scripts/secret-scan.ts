/**
 * Credential-shaped secret scanner, used by the local `.githooks/pre-commit` hook and by the
 * `secret-scan` job in `.github/workflows/deploy.yml`.
 *
 * Sprite Gubbins is a PUBLIC repository where a committed secret is treated as build-breaking
 * and is effectively permanent once pushed (see CLAUDE.md). The hook is the fast, local first
 * line of defence — but it runs only on a developer's machine, only against staged lines, and can
 * be skipped with `git commit --no-verify` or simply by never running `npm install` (which is what
 * wires the hook). It is a safety net, not a guarantee; the `--diff` mode below is what backs the
 * CI gate, which diffs against the empty tree so every tracked line counts as added.
 *
 *   node scripts/secret-scan.ts --staged          # pre-commit: added lines of the staged diff
 *   node scripts/secret-scan.ts --diff <baseRef>  # added lines of <baseRef>..HEAD
 *
 * Both modes scan only *added* lines of a diff — never the whole tree — so a value that has
 * always lived in a committed fixture is not re-flagged on every unrelated change; only newly
 * introduced content is judged.
 *
 * This file is the runner alone: it resolves what to scan, asks git for the diff, and reports.
 * The judgement — which shapes count, and which values are placeholders — is `secretScan.ts`,
 * which is pure and is where `tests/secret-scan.test.ts` exercises it. TypeScript run by node
 * directly, as `scripts/generate-icons.ts` is: node strips the types, and the file being in a
 * program is what type-checks the runner against the module it calls.
 *
 * Exits non-zero and prints every suspect line (not just the first) so one run gives the full
 * list. A false positive is resolved with an obvious placeholder (`<YOUR_API_KEY>`, `sk-xxxx`) —
 * the placeholder exclusions in `secretScan.ts` let example snippets through.
 */
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanAddedLines } from './secretScan.ts';

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
let where: string;
if (args.includes('--staged')) {
  diff = git(['diff', '--cached', '--no-color', '-U0', NOT_DELETED]);
  where = 'staged changes';
} else if (diffIndex !== -1) {
  const baseRef = args[diffIndex + 1];
  if (!baseRef) {
    console.error('secret-scan: --diff requires a base ref, e.g. `--diff origin/main`.');
    process.exit(2);
  }
  diff = git(['diff', '--no-color', '-U0', NOT_DELETED, baseRef, 'HEAD']);
  where = `changes since ${baseRef}`;
} else {
  console.error('secret-scan: usage — `--staged` or `--diff <baseRef>`.');
  process.exit(2);
}

const hits = scanAddedLines(diff);

if (hits.length > 0) {
  console.error(`secret-scan: possible secret in ${where} — ${hits.length} suspect line(s).`);
  console.error('This is a PUBLIC repository; a secret is effectively permanent once pushed.');
  console.error('Review each line and remove the secret or replace it with a placeholder:');
  for (const hit of hits) console.error(`  ${hit.trim()}`);
  console.error('False positive? Use a placeholder (<YOUR_API_KEY>, sk-xxxx).');
  process.exit(1);
}

process.exit(0);
