import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../src/constants/output/index.ts';
import { PROMPT_TEMPLATE } from '../src/constants/promptTemplate.ts';
import { SUBJECT_FIELD_KEYS, type SubjectDefinition } from '../src/types/subject.ts';
import { spellNumberCapitalised } from '../src/utils/numberWords.ts';
import { generatePrompt } from '../src/utils/promptCompiler.ts';
import { promptConditions } from '../src/utils/promptConditions.ts';
import { sheetFacts } from '../src/utils/promptFacts.ts';
import { applyOptionals } from '../src/utils/templateEngine.ts';
import { codeSpans, documentBlock, markdownTables, oneLine } from './baselinePromptDocument.ts';
import { isInside, sectionNumber, TEMPLATE_GATES, TEMPLATE_LINES, type Gate } from './templateGates.ts';

/**
 * §1 of `docs/todo/baseline-prompt-new.md` — the placeholder conventions — read back against the
 * template and the engine it describes.
 *
 * §3 of that document has been pinned to `PROMPT_TEMPLATE` for as long as the mirror suite has
 * existed, and the prose around it was never checked at all. It drifted the way §3 had, and in the
 * same direction: issue #222 found §1 naming six of the gates the truthy `[IF:KEY]` form serves when
 * the template used it for twenty-three, and saying "both numbered lists" use `[N].` when there were
 * three. Reading the rest of §1 back found a third: it offered a default after an optional's pipe,
 * which the engine has never had. Every one of those was true of some earlier template, and each was
 * overtaken by a commit with no reason to open a plan document.
 *
 * **What is checked is what §1 states as fact about the shipped code** — which forms exist, which
 * gates take which form, where the nesting example sits, what an unset optional emits, which lists
 * are auto-numbered. The arguments for each convention, and the record of v1's `DEFINED` token, are
 * reasoning and history; they are read by nobody here, because rewriting a plan's history to match
 * current practice is what CLAUDE.md forbids.
 *
 * **It pins the claims, not the wording**, in the sense `tests/architecture-figures.test.ts` means:
 * each assertion anchors to a short phrase and derives what the phrase has to say, so an author who
 * has to restore one is an author reading the claim as they go.
 */
const SECTION = '## 1. Placeholder conventions';

const BLANK_SUBJECT = Object.fromEntries(SUBJECT_FIELD_KEYS.map((key) => [key, ''])) as SubjectDefinition;

/** How the document's table writes each form, keyed by the operator the walk reads. */
const FORM_SPELLING: Readonly<Record<Gate['operator'], string>> = {
  '=': '[IF:KEY=A,B]',
  '!=': '[IF:KEY!=A,B]',
  '': '[IF:KEY]',
};

/**
 * Every gate `promptConditions` answers. The configuration is immaterial — the record carries every
 * key whatever the sheet — and it is what "every gate" in §1 means: a key the template gates on
 * without the record answering it would read as unset on every prompt.
 */
const CONDITION_KEYS = Object.keys(
  promptConditions(
    'CHARACTER',
    DEFAULT_OUTPUT_CONFIG,
    sheetFacts('CHARACTER', BLANK_SUBJECT, DEFAULT_OUTPUT_CONFIG),
  ),
);

describe('§1 of the baseline-prompt document describes the placeholders the template uses', () => {
  it('reads every gate the template writes', () => {
    // Guards every check below that reads the walk: a marker in a form its pattern does not know is
    // absent from it, and would be absent from each of those checks too.
    const written = PROMPT_TEMPLATE.split('[IF:').length - 1;

    expect(written).toBeGreaterThan(0);
    expect(TEMPLATE_GATES).toHaveLength(written);
  });

  it('lists the conditional forms the template writes, and no others', () => {
    const block = documentBlock(SECTION, '### `[IF:');
    const forms = (markdownTables(block)[0]?.rows ?? []).map((row) => codeSpans(row[0] ?? '')[0] ?? '');
    const written = new Set(TEMPLATE_GATES.map(({ gate }) => FORM_SPELLING[gate.operator]));

    expect(oneLine(block)).toContain(`${spellNumberCapitalised(forms.length)} forms:`);
    expect(new Set(forms)).toStrictEqual(written);
  });

  it('names the gates the truthy form does not serve, and every other gate takes it', () => {
    const row = (markdownTables(documentBlock(SECTION, '### `[IF:'))[0]?.rows ?? []).find(
      (cells) => codeSpans(cells[0] ?? '')[0] === FORM_SPELLING[''],
    );
    const exceptions = /every gate but (.*?) takes this form/.exec(row?.[1] ?? '')?.[1];
    const truthy = new Set(
      TEMPLATE_GATES.filter(({ gate }) => gate.operator === '').map(({ gate }) => gate.key),
    );

    expect(exceptions, 'The `[IF:KEY]` row no longer says “every gate but … takes this form”.').toBeDefined();
    expect(new Set(TEMPLATE_GATES.map(({ gate }) => gate.key))).toStrictEqual(new Set(CONDITION_KEYS));
    expect([...codeSpans(exceptions ?? '')].sort()).toStrictEqual(
      CONDITION_KEYS.filter((key) => !truthy.has(key)).sort(),
    );
  });

  it('illustrates nesting with blocks the template really nests', () => {
    const prose = oneLine(documentBlock(SECTION, '### `[IF:'));
    const audit = sectionNumber('LAYOUT');
    const checks: readonly (readonly [string, Gate['operator'], string])[] = [
      ['RIG_MODE', '=', 'CUTOUT_RIG'],
      ['RENDER_STYLE', '=', 'PIXEL_ART,RETRO_PIXEL_ART'],
      ['MULTI_DIRECTION', '', ''],
    ];

    expect(prose).toContain(`§${String(audit)}'s self-audit applies only to a target that can act on it`);
    expect(prose).toContain('the rig, pixel-art and directional checks apply only to those sheets');
    for (const [key, operator, operands] of checks) {
      const inAudit = TEMPLATE_GATES.filter(
        (line) =>
          line.section === 'LAYOUT' &&
          line.gate.key === key &&
          line.gate.operator === operator &&
          line.gate.operands === operands,
      );
      expect(inAudit.length, `${key} gates no check in the self-audit`).toBeGreaterThan(0);
      expect(inAudit.every((line) => isInside(line, 'DELIBERATES'))).toBe(true);
    }

    expect(prose).toContain('(`SOCKETS` inside the cut-out rig section)');
    const sockets = TEMPLATE_GATES.filter(({ gate }) => gate.key === 'SOCKETS');
    expect(sockets.length).toBeGreaterThan(0);
    expect(sockets.every((line) => isInside(line, 'RIG_MODE', '=', 'CUTOUT_RIG'))).toBe(true);
  });

  it('shows an optional line the template really writes, and gives it no fallback', () => {
    // Below the heading, whose `[OPTIONAL:NAME | line text]` is the form's grammar rather than an example.
    const prose = oneLine(documentBlock(SECTION, '### `[OPTIONAL:').split('\n').slice(1).join('\n'));
    const examples = codeSpans(prose).filter((span) => /^\[OPTIONAL:[A-Z0-9_]+ \|/.test(span));
    const optionalLines = TEMPLATE_LINES.filter((line) => line.text.includes('[OPTIONAL:'));
    const example = examples[0] ?? '';
    const name = /^\[OPTIONAL:([A-Z0-9_]+)/.exec(example)?.[1] ?? '';

    expect(examples).toHaveLength(1);
    expect(optionalLines.map((line) => oneLine(line.text))).toContain(example);
    // What the sentence corrected in #222 got wrong: the text after the pipe is emitted only when the
    // name is set, so there is no branch a default could be written into.
    expect(prose).toContain('There is no fallback branch: an unset name emits nothing at all');
    expect(applyOptionals(example, { [name]: '' })).toBe('');

    // "Strictly single-line by contract": every optional the template writes opens and closes on one line.
    expect(optionalLines.filter((line) => !/^\[OPTIONAL:[A-Z0-9_]+\s*\|.*\]$/.test(line.text))).toStrictEqual(
      [],
    );

    expect(prose).toContain('The template states the rule itself, at the head of its subject section');
    const subject = TEMPLATE_LINES.filter((line) => line.section === 'SUBJECT').map((line) => line.text);
    expect(oneLine(subject.join('\n'))).toContain('absent from this list is yours to decide');
  });

  it('says every numbered list uses [N]., and the template numbers none by hand', () => {
    const prose = oneLine(documentBlock(SECTION, '### `[N].`'));

    expect(prose).toContain('Every numbered list in §3 uses it.');
    expect(TEMPLATE_LINES.filter((line) => /^\s*\[N\]\./.test(line.text)).length).toBeGreaterThan(0);
    expect(
      TEMPLATE_LINES.filter((line) => /^\s*\d+\.\s/.test(line.text)).map((line) => line.text),
    ).toStrictEqual([]);
  });

  it('numbers before substitution, so a subject field spelling a marker stays as typed', () => {
    const prose = oneLine(documentBlock(SECTION, '### `[N].`'));
    const typed = '[N]. guard';

    expect(prose).toContain('so a subject field containing `[N].` is an odd name rather than a list item');
    expect(
      generatePrompt('CHARACTER', { ...BLANK_SUBJECT, species: typed }, DEFAULT_OUTPUT_CONFIG),
    ).toContain(typed);
  });
});
