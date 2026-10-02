import { describe, expect, it } from 'vitest';
import { CATEGORY_DIRECTION_SETS } from '../constants/categoryDirectionSets.ts';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { modesFor, sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import { assemblyBaseCases } from '../test/assemblyBaseCases.ts';
import { sectionOf } from '../test/promptSections.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import type { SheetPlan } from '../types/components.ts';
import { generatePrompt } from './promptCompiler.ts';
import { sheetFacts } from './promptFacts.ts';

/**
 * Where each component ends, stated once and only where it is true (issue #402).
 *
 * Section 4's boundary paragraph was unconditional, so a rigid object "drawn whole … never cut into
 * parts" was told two paragraphs later that every entry is "a severed part", and every trunk sheet
 * stated the rule twice — the plan's own paragraph naming the joins, then the template's general
 * one — inside the inventory Sol forwards verbatim. These compile every sheet a reader can reach and
 * hold both halves: a sheet of whole drawings carries no severed-part rule, and a sheet of pieces
 * carries exactly one statement of where a piece ends.
 */

const BOUNDARY_HEADING = '### A component ends at its own boundary';

interface CompiledSheet {
  readonly where: string;
  readonly plan: SheetPlan;
  readonly prompt: string;
}

/**
 * The sheets each case of the sweep compiles, kept so the second test reads what the first compiled.
 *
 * **Keyed by case, not by category**, because the sweep runs one test per case
 * (`assemblyBaseCases`): ICON's cases are whole-catalogue rosters, and a category's worth of them as one
 * test outgrew Vitest's five-second limit on a slow runner. Each case is one subject's sheets.
 */
const compiled = new Map<string, readonly CompiledSheet[]>();

/** Every sheet one subject reaches: each mode, reachable direction set and series position, compiled. */
function sheetsOf(
  name: string,
  category: SubjectCategory,
  subject: SubjectDefinition,
): readonly CompiledSheet[] {
  const cached = compiled.get(name);
  if (cached !== undefined) return cached;
  const sheets = outputsOf(category, subject).map((output) => ({
    where: `${name}/${output.directionalMode}/${output.directions}/${String(output.sheetIndex)}`,
    // The plan the compiler itself resolved, rather than one looked up beside it.
    plan: sheetFacts(category, subject, output).plan,
    prompt: generatePrompt(category, subject, output),
  }));
  compiled.set(name, sheets);
  return sheets;
}

/** Every output configuration that addresses one of the subject's sheets. */
function outputsOf(category: SubjectCategory, subject: SubjectDefinition): readonly OutputConfig[] {
  return modesFor(category, subject).flatMap((directionalMode) =>
    CATEGORY_DIRECTION_SETS[category].flatMap((directions) => {
      const { length } = sheetSeriesFor(category, subject, directionalMode, directions);
      return Array.from({ length }, (_, sheetIndex) => ({
        ...DEFAULT_OUTPUT_CONFIG,
        directionalMode,
        directions,
        sheetIndex,
      }));
    }),
  );
}

const CASES = assemblyBaseCases();

function statesItsEnds(plan: SheetPlan): boolean {
  return plan.groups.some((group) => group.ends !== undefined);
}

describe('where each component ends', () => {
  it.each(CASES)(
    'tells no sheet of whole drawings that an entry is a severed part: %s',
    (name, category, subject) => {
      for (const { where, plan, prompt } of sheetsOf(name, category, subject)) {
        if (plan.extent !== 'WHOLE') continue;

        expect(prompt, where).not.toContain(BOUNDARY_HEADING);
        expect(prompt, where).not.toContain('severed');
        expect(prompt, where).not.toContain('stops at its own joins');
        expect(prompt, where).not.toContain('none carrying another');
        expect(sectionOf(prompt, 'NON-NEGOTIABLE OUTPUT CONTRACT'), where).toContain(
          'each one complete drawing of its own',
        );
        expect(sectionOf(prompt, 'LAYOUT AND SELF-AUDIT'), where).toContain(
          'Every component is one complete drawing, apart from every other',
        );
      }
    },
  );

  it.each(CASES)('states once where a piece ends on every sheet of pieces: %s', (name, category, subject) => {
    for (const { where, plan, prompt } of sheetsOf(name, category, subject)) {
      if (plan.extent !== 'PIECE') continue;
      const inventory = sectionOf(prompt, 'COMPONENT INVENTORY');
      const own = plan.groups.flatMap((group) => (group.ends === undefined ? [] : [group.ends]));

      // The plan's own statement where it has one, printed — read by its first line, which carries no
      // citation for the compiler to resolve — and the generic paragraph exactly where it has none.
      for (const ends of own) expect(inventory, where).toContain(ends.split('\n')[0]);
      expect(inventory.includes(BOUNDARY_HEADING), where).toBe(own.length === 0);
      expect(sectionOf(prompt, 'NON-NEGOTIABLE OUTPUT CONTRACT'), where).toContain('none carrying another');
      expect(sectionOf(prompt, 'LAYOUT AND SELF-AUDIT'), where).toContain('stops at its own joins');
    }
  });

  it.each(CASES)(
    'never gives a sheet of whole drawings a statement of where its pieces end: %s',
    (name, category, subject) => {
      // `ends` would print a trunk's joins above an inventory of whole drawings, which is the
      // contradiction this fixes arriving by the other route. Read from the resolved plans alone, so
      // this compiles no prompt.
      for (const output of outputsOf(category, subject)) {
        const { plan } = sheetFacts(category, subject, output);
        if (plan.extent === 'WHOLE') {
          expect(statesItsEnds(plan), `${name}/${String(output.sheetIndex)}`).toBe(false);
        }
      }
    },
  );

  it.each([
    ['OBJECT', 'Single Rigid Object'],
    ['VEHICLE', 'Single Rigid Hull'],
  ] as const)('compiles the %s default, drawn whole, without the severed-part rule', (category, anatomy) => {
    // The reported pairing: each default opens on a sheet whose entries are the whole subject.
    const subject: SubjectDefinition = defaultSubjectFor(category);
    expect(subject.anatomy).toBe(anatomy);
    const prompt = generatePrompt(category, subject, DEFAULT_OUTPUT_CONFIG);

    expect(prompt).toContain('drawn whole');
    expect(prompt).not.toContain('severed');
  });
});
