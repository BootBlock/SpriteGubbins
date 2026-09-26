import { describe, expect, it } from 'vitest';
import { type Citation, readCitations, readSource } from './commentCitations.ts';
import { declaredNames } from './declaredNames.ts';
import { NAMES_CITED_FROM_ELSEWHERE } from './namesCitedFromElsewhere.ts';
import { scriptSources } from '../scripts/sourceFiles.ts';

/**
 * Whether every code-shaped name a comment cites in backticks is a name something can find.
 *
 * A comment that names a function, constant or field is a pointer, and a maintainer follows it. The
 * quantiser's constants sent a reader to `profilePeriod.ts` for a function no version of the code in
 * this tree declares, and the palette lock's copy to a tooltip key that never existed (issue #436).
 * The first run of this suite found seven more, each a name renamed or deleted while the comment
 * citing it stayed.
 *
 * A name resolves when the project's code spells it — see `readSource` for what counts — or when
 * the platform, a direct dependency or a root config declares it (`declaredNames`). Anything else is
 * either stale or deliberately cited from outside all of those, and the second kind is listed with
 * its reason in {@link NAMES_CITED_FROM_ELSEWHERE}.
 *
 * **It proves a name exists, not that the comment means the thing of that name.** A pointer to the
 * wrong one of two real functions passes, and so does a member path whose last segment exists on
 * some other object. What it closes is the pointer to nothing, which is the one stale reference a
 * reader cannot recognise as stale until they have searched the whole tree for it.
 */
// The list is left out of the reading because its keys are string literals, which would otherwise
// count as the code spelling every name it excuses.
const reading = readCitations(scriptSources().filter((file) => !file.endsWith('namesCitedFromElsewhere.ts')));
const declared = declaredNames();

/** Whether anything this suite can see spells or declares `name`. */
function resolves(name: string): boolean {
  return reading.spelled.has(name) || declared.has(name);
}

/** What `readSource` makes of one fixture: each citation as `line:name`, and what the code spells. */
function readFixture(...lines: string[]): { cited: string[]; spelled: ReadonlySet<string> } {
  const into = { citations: [] as Citation[], spelled: new Set<string>() };
  readSource('fixture.tsx', lines.join('\n'), into);
  return { cited: into.citations.map(({ line, name }) => `${String(line)}:${name}`), spelled: into.spelled };
}

describe('comment name citations', () => {
  it('cites only names the code, the platform or a dependency declares', () => {
    const dangling = reading.citations
      .filter(({ name }) => !resolves(name) && !Object.hasOwn(NAMES_CITED_FROM_ELSEWHERE, name))
      .map(({ file, line, name }) => `${file}:${String(line)} \`${name}\``);
    expect(dangling).toStrictEqual([]);
  });

  it('lists only names a comment still cites and nothing can find', () => {
    // The other direction, which keeps the list from becoming a place stale names hide: an entry
    // whose citation was removed, or whose name the code has since started to spell, is an exemption
    // nothing needs, and the next stale citation of that name would pass under it.
    const cited = new Set(reading.citations.map(({ name }) => name));
    const unneeded = Object.keys(NAMES_CITED_FROM_ELSEWHERE).filter(
      (name) => !cited.has(name) || resolves(name),
    );
    expect(unneeded).toStrictEqual([]);
  });
});

describe('readSource', () => {
  it('reads a comment in every position the compiler puts trivia', () => {
    // Each line is a position one of the rejected walks missed: a node walk misses the comment
    // before a closing brace and the one inside an empty JSX expression, and leading ranges alone
    // miss the comment on the same line as the token before it.
    const { cited } = readFixture(
      '/** A docblock citing `DocName`. */',
      '// A line comment citing `LineName`.',
      'export function f(): number { // A same-line comment citing `SameLineName`.',
      '  return 1;',
      '  // A comment before a closing brace, citing `BraceName`.',
      '}',
      'export const view = <div>{/* An empty JSX expression citing `JsxName`. */}</div>;',
    );
    expect(cited).toStrictEqual(['1:DocName', '2:LineName', '3:SameLineName', '5:BraceName', '7:JsxName']);
  });

  it('reads no comment out of a template or a regex literal', () => {
    // A scanner that does not know where a literal is reads both of these as line comments.
    const { cited } = readFixture(
      'const a = `http://example.com/ `TemplateName``;',
      'const b = /\\/\\/ `RegexName`/u;',
    );
    expect(cited).toStrictEqual([]);
  });

  it('checks each code-shaped segment of a path, and leaves words and files alone', () => {
    const { cited } = readFixture('/* `OUTER_NAME.innerName`, `despeckle`, `oklab.ts` and `Rgba` */');
    expect(cited).toStrictEqual(['1:OUTER_NAME', '1:innerName']);
  });

  it('counts a name as spelled wherever the code states it, declared or not', () => {
    const { spelled } = readFixture(
      "type Mode = 'UNION_MEMBER';",
      'const token = `[IF:TEMPLATE_TOKEN]`;',
      'const pattern = /REGEX_WORD/u;',
      'const node = <p>JSX_WORD</p>;',
    );
    for (const name of ['UNION_MEMBER', 'TEMPLATE_TOKEN', 'REGEX_WORD', 'JSX_WORD']) {
      expect(spelled.has(name), name).toBe(true);
    }
  });
});
