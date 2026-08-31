import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PLACEHOLDER, isSuspect, scanAddedLines } from '../scripts/secretScan.ts';

/**
 * The secret scanner — the one automated check standing between a credential and a public,
 * permanent history. It backs `.githooks/pre-commit` and the `secret-scan` job that gates every
 * publish, and until #194 it had no test at all, which is how it shipped a placeholder clause that
 * exempted any line carrying a pair of angle brackets.
 *
 * The suite is a table of lines that must be caught and lines that must be let through. The four
 * probe lines from #194 are in it verbatim, so the reported defect cannot come back unnoticed, and
 * so is the general case behind it: a placeholder word anywhere but *inside* the matched value has
 * no bearing on the verdict.
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
const AWS_KEY = shape('AKIA', 'IOSFODNN7SELFTES');
const PRIVATE_KEY = shape('-----BEGIN RSA ', 'PRIVATE KEY-----');
const KV_ASSIGNMENT = shape('password', ": '", 'hunter2hunter2', "'");

/**
 * #194's probe, line for line. The odd-numbered entries are controls the old scanner already
 * caught; the rest carry exactly the same credential with a TypeScript generic or a JSX tag added,
 * and every one of those was reported as clean.
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
 * Each remaining alternative of `PLACEHOLDER`, paired with a credential-shaped value that carries
 * it. Every one has to be demonstrable this way — a word that can only ever appear *elsewhere* on
 * the line exempts nothing now that the span is what is judged, so it is a hole rather than a rule.
 * That is what removed `<[^>]*>` and `noreply`, and the count assertion below is what makes the
 * next addition prove itself.
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
    // A set-level guard. Every alternative has to come with a credential-shaped value carrying it,
    // so the next one added cannot be a word that merely appears near a key — which is exactly what
    // `<[^>]*>` and `noreply` turned out to be.
    expect(PLACEHOLDER.source.split('|')).toEqual(Object.keys(PLACEHOLDER_EXAMPLES));
  });

  it('does not exempt a generic, a JSX tag or a no-reply address', () => {
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

  it('reports every added line that is suspect', () => {
    expect(scanAddedLines(diff)).toEqual([
      `const added = '${GITHUB_TOKEN}';`,
      `const alsoAdded = '${AWS_KEY}';`,
    ]);
  });

  it('ignores context lines, removed lines and the +++ header', () => {
    // The `+++ b/probe.ts` header starts with `+` and is not content; a removed or unchanged line
    // is not new content either. A file path that happened to look credential-shaped would
    // otherwise be reported on every diff that touched it.
    const header = scanAddedLines(`+++ b/${GITHUB_TOKEN}.ts`);
    expect(header).toEqual([]);
    expect(scanAddedLines(` const context = '${GITHUB_TOKEN}';`)).toEqual([]);
    expect(scanAddedLines(`-const removed = '${GITHUB_TOKEN}';`)).toEqual([]);
  });
});

describe('the files that describe credential shapes', () => {
  it('carry no credential-shaped line of their own', () => {
    // These three are the files most likely to trip the scanner by accident, because credential
    // shapes are their whole subject — and a fixture written out in full here would block every
    // commit and every publish from the moment it landed.
    const files = ['tests/secret-scan.test.ts', 'scripts/secretScan.ts', 'scripts/secret-scan.ts'].map(
      (path) => resolve(process.cwd(), path),
    );
    for (const file of files) {
      const suspect = readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => isSuspect(line));
      expect(suspect, file).toEqual([]);
    }
  });
});
