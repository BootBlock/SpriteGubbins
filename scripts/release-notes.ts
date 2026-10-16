/**
 * Prints the body of the GitHub Release for one tag, used by the `tag` job of
 * `.github/workflows/deploy.yml`.
 *
 *   node scripts/release-notes.ts <tag> --repository <owner/name> [--preamble <text>]
 *
 * It reads the history from the repository it sits in, so it needs a checkout that has every
 * commit and every tag — `fetch-depth: 0` in a workflow. The tag must already exist: it is the end
 * of the range, and the release before it, which `previousRelease` picks from `git tag`, is the
 * start.
 *
 * This file is the runner alone: it asks git for the tags and the log, and prints. What the notes
 * say, and which release came before, is `releaseNotes.ts`, which is pure and is where
 * `tests/release-notes.test.ts` exercises it. That suite also runs this runner over a throwaway
 * repository. TypeScript run by node directly, as `scripts/secret-scan.ts` is.
 */
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOG_FORMAT, parseLog, previousRelease, releaseNotes } from './releaseNotes.ts';
import { retryRefusedStart } from './retryRefusedStart.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Run git in the repo root and return stdout as text, starting it again if the machine refuses. */
function git(args: string[]): string {
  return retryRefusedStart(() =>
    execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }),
  );
}

/** The value after `flag` in the arguments, or `undefined` when the flag is absent. */
function option(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

const args = process.argv.slice(2);
const tag = args[0];
const repository = option(args, '--repository');
const preamble = option(args, '--preamble');

if (!tag || tag.startsWith('--') || !repository) {
  console.error('release-notes: usage — `<tag> --repository <owner/name> [--preamble <text>]`.');
  process.exit(2);
}

const previous = previousRelease(git(['tag', '--list', 'v*']).split('\n').filter(Boolean), tag);
const range = previous ? `${previous}..${tag}` : tag;
const commits = parseLog(git(['log', '--reverse', `--format=${LOG_FORMAT}`, '--name-only', range, '--']));

process.stdout.write(`${releaseNotes({ commits, repository, tag, previous, preamble })}\n`);
