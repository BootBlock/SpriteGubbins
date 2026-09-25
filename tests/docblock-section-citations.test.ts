import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Whether the documentation of the prompt's section structure cites a section by number.
 *
 * `promptTemplate.test.ts` holds the template to citing by key, and `prompt-citations.test.ts` the
 * prose it interpolates, and both deliberately read values rather than source, so a comment is never
 * a finding there. That left the two files that explain the numbering free to break it: their
 * docblocks cited some seventy sections by numeral, each true only on the sheets that numeral happened
 * to fit. The RIG section is emitted only on a rig sheet, so every section from ASSEMBLY on carries a
 * different number on the other sheets — the template's own docblock called the exclusions section 8
 * and the self-audit section 9 while an ICON prompt numbered them 7 and 8, beside a sentence saying a
 * section number was never written down anywhere in the file.
 *
 * This reads the source text, comments included, because the comments are what it is about. It is
 * scoped to the two files whose documentation now says a numeral is never written there; a docblock
 * elsewhere that cites a section it does not need to renumber is not this suite's claim.
 */
const FILES = ['src/constants/promptTemplate.ts', 'src/utils/modelWrapperText/sol.ts'] as const;

// The pattern the two suites above use, so the three agree on what a hand-written citation is.
const HAND_WRITTEN = /\bsections? \d/giu;

/**
 * The file with each line break and the comment gutter after it — a docblock's ` * ` or a line
 * comment's `// ` — collapsed to one space, so a citation wrapped as `section` at the end of one
 * line and its numeral at the start of the next is still one match.
 */
function proseOf(path: string): string {
  return readFileSync(path, 'utf8').replaceAll(/\s*\r?\n\s*(?:(?:\*(?!\/)|\/\/)\s*)?/gu, ' ');
}

describe('docblock section citations', () => {
  it.each(FILES)('%s cites every section by key, never by number', (path) => {
    const prose = proseOf(path);
    const numbered = [...prose.matchAll(HAND_WRITTEN)].map((match) =>
      prose.slice(Math.max(0, match.index - 40), match.index + match[0].length + 20),
    );

    expect(numbered, 'cite the section by its key, as in “the LAYOUT section”').toEqual([]);
  });
});
