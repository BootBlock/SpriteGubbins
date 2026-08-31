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
 * matched closes the general case, and it is why `PLACEHOLDER` no longer needs `<[^>]*>` (the value
 * `<YOUR_API_KEY>` still carries `YOUR_`) or `noreply` (which was there for the author's
 * `users.noreply.github.com` address, a line that matches no credential shape at all).
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
 * next.
 */
const SECRET_PATTERNS: readonly RegExp[] = [
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
 * elsewhere on the line is not a placeholder rule — it is a hole, which is what the two removed in
 * #194 had become.
 */
export const PLACEHOLDER = /xxxx|example|placeholder|your[_-]|changeme|redacted|dummy/i;

/**
 * Every credential-shaped span on `line` that is not an obvious placeholder.
 *
 * This is where #194's fix lives: the placeholder test is applied to `match[0]`, the substring a
 * pattern matched, and not to `line`. A generic, a JSX tag or a trailing comment on the same line
 * therefore has no bearing on the verdict.
 */
function suspectSpans(line: string): string[] {
  const spans: string[] = [];
  for (const pattern of SECRET_PATTERNS) {
    for (const match of line.matchAll(pattern)) {
      if (!PLACEHOLDER.test(match[0])) spans.push(match[0]);
    }
  }
  return spans;
}

/** True if `line` carries a credential-shaped value that is not an obvious placeholder. */
export function isSuspect(line: string): boolean {
  return suspectSpans(line).length > 0;
}

/**
 * The suspect added lines of a unified diff. `-U0` means no context lines, so every `+…` line
 * (other than the `+++ b/file` header) is genuinely new content.
 */
export function scanAddedLines(diff: string): string[] {
  const hits: string[] = [];
  for (const raw of diff.split('\n')) {
    if (!raw.startsWith('+') || raw.startsWith('+++')) continue;
    const line = raw.slice(1);
    if (isSuspect(line)) hits.push(line);
  }
  return hits;
}
