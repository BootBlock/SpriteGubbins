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
 * Every credential-shaped value in `text` that is not an obvious placeholder.
 *
 * This is where #194's fix lives: the placeholder test is applied to `match[0]`, the substring a
 * pattern matched, and not to `text`. A generic, a JSX tag or a trailing comment on the same line
 * therefore has no bearing on the verdict.
 *
 * The whole judgement is here, and both walks below go through it. `scanAddedLines` needs to know
 * only *whether* a line is suspect, because the line is what it reports; `scanBytes` has no line to
 * report and hands back the values themselves, so it needs them. One function answering both is
 * what stops a second walk growing a second opinion about what a placeholder is.
 */
export function suspectValues(text: string): string[] {
  const found: string[] = [];
  for (const pattern of SECRET_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      if (!PLACEHOLDER.test(match[0])) found.push(match[0]);
    }
  }
  return found;
}

/** True if `line` carries a credential-shaped value that is not an obvious placeholder. */
export function isSuspect(line: string): boolean {
  return suspectValues(line).length > 0;
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

/**
 * The printable-ASCII range a credential shape can occupy. Every entry in `SECRET_PATTERNS` is
 * ASCII, which is the whole reason the byte walk below is tractable: it never has to decide what
 * character encoding a file is in, only which bytes could be part of one of these values.
 */
const PRINTABLE_MIN = 0x20;
const PRINTABLE_MAX = 0x7e;

/**
 * The shortest run of printable bytes any pattern above can match, which is 15 — `xox`, one of
 * `baprs`, a dash and ten more; and the generic assignment's `token`, a colon, a quote and eight,
 * arriving at the same figure from the other end. A shorter run is dropped while the walk builds
 * it, and that is not only an optimisation: compressed bytes produce short printable runs
 * constantly, and without the floor a 2 MB PNG would be split into roughly a million one- and
 * two-character fragments for the eight patterns to be run over.
 */
const MIN_RUN = 15;

/**
 * How much of a reported value is printed. The generic assignment's value class is unbounded, so a
 * match inside binary data can run for as long as the printable bytes do, and the runner writes
 * what it is handed into a CI log.
 */
const REPORT_LIMIT = 120;

/**
 * The byte spacings a run is read at: `[stride, offset]`.
 *
 * One byte at a time reads ASCII and UTF-8. Every second byte from offset 0 reads UTF-16LE, and
 * from offset 1 reads UTF-16BE — an ASCII character in either UTF-16 encoding is its own byte plus
 * a zero byte, so taking every second byte is what drops the zero. That covers the case #211
 * demonstrates without the walk detecting an encoding or carrying a decoder.
 *
 * It is deliberately a *superset* of the spacings that will ever be right. Reading ordinary bytes
 * at a spacing of two produces text that was never in the file, so in principle it could invent a
 * credential shape — but every shape here needs at least fifteen consecutive characters from a
 * narrow class, which random bytes reach about once in a million positions before the class
 * constraints are applied at all. A rare false positive is answered with a placeholder; a false
 * negative is a secret in a public history.
 */
const STRIDES: readonly (readonly [stride: number, offset: number])[] = [
  [1, 0],
  [2, 0],
  [2, 1],
];

/**
 * The bytes from `start` (inclusive) to `end` (exclusive) at `stride`, as a string. Built in
 * chunks, so a long run cannot overflow the argument list `String.fromCharCode` is spread into.
 */
function decodeRun(bytes: Uint8Array, start: number, end: number, stride: number): string {
  const chunk: number[] = [];
  let out = '';
  for (let i = start; i < end; i += stride) {
    const code = bytes[i];
    if (code === undefined) break;
    chunk.push(code);
    if (chunk.length === 4096) {
      out += String.fromCharCode(...chunk);
      chunk.length = 0;
    }
  }
  return chunk.length > 0 ? out + String.fromCharCode(...chunk) : out;
}

/**
 * The credential-shaped values in a file's raw bytes, each truncated to `REPORT_LIMIT`.
 *
 * This is the second walk, and it exists because the first one cannot see the file at all. A diff
 * is text, so a file git classifies as binary — a null byte in its first 8000, or a `binary`
 * attribute — contributes no `+` lines to it and reaches `scanAddedLines` as nothing. That is
 * #211: a token in a UTF-16LE file passed both modes of the scanner while the identical token in a
 * UTF-8 file was reported.
 *
 * The walk splits the bytes into runs of printable ASCII at each spacing above and judges each run
 * with the same `suspectValues` the line walk uses, so the two can disagree about a value only by
 * disagreeing about the bytes. A run boundary is a real boundary: runs are judged one at a time
 * rather than joined, so nothing matches across a gap the file never had.
 *
 * **What this does not reach, and cannot.** A credential inside a compressed or encoded stream — a
 * zip, a gzip, a PNG `IDAT` — is not present as bytes at any spacing until something decompresses
 * it, and this does not. It closes every case where the value is *stored*, which is the whole of
 * the demonstrated defect and covers a `.pem`, a SQLite file, a PNG text chunk, and any file whose
 * content is text git happened to call binary. Anything wrapped in a codec still gets past, and
 * the comment in `.github/workflows/deploy.yml` says so rather than claiming the gate is total.
 */
export function scanBytes(bytes: Uint8Array): string[] {
  const found = new Set<string>();
  for (const [stride, offset] of STRIDES) {
    let runStart = -1;
    let length = 0;
    // `end` is the position the run stopped at, one spacing past its last printable byte — and,
    // when the file ends mid-run, past the end of the array. `decodeRun` bounds itself, so the
    // flush is the same call either way.
    const flush = (end: number) => {
      if (runStart !== -1 && length >= MIN_RUN) {
        for (const value of suspectValues(decodeRun(bytes, runStart, end, stride))) {
          found.add(value.slice(0, REPORT_LIMIT));
        }
      }
      runStart = -1;
      length = 0;
    };
    let i = offset;
    for (; i < bytes.length; i += stride) {
      const code = bytes[i];
      if (code !== undefined && code >= PRINTABLE_MIN && code <= PRINTABLE_MAX) {
        if (runStart === -1) runStart = i;
        length += 1;
        continue;
      }
      flush(i);
    }
    flush(i);
  }
  return [...found];
}

/**
 * The paths git reported as binary in the output of `diff --numstat -z`.
 *
 * `--numstat` writes the added and deleted line counts per file, and `-` for both when the file is
 * binary — the same judgement that emptied the diff, asked of the same command, rather than a
 * second guess here at what "binary" means. `-z` is what makes the paths safe to read: they arrive
 * raw and NUL-terminated, where without it a name carrying a quote, a backslash or a non-ASCII
 * character is printed in git's own shell-quoted form.
 *
 * A record is `added`, `deleted` and the path, tab-separated — except for a rename or a copy, where
 * the path field is empty and the two fields that follow are the old path and the new one. The new
 * one is what still exists to be read, and it is the one taken: a rename carrying an edit is a real
 * case, which is what retired the runner's `ACM` status allow-list.
 */
export function binaryPaths(numstat: string): string[] {
  const fields = numstat.split('\0');
  const paths: string[] = [];
  let index = 0;
  while (index < fields.length) {
    const record = fields[index];
    index += 1;
    if (!record) continue;
    const parsed = /^([^\t]*)\t([^\t]*)\t(.*)$/s.exec(record);
    if (!parsed) continue;
    const [, added, deleted, sameName] = parsed;
    let path = sameName;
    if (path === '') {
      index += 1; // the old path of a rename or a copy, which no longer exists to be read
      path = fields[index];
      index += 1;
    }
    if (added === '-' && deleted === '-' && path) paths.push(path);
  }
  return paths;
}
