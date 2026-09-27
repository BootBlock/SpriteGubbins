/**
 * Prettier and ESLint over the **staged** copy of each file a commit carries, for the local
 * `.githooks/pre-commit` hook.
 *
 *   node scripts/staged-check.ts
 *
 * The hook used to hand the staged paths to `npx prettier --check` and `npx eslint`, and both of
 * those read the working tree (issue #448). A file staged in part was therefore judged on content
 * the commit did not carry: an unformatted hunk staged and then fixed without re-staging passed the
 * hook and failed CI's `format:check`, and an unstaged lint error blocked a clean commit. This runner
 * reads each blob out of the index with `git cat-file` and gives the text to the two tools' APIs,
 * so each file they judge is judged as the commit records it. Reading the index through git also honours the
 * temporary index `git commit -a` and `git commit <paths>` build, which the working tree cannot.
 *
 * The paths come from git as a NUL-separated list, so a path with a space in it is one path.
 *
 * Which files each tool judges is the tool's own answer, not an extension list kept here. A path
 * goes to Prettier when Prettier infers a parser for it and neither `.gitignore` nor
 * `.prettierignore` excludes it, which is how `prettier --check .` chooses. A path goes to ESLint
 * when ESLint does not call it ignored, which in a flat config also means some config block matches
 * it, as `eslint .` chooses. So the hook checks the files CI's `format:check` and `lint` check.
 *
 * **Everything but the judged file still comes from disk.** ESLint's type-aware rules build a
 * program from the nearest tsconfig, and every file in it other than the one being linted is read
 * from the working tree. So are both tools' configuration and ignore files. An unstaged edit to
 * another module, or to `eslint.config.js`, `prettier.config.js` or an ignore file, can therefore
 * change the verdict. CI's `lint` and `format:check` jobs read a clean checkout and have the final
 * say.
 *
 * Git runs against this repository's root, as `secret-scan.ts` does, so `GIT_DIR`, `GIT_WORK_TREE`
 * and `GIT_INDEX_FILE` choose the index it reads. `tests/staged-check.test.ts` uses that to run this
 * runner over a throwaway repository. Exits 1, after printing every problem, when either tool
 * reports one.
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { check, getFileInfo, resolveConfig } from 'prettier';
import { retryRefusedStart } from './retryRefusedStart.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Run git in the repo root and return stdout as text. */
function git(args: string[]): string {
  return retryRefusedStart(() =>
    execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }),
  );
}

/** The index modes of a regular file, the only entries that hold a file's text. */
const FILE_MODES: ReadonlySet<string> = new Set(['100644', '100755']);

/**
 * Every staged path but a deletion, which carries no content to judge, and but an entry that is not
 * a regular file. The lower-case filter is an exclusion rather than an allow-list for the reason
 * `secret-scan.ts` gives: an allow-list once left out `R`, so a renamed and edited file was checked
 * by nothing. A symlink's blob is its target's name and a submodule's entry is no blob at all, and
 * neither is a file `prettier --check .` or `eslint .` reads, so the index's mode drops both.
 */
function stagedPaths(): string[] {
  const modes = new Map<string, string>();
  for (const entry of git(['ls-files', '--stage', '-z']).split('\0')) {
    const tab = entry.indexOf('\t');
    if (tab !== -1) modes.set(entry.slice(tab + 1), entry.slice(0, entry.indexOf(' ')));
  }
  return git(['diff', '--cached', '--name-only', '-z', '--diff-filter=d'])
    .split('\0')
    .filter((path) => FILE_MODES.has(modes.get(path) ?? ''));
}

const texts = new Map<string, string>();

/**
 * The index copy of `path`, which `:path` names, as the text a commit would record. It is read only
 * once a tool claims the path, so a staged image or other large file neither tool judges is never
 * fetched, and it is read once however many tools judge it.
 */
function stagedText(path: string): string {
  let text = texts.get(path);
  if (text === undefined) {
    text = git(['cat-file', 'blob', `:${path}`]);
    texts.set(path, text);
  }
  return text;
}

/**
 * The staged paths Prettier would format and finds unformatted, and each one it cannot parse with
 * the reason. A parse error is reported beside the rest rather than thrown, as `prettier --check`
 * reports it, so one broken file does not hide the others or stop ESLint from running.
 */
async function unformatted(staged: string[]): Promise<string[]> {
  const ignorePath = [join(repoRoot, '.gitignore'), join(repoRoot, '.prettierignore')];
  const found: string[] = [];
  for (const path of staged) {
    const filepath = join(repoRoot, path);
    const info = await getFileInfo(filepath, { ignorePath });
    if (info.ignored || info.inferredParser === null) continue;
    const options = await resolveConfig(filepath, { editorconfig: true });
    try {
      if (!(await check(stagedText(path), { ...options, filepath }))) found.push(path);
    } catch (error) {
      found.push(`${path}: ${error instanceof Error ? (error.message.split('\n')[0] ?? '') : String(error)}`);
    }
  }
  return found;
}

/** ESLint's results for the staged paths it does not ignore, each linted from its staged text. */
async function lintResults(eslint: ESLint, staged: string[]): Promise<ESLint.LintResult[]> {
  const results: ESLint.LintResult[] = [];
  for (const path of staged) {
    const filePath = join(repoRoot, path);
    if (await eslint.isPathIgnored(filePath)) continue;
    results.push(...(await eslint.lintText(stagedText(path), { filePath })));
  }
  return results;
}

const staged = stagedPaths();
let failed = false;

const badFormat = await unformatted(staged);
if (badFormat.length > 0) {
  failed = true;
  console.error('pre-commit: Prettier finds the staged copy of each file below unformatted or unparsable:');
  for (const path of badFormat) console.error(`  ${path}`);
  console.error('Run `npm run format` (or `npx prettier --write <files>`), then stage the files again.');
}

const eslint = new ESLint({ cwd: repoRoot });
const results = await lintResults(eslint, staged);
const report = await (await eslint.loadFormatter('stylish')).format(results);
if (report) console.error(report);
if (results.some((result) => result.errorCount > 0)) {
  failed = true;
  console.error('pre-commit: ESLint failed on the staged copy of the files above.');
  console.error('Fix the reported problems (or run `npm run lint:fix`), then stage the files again.');
}

process.exit(failed ? 1 : 0);
