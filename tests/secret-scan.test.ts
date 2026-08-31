import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PLACEHOLDER,
  SECRET_PATTERNS,
  binaryPaths,
  isSuspect,
  scanAddedLines,
  scanBytes,
} from '../scripts/secretScan.ts';

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
 *
 * `scanBytes` and `binaryPaths` are #211, which is a false negative of a different kind: not a
 * misjudged line but a file the scanner never saw a line of. A diff carries no `+` lines for a file
 * git calls binary, so a token in a UTF-16LE file passed both modes while the identical token in a
 * UTF-8 file was reported. Both halves of the answer are pure and are exercised below — what the
 * bytes say, and which files the runner has to go and fetch.
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

describe('scanBytes', () => {
  /**
   * `text` as the bytes of the named encoding, which is what the file on disk would hold.
   *
   * Written out a character at a time rather than through `Buffer.from`, which knows `utf16le` and
   * neither of the big-endian forms nor UTF-32 at all. Every fixture here is ASCII, so one code
   * unit is one byte and the rest of each unit is zero — which is exactly the property `STRIDES`
   * is built on, so the helper must not borrow it from the code under test.
   */
  function bytes(
    text: string,
    encoding: 'ascii' | 'utf16le' | 'utf16be' | 'utf32le' | 'utf32be',
  ): Uint8Array {
    const width = encoding === 'ascii' ? 1 : encoding.startsWith('utf16') ? 2 : 4;
    const big = encoding.endsWith('be');
    const out = Buffer.alloc(text.length * width);
    for (let i = 0; i < text.length; i += 1) {
      out[i * width + (big ? width - 1 : 0)] = text.charCodeAt(i);
    }
    return out;
  }

  it('reads a credential out of a UTF-16LE file, which is #211 as demonstrated', () => {
    // The reported case. A UTF-16LE file carries a null byte after every ASCII character, so git
    // calls it binary, empties the diff, and `scanAddedLines` is handed nothing to judge.
    expect(scanBytes(bytes(`const t = '${GITHUB_TOKEN}';`, 'utf16le'))).toEqual([GITHUB_TOKEN]);
  });

  it('reads one out of a UTF-16BE file, which the other offset is for', () => {
    // The same file with the byte pairs the other way round. Reading every second byte from offset
    // 0 finds only the zeroes, so the walk reads from offset 1 as well.
    expect(scanBytes(bytes(`const t = '${GITHUB_TOKEN}';`, 'utf16be'))).toEqual([GITHUB_TOKEN]);
  });

  it('reads one out of a UTF-32 file, in either endianness', () => {
    // The gap the review pass found after #211 was closed with two-byte spacings alone. UTF-32
    // spends four bytes on an ASCII character, so git calls such a file binary for the same reason
    // it calls a UTF-16 one binary — with three null bytes per character rather than one — and the
    // walk read straight past it. Covering every offset of every unit size is what closes it, and
    // is why the two-byte and four-byte cases are one rule rather than four hand-written pairs.
    for (const encoding of ['utf32le', 'utf32be'] as const) {
      expect(scanBytes(bytes(`const t = '${GITHUB_TOKEN}';`, encoding)), encoding).toEqual([GITHUB_TOKEN]);
    }
  });

  it('reads one out of a payload that does not begin where the file does', () => {
    // Alignment is the other thing covering every offset buys. A UTF-16LE body after a three-byte
    // header sits on the odd bytes, which is the offset UTF-16BE is read at — the walk does not
    // need to know which of the two it is looking at, only that it tried both.
    const shifted = Buffer.concat([
      Buffer.from([0x00, 0x01, 0x02]),
      bytes(`const t = '${GITHUB_TOKEN}';`, 'utf16le'),
    ]);
    expect(scanBytes(shifted)).toEqual([GITHUB_TOKEN]);
  });

  it('reads one stored as plain bytes inside a genuinely binary file', () => {
    // The general case behind the demonstrated one: any file git calls binary, whatever put the
    // null byte there. A PNG text chunk, a `.pem` with a header, a SQLite page all look like this.
    const file = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from(`const t = '${OPENAI_KEY}';`, 'ascii'),
      Buffer.from([0x00, 0x00]),
    ]);
    expect(scanBytes(file)).toEqual([OPENAI_KEY]);
  });

  it('judges a value the same way the line walk does, so a placeholder is let through', () => {
    // `suspectValues` is the one judgement both walks call. A second opinion about what a
    // placeholder is — reachable only through a binary file — is what having two of them would be.
    const placeholder = PLACEHOLDER_EXAMPLES['xxxx'] ?? '';
    expect(scanBytes(bytes(`const t = '${placeholder}';`, 'utf16le'))).toEqual([]);
  });

  it('never matches across a run boundary', () => {
    // Runs of printable bytes are judged one at a time rather than joined, so a value the file
    // never actually held cannot be assembled out of two halves separated by a null byte. Each
    // half is long enough to survive the minimum-run floor on its own.
    const split = Buffer.concat([
      Buffer.from(GITHUB_TOKEN.slice(0, 22), 'ascii'),
      Buffer.from([0x00]),
      Buffer.from(GITHUB_TOKEN.slice(22), 'ascii'),
    ]);
    expect(scanBytes(split)).toEqual([]);
  });

  it('reports each distinct value once, however many strides found it', () => {
    // An ASCII run is read at every spacing, and a value repeated in a file is found again at each
    // one. The runner prints what it is handed, so the de-duplication is here.
    const twice = Buffer.from(`const a = '${OPENAI_KEY}'; const b = '${OPENAI_KEY}';`, 'ascii');
    expect(scanBytes(twice)).toEqual([OPENAI_KEY]);
  });

  it('bounds what it reports, because the assignment pattern has no upper bound', () => {
    // `[^"' ]{8,}` runs as far as the printable bytes do, and the runner writes the result into a
    // CI log. A 400-character value comes back capped at 120.
    const long = Buffer.from(`password:"${'k'.repeat(400)}"`, 'ascii');
    const [reported] = scanBytes(long);
    expect(reported).toHaveLength(120);
  });

  it('finds nothing in the repository’s own reference sprite sheet', () => {
    // The false-positive half, on real compressed data rather than a fixture. Reading arbitrary
    // bytes at a spacing of two invents text that was never in the file, so the claim that the
    // fifteen-character floor makes that harmless is checked against 1.7 MB of PNG.
    const sheet = readFileSync(resolve(process.cwd(), 'test_sprites/armour.png'));
    expect(scanBytes(sheet)).toEqual([]);
  });
});

describe('binaryPaths', () => {
  it('names the binary files and no others', () => {
    // git writes `-` for both counts when a file is binary — the same judgement that emptied the
    // diff, which is why the runner asks for it rather than guessing at what "binary" means.
    const numstat = ['3\t1\tsrc/App.tsx\0', '-\t-\tpublic/icon-192.png\0', '0\t7\tnotes.md\0'].join('');
    expect(binaryPaths(numstat)).toEqual(['public/icon-192.png']);
  });

  it('takes the new path of a renamed binary file', () => {
    // A rename or a copy writes an empty path field and follows it with the old path and the new
    // one. Taking the old path would ask `cat-file` for a blob at a name that no longer exists —
    // and a rename carrying an edit is exactly the case that retired the runner's status
    // allow-list, so it cannot be dismissed as rare.
    const numstat = '-\t-\t\0old/icon.ico\0new/icon.ico\0';
    expect(binaryPaths(numstat)).toEqual(['new/icon.ico']);
  });

  it('reads a path carrying a space, a quote or a non-ASCII character', () => {
    // `-z` is what makes this safe: the paths arrive raw. Without it git prints such a name in its
    // own shell-quoted form, and the quotes would be read as part of the path.
    const numstat = ['-\t-\ttest_sprites/a sheet.png\0', '-\t-\tpublic/wörk"s.ico\0'].join('');
    expect(binaryPaths(numstat)).toEqual(['test_sprites/a sheet.png', 'public/wörk"s.ico']);
  });

  it('reads an empty listing as no files', () => {
    expect(binaryPaths('')).toEqual([]);
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
