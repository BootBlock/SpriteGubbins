/**
 * The credential shapes this repository blocks, and the judgement applied to each one.
 *
 * Sprite Gubbins is a PUBLIC repository where a committed secret is treated as build-breaking and
 * is effectively permanent once pushed (see CLAUDE.md). This module is the whole of the decision —
 * "is this line credential-shaped, and is what it carries a real value or an example?" — kept pure
 * and separate from `secret-scan.ts`, which is the runner that asks git for a diff and prints the
 * answer. Both consumers of the scanner go through this file, so the local `.githooks/pre-commit`
 * hook and the `secret-scan` job in `.github/workflows/deploy.yml` cannot drift apart.
 *
 * **The placeholder test judges the matched value, never the line it sits on.** It used to judge
 * the line: any placeholder word anywhere on a line excused everything else on it. One of the
 * alternatives was `<[^>]*>`, which was written for `<YOUR_API_KEY>` and matches *every* pair of
 * angle brackets — a JSX tag, a TypeScript generic, an HTML element — so a real key beside a
 * `Record<string, string>` or inside an `<input …/>` was reported as clean. That is issue #194, and
 * the angle-bracket alternative is only the widest instance of it: the word `example` in a comment
 * at the end of a line exempted the same way. Testing the span a `SECRET_PATTERNS` entry actually
 * matched closes the general case, and it is what retires two of the alternatives — for two
 * different reasons. `noreply` was there for the author's `users.noreply.github.com` address, a
 * line that matches no credential shape at all, so once the span is the unit it can never fire.
 * `<[^>]*>` *can* fire inside a span, and goes on redundancy and breadth instead: `<YOUR_API_KEY>`
 * is already caught by `your[_-]`, and every other angle-bracket pair it exempts is one the scanner
 * should never have been asked about.
 *
 * **A line is added content because of where it sits in the diff, not because of what it starts
 * with.** The header skip used to be a `startsWith('+++')` test, which also swallowed an added line
 * whose own first two characters are `++` — so a credential on such a line went unreported in both
 * modes, and a page quoting a unified diff is exactly where one would sit. Tightening the prefix to
 * `'+++ '` does not fix it either, because content opening `++ ` produces the same thing. The walk
 * tracks whether it is inside a hunk instead, which is a property of the format rather than a guess.
 */

/**
 * Generic `key = "value"` / `key: "value"` assignment. Requires a quoted value of 8+ non-space,
 * non-quote characters so short or obviously-templated values don't trip it.
 */
const KV_PATTERN =
  '(password|passwd|secret|token|api[_-]?key|client[_-]?secret|access[_-]?key)["\' ]*[:=][ ]*["\'][^"\' ]{8,}';

/**
 * The credential shapes this blocks. All matched case-insensitively, and all **global**: a line can
 * carry a placeholder in one position and a real value in another, so every match on a line is
 * judged rather than only the first. `String.prototype.matchAll` clones the expression before
 * iterating, so these are safe to share across calls — no `lastIndex` survives from one line to the
 * next. Nothing here may call `.exec` or `.test` on one of them, which would.
 */
export const SECRET_PATTERNS: readonly RegExp[] = [
  /-----BEGIN[ A-Z]*PRIVATE KEY-----/gi,
  /AKIA[0-9A-Z]{16}/gi,
  /sk-[A-Za-z0-9]{20,}/gi,
  /(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}/gi,
  /github_pat_[A-Za-z0-9_]{20,}/gi,
  /xox[baprs]-[A-Za-z0-9-]{10,}/gi,
  /AIza[0-9A-Za-z_-]{35}/gi,
  new RegExp(KV_PATTERN, 'gi'),
];

/**
 * Words that mark a credential-shaped **value** as an example rather than a real one.
 *
 * Every alternative here has to be able to appear *inside* a matched span, because that is the only
 * thing it is ever tested against. `example` earns its place on AWS's own documented key
 * (`AKIAIOSFODNN7EXAMPLE`); `xxxx` and `your[_-]` cover the two placeholders CLAUDE.md tells a
 * contributor to reach for (`sk-xxxx`, `<YOUR_API_KEY>`). An alternative that can only ever match
 * elsewhere on the line is not a placeholder rule — it is a hole, and `tests/secret-scan.test.ts`
 * fails on one rather than leaving the next addition to be judged by eye.
 */
export const PLACEHOLDER = /xxxx|example|placeholder|your[_-]|changeme|redacted|dummy/i;

/**
 * True if `line` carries a credential-shaped value that is not an obvious placeholder.
 *
 * This is where #194's fix lives: the placeholder test is applied to `match[0]`, the substring a
 * pattern matched, and not to `line`. A generic, a JSX tag or a trailing comment on the same line
 * therefore has no bearing on the verdict.
 */
export function isSuspect(line: string): boolean {
  for (const pattern of SECRET_PATTERNS) {
    for (const match of line.matchAll(pattern)) {
      if (!PLACEHOLDER.test(match[0])) return true;
    }
  }
  return false;
}

/**
 * The suspect added lines of a unified diff.
 *
 * `-U0` means no context lines, so inside a hunk every `+…` line is genuinely new content. The two
 * markers that bound a hunk are what says where "inside" is: `@@` opens one, and the `diff --git`
 * of the next file closes it. Nothing else in the format can reach column zero with either prefix —
 * an added line carrying one is written `+@@` or `+diff --git`, a removed line opens `-`, and with
 * `-U0` there are no context lines at all.
 */
export function scanAddedLines(diff: string): string[] {
  const hits: string[] = [];
  let inHunk = false;
  for (const raw of diff.split('\n')) {
    if (raw.startsWith('@@')) {
      inHunk = true;
      continue;
    }
    if (raw.startsWith('diff --git ')) {
      inHunk = false;
      continue;
    }
    if (!inHunk || !raw.startsWith('+')) continue;
    const line = raw.slice(1);
    if (isSuspect(line)) hits.push(line);
  }
  return hits;
}
