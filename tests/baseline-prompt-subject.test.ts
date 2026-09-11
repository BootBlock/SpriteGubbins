import { describe, expect, it } from 'vitest';
import { NO_ADDITIONAL_ANATOMY } from '../src/constants/anatomy.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../src/constants/output/index.ts';
import { DIRECTION_LISTS } from '../src/constants/promptText/camera.ts';
import type { DirectionSet } from '../src/types/rendering.ts';
import { SUBJECT_FIELD_KEYS } from '../src/types/subject.ts';
import { countAnatomyComponents, parseAdditionalAnatomy } from '../src/utils/additionalAnatomy.ts';
import { spellNumber } from '../src/utils/numberWords.ts';
import { generatePrompt } from '../src/utils/promptCompiler.ts';
import { codeSpans, documentBlock, oneLine } from './baselinePromptDocument.ts';
import { BLANK_SUBJECT } from './blankSubject.ts';
import { TEMPLATE_LINES } from './templateGates.ts';

/**
 * §2's subject paragraphs, read back against the template and the anatomy count.
 *
 * The subject line is the one issue #164 corrected by removing its figures, so a fourteenth category
 * leaves it true; what it still claims is which placeholders the subject becomes, and it claimed that
 * `CATEGORY` became an optional line with the rest. It never has — the category names the sheet and
 * the template states it unconditionally.
 *
 * The `ADDITIONAL_ANATOMY` paragraph is the other half. Its worked example counted three components
 * for `Demon Horn ×2, Tail ×1`, which was true of the sheet it was written against; the anatomy has
 * since turned with the trunk on a multi-view sheet, counted once per facing, so the studio's default
 * five-facing sheet gains fifteen. The figures are therefore derived here by compiling both, rather
 * than restated.
 */
const SUBSECTION = ['## 2. Parameters', '### Subject'] as const;

/** The component count section 0 states. */
function componentCount(prompt: string): number {
  return Number(/Exactly (\d+) components/.exec(prompt)?.[1] ?? Number.NaN);
}

/** How many components naming the example anatomy adds to a sheet of this direction set. */
function anatomyAdds(directions: DirectionSet, anatomy: string): number {
  const output = { ...DEFAULT_OUTPUT_CONFIG, directions };
  return (
    componentCount(generatePrompt('CHARACTER', { ...BLANK_SUBJECT, additional_anatomy: anatomy }, output)) -
    componentCount(generatePrompt('CHARACTER', BLANK_SUBJECT, output))
  );
}

describe('§2 of the baseline-prompt document describes the subject the template states', () => {
  it('makes every subject field an optional line, and always states the category', () => {
    const prose = oneLine(documentBlock(...SUBSECTION));
    const optional = new Set(
      TEMPLATE_LINES.flatMap((line) => /^\[OPTIONAL:([A-Z0-9_]+)/.exec(line.text)?.[1] ?? []),
    );
    // The subject section's own line, which is the one the paragraph is about. Other sections quote the
    // category inside their conditional blocks as well, and those say nothing about whether it is stated.
    const stated = TEMPLATE_LINES.filter(
      (line) =>
        line.section === 'SUBJECT' && line.text.includes('[DEFINE:CATEGORY]') && line.enclosing.length === 0,
    );

    expect(prose).toContain('Every `SUBJECT_FIELD_KEYS` entry, in every category, becomes `[OPTIONAL:…]`.');
    expect(SUBJECT_FIELD_KEYS.filter((key) => !optional.has(key.toUpperCase()))).toStrictEqual([]);

    expect(prose).toContain('`CATEGORY` does not: it names the sheet, so the template always states it.');
    expect(optional.has('CATEGORY')).toBe(false);
    expect(stated.map((line) => line.text)).toStrictEqual(['- Category: [DEFINE:CATEGORY]']);
  });

  it('counts additional anatomy by its multiplier, once for every facing the sheet draws', () => {
    const prose = oneLine(documentBlock(...SUBSECTION));
    const example = codeSpans(prose).find((span) => span.includes('×')) ?? '';
    const pieces = parseAdditionalAnatomy(example);
    const [one, five] = (['SINGLE_FRONT', 'FIVE_CLASSIC'] as const).map((set) => ({
      facings: DIRECTION_LISTS[set].length,
      adds: anatomyAdds(set, example),
    }));

    expect(pieces.length).toBeGreaterThan(0);
    expect(prose).toContain(
      `\`${example}\` is ${spellNumber(pieces.length)} entries and ${spellNumber(countAnatomyComponents(pieces))} pieces`,
    );
    expect(one?.adds).toBe(countAnatomyComponents(pieces) * (one?.facings ?? 0));
    expect(five?.adds).toBe(countAnatomyComponents(pieces) * (five?.facings ?? 0));
    expect(prose).toContain(
      `so a ${spellNumber(one?.facings ?? 0)}-facing sheet gains ${spellNumber(one?.adds ?? 0)} components and a ` +
        `${spellNumber(five?.facings ?? 0)}-facing one ${spellNumber(five?.adds ?? 0)} —`,
    );
  });

  it('emits nothing at all for the sentinel that states there is no anatomy', () => {
    const prose = oneLine(documentBlock(...SUBSECTION));
    const sentinel = { ...BLANK_SUBJECT, additional_anatomy: NO_ADDITIONAL_ANATOMY };

    expect(prose).toContain(
      `\`${NO_ADDITIONAL_ANATOMY}\` states that there are none, emitting no line at all`,
    );
    expect(generatePrompt('CHARACTER', sentinel, DEFAULT_OUTPUT_CONFIG)).toBe(
      generatePrompt('CHARACTER', BLANK_SUBJECT, DEFAULT_OUTPUT_CONFIG),
    );
  });
});
