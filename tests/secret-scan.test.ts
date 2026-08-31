import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PLACEHOLDER, SECRET_PATTERNS, isSuspect, scanAddedLines } from '../scripts/secretScan.ts';

/**
 * The secret scanner — the one automated check standing between a credential and a public,
 * permanent history. It backs `.githooks/pre-commit` and the `secret-scan` job that gates every
 * publish, and until #194 it had no test at all, which is how it shipped a placeholder clause that
 * exempted any line carrying a pair of angle brackets.
 *
 * The suite is a table of lines that must be caught and lines that must be let through. All seven
 * of #194's probe lines are in it, so the reported defect cannot come back unnoticed, and so is the
 * general case behind it: a placeholder word anywhere but *inside* the matched value has no bearing
 * on the verdict.
 *
 * One further false negative, found while reviewing that fix, is covered here too: an added line
 * whose own content opens `++`, which the old `startsWith('+++')` header skip swallowed. The other
 * — the statuses the runner asks git for, which omitted a rename — is in `secret-scan.ts`, and that
 * file has no seam this suite can reach, so it is verified by running the runner over a staged
 * rename instead.
 */

/**
 * Assemble a credential-shaped value at run time.
 *
 * Nothing in this file may be credential-shaped **as written**. The scanner under test is what the
 * pre-commit hook runs over every staged diff and what the deploy workflow runs over the whole
 * tree, so a fixture spelled out in full would block the commit that introduced it and every
 * publish afterwards. Joining the pieces here keeps the shape out of the source line and puts it
 * back in the value, and `the files that describe credential shapes` below is what proves the
 * arrangement actually holds rather than being asserted.
 */
function shape(...pieces: string[]): string {
  return pieces.join('');
}

/** One fixture per shape in `SECRET_PATTERNS`. None is a real credential. */
const GITHUB_TOKEN = shape('ghp_', 'a'.repeat(40));
const GITHUB_PAT = shape('github_pat_', 'b'.repeat(24));
const OPENAI_KEY = shape('sk-', 'c'.repeat(24));
const GOOGLE_KEY = shape('AIza', 'd'.repeat(35));
const SLACK_TOKEN = shape('xoxb-', '1'.repeat(12));
const AWS_KEY = shape('AKIA', 'IOSFODNN7SELFTEST');
const PRIVATE_KEY = shape('-----BEGIN RSA ', 'PRIVATE KEY-----');
const KV_ASSIGNMENT = shape('password', ": '", 'hunter2hunter2', "'");

/**
 * #194's probe, line for line. Entries 1, 4 and 6 are the controls the old scanner already caught;
 * entries 2, 3, 5 and 7 carry exactly the same credential with a TypeScript generic or a JSX tag
 * added, and every one of those four was reported as clean.
 */
const PROBE_LINES = [
  `const control = '${GITHUB_TOKEN}';`,
  `const generic = new Map<string, string>([['t', '${GITHUB_TOKEN}']]);`,
  `const jsx = <input defaultValue="${GITHUB_TOKEN}" />;`,
  `const awsControl = '${AWS_KEY}';`,
  `const awsGeneric: Array<string> = ['${AWS_KEY}'];`,
  `const kvControl = { ${KV_ASSIGNMENT} };`,
  `const kvGeneric: Record<string, string> = { ${KV_ASSIGNMENT} };`,
];

/**
 * Each remaining alternative of `PLACEHOLDER`, paired with a credential-shaped value that carries it
 * inside the span a `SECRET_PATTERNS` entry matches. Every one has to be demonstrable that way — a
 * word that can only ever appear *elsewhere* on the line exempts nothing now that the span is what
 * is judged, so it is a hole rather than a rule. That is what retired `noreply`, and the guard below
 * is what makes the next addition prove itself.
 */
const PLACEHOLDER_EXAMPLES: Record<string, string> = {
  xxxx: shape('sk-', 'xxxxxxxxxxxxxxxxxxxxxxxx'),
  example: 'AKIAIOSFODNN7EXAMPLE',
  placeholder: shape('api_key', ' = "', 'placeholder-value-here', '"'),
  'your[_-]': shape('api_key', ' = "', '<YOUR_API_KEY>', '"'),
  changeme: shape('password', ': "', 'changeme-before-first-run', '"'),
  redacted: shape('client_secret', ': "', 'REDACTED-BY-THE-LOG-SCRUBBER', '"'),
  dummy: shape('access_key', ': "', 'dummy-key-for-the-fixture', '"'),
};

describe('isSuspect', () => {
  it('catches every credential shape the scanner knows', () => {
    const caught = [
      `const a = '${GITHUB_TOKEN}';`,
      `const b = '${GITHUB_PAT}';`,
      `const c = '${OPENAI_KEY}';`,
      `const d = '${GOOGLE_KEY}';`,
      `const e = '${SLACK_TOKEN}';`,
      `const f = '${AWS_KEY}';`,
      PRIVATE_KEY,
      `const g = { ${KV_ASSIGNMENT} };`,
    ];
    expect(caught.filter((line) => !isSuspect(line))).toEqual([]);
  });

  it('catches a credential beside a TypeScript generic or a JSX tag (#194)', () => {
    // The reported defect. All seven of the probe's lines carry a real shape; the old scanner
    // reported three, because `<[^>]*>` matched `Map<string, string>`, `Array<string>`,
    // `Record<string, string>` and `<input …/>` and excused the whole line.
    expect(PROBE_LINES.filter((line) => !isSuspect(line))).toEqual([]);
  });

  it('judges the matched value, not the rest of the line', () => {
    // The general case behind #194: a placeholder word outside the matched span exempts nothing,
    // whichever alternative it is. Each of these carries a real shape and an innocent word.
    expect(isSuspect(`const key = '${GITHUB_TOKEN}'; // example of what not to commit`)).toBe(true);
    expect(isSuspect(`const key = '${GITHUB_TOKEN}'; // your_key goes here`)).toBe(true);
    expect(isSuspect(`// placeholder for the real one: ${OPENAI_KEY}`)).toBe(true);
    expect(isSuspect(`const dummyRun = '${AWS_KEY}';`)).toBe(true);
  });

  it('judges every match on a line, not only the first', () => {
    // A line can carry a placeholder in one position and a real value in another. Stopping at the
    // first match would take the verdict from the wrong one — which is why the patterns are global.
    const line = `const keys = ['${PLACEHOLDER_EXAMPLES['xxxx']}', '${OPENAI_KEY}'];`;
    expect(isSuspect(line)).toBe(true);
  });

  it('lets an obvious placeholder value through', () => {
    const passed = Object.values(PLACEHOLDER_EXAMPLES);
    expect(passed.filter((line) => isSuspect(line))).toEqual([]);
  });

  it('leaves a line carrying no credential shape alone', () => {
    const clean = [
      'const generic = new Map<string, string>();',
      'const jsx = <input defaultValue="a name" />;',
      '"author": "Joe Cox <BootBlock@users.noreply.github.com>",',
      shape('password', ": '", 'short', "'"),
      "const sk = 'sk-short';",
      'const notAKey = { AKIA: 1 };',
    ];
    expect(clean.filter((line) => isSuspect(line))).toEqual([]);
  });
});

describe('PLACEHOLDER', () => {
  it('holds one alternative per demonstrated example', () => {
    expect(PLACEHOLDER.source.split('|')).toEqual(Object.keys(PLACEHOLDER_EXAMPLES));
  });

  it('carries no alternative a credential-shaped value cannot demonstrate', () => {
    // The set-level guard; the assertion above is only its bookkeeping half. What makes an
    // alternative a placeholder rule rather than a hole is that it can appear *inside* a span a
    // `SECRET_PATTERNS` entry matched, because the span is the only thing it is ever tested
    // against. `noreply` could not, which is what retired it. Pairing each alternative with a value
    // and checking that the names line up proves none of that on its own: a word that matches
    // nowhere, paired with a value that is not credential-shaped, satisfies it.
    for (const [alternative, example] of Object.entries(PLACEHOLDER_EXAMPLES)) {
      const spans = SECRET_PATTERNS.flatMap((pattern) =>
        [...example.matchAll(pattern)].map((match) => match[0]),
      );
      expect(spans, `${alternative}: the example is not credential-shaped`).not.toEqual([]);

      const alternativePattern = new RegExp(alternative, 'i');
      expect(
        spans.filter((span) => !alternativePattern.test(span)),
        `${alternative}: a matched span does not carry it`,
      ).toEqual([]);

      expect(isSuspect(example), `${alternative}: the example is not exempted`).toBe(false);
    }
  });

  it('does not exempt a generic, a JSX tag or a no-reply address', () => {
    // `<[^>]*>` would still pass the guard above, since `<YOUR_API_KEY>` sits inside a matched span,
    // so what retired it is stated here instead: it is redundant beside `your[_-]`, and every other
    // angle-bracket pair it exempts is one the scanner should never have been asked about.
    expect(PLACEHOLDER.test('Record<string, string>')).toBe(false);
    expect(PLACEHOLDER.test('<input defaultValue="x" />')).toBe(false);
    expect(PLACEHOLDER.test('users.noreply.github.com')).toBe(false);
  });
});

describe('scanAddedLines', () => {
  const diff = [
    'diff --git a/probe.ts b/probe.ts',
    '--- a/probe.ts',
    '+++ b/probe.ts',
    '@@ -1,2 +1,3 @@',
    ` const context = '${GITHUB_TOKEN}';`,
    `-const removed = '${OPENAI_KEY}';`,
    `+const added = '${GITHUB_TOKEN}';`,
    `+const alsoAdded = '${AWS_KEY}';`,
    '+const clean = 1;',
  ].join('\n');

  it('reports every added line that is suspect, and no other line', () => {
    // The context line and the removed line carry credentials too. Neither is new content, so
    // neither is judged — that is what keeps a value living in a committed fixture from being
    // re-flagged on every unrelated change.
    expect(scanAddedLines(diff)).toEqual([
      `const added = '${GITHUB_TOKEN}';`,
      `const alsoAdded = '${AWS_KEY}';`,
    ]);
  });

  it('ignores everything outside a hunk, including a credential-shaped path', () => {
    // The `---`/`+++` pair names the file, and the `+++` half opens with `+`. A path that happened
    // to look credential-shaped would otherwise be reported on every diff that touched it.
    const named = ['diff --git a/probe.ts b/probe.ts', '--- a/probe.ts', `+++ b/${GITHUB_TOKEN}.ts`].join(
      '\n',
    );
    expect(scanAddedLines(named)).toEqual([]);
  });

  it('reads an added line whose own content opens with ++', () => {
    // The false negative that replaced the `startsWith('+++')` header skip with hunk tracking. A
    // file line beginning `++` — a page quoting a unified diff is where one sits — is written into
    // the diff with the marker in front, so it arrives as `+++…` and the prefix test discarded it
    // as though it were the header. The credential on it was never scanned, in either mode.
    //
    // The second line is why the fix is not `startsWith('+++ ')`: content opening `++ ` produces a
    // line no prefix can tell from a header. Position in the format is what separates the two, so
    // that is what the walk reads.
    const quoted = [
      'diff --git a/notes.md b/notes.md',
      '--- a/notes.md',
      '+++ b/notes.md',
      '@@ -0,0 +1,2 @@',
      `+++const leaked = '${GITHUB_TOKEN}';`,
      `+++ const alsoLeaked = '${OPENAI_KEY}';`,
    ].join('\n');
    expect(scanAddedLines(quoted)).toEqual([
      `++const leaked = '${GITHUB_TOKEN}';`,
      `++ const alsoLeaked = '${OPENAI_KEY}';`,
    ]);
  });

  it('starts each file afresh, so one file’s hunk cannot swallow the next file’s header', () => {
    const twoFiles = [
      'diff --git a/first.ts b/first.ts',
      '--- a/first.ts',
      '+++ b/first.ts',
      '@@ -0,0 +1 @@',
      `+const first = '${GITHUB_TOKEN}';`,
      `diff --git a/${AWS_KEY}.ts b/${AWS_KEY}.ts`,
      '--- /dev/null',
      `+++ b/${AWS_KEY}.ts`,
      '@@ -0,0 +1 @@',
      `+const second = '${OPENAI_KEY}';`,
    ].join('\n');
    expect(scanAddedLines(twoFiles)).toEqual([
      `const first = '${GITHUB_TOKEN}';`,
      `const second = '${OPENAI_KEY}';`,
    ]);
  });
});

describe('the files that describe credential shapes', () => {
  it('carry no credential-shaped line of their own', () => {
    // These three are the files most likely to trip the scanner by accident, because credential
    // shapes are their whole subject — and a fixture written out in full here would block every
    // commit and every publish from the moment it landed.
    const files = ['tests/secret-scan.test.ts', 'scripts/secretScan.ts', 'scripts/secret-scan.ts'];
    for (const file of files) {
      const suspect = readFileSync(resolve(process.cwd(), file), 'utf8')
        .split('\n')
        .filter((line) => isSuspect(line));
      expect(suspect, file).toEqual([]);
    }
  });
});
