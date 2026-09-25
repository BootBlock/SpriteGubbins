import { describe, expect, it } from 'vitest';
import { CATEGORY_DIRECTION_SETS } from '../constants/categoryDirectionSets.ts';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { modesFor, sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import { assemblyBaseSubjectsOf } from '../test/assemblyBaseSubjects.ts';
import { sectionOf } from '../test/promptSections.ts';
import type { OutputConfig } from '../types/output.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
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
/** How every group's `ends` opens — the plan's own statement of the rule. */
const ENDS_OPENING = /Each of these is a (?:severed, isolated|separate) piece of one /g;

interface CompiledSheet {
  readonly where: string;
  readonly plan: SheetPlan;
  readonly prompt: string;
}

const compiled = new Map<SubjectCategory, readonly CompiledSheet[]>();

/** Every sheet of every base, mode, reachable direction set and series position, as compiled. */
function everySheet(category: SubjectCategory): readonly CompiledSheet[] {
  const cached = compiled.get(category);
  if (cached !== undefined) return cached;
  const sheets: CompiledSheet[] = [];
  for (const subject of assemblyBaseSubjectsOf(category)) {
    for (const directionalMode of modesFor(category, subject)) {
      for (const directions of CATEGORY_DIRECTION_SETS[category]) {
        const { length } = sheetSeriesFor(category, subject, directionalMode, directions);
        for (let sheetIndex = 0; sheetIndex < length; sheetIndex += 1) {
          const output: OutputConfig = { ...DEFAULT_OUTPUT_CONFIG, directionalMode, directions, sheetIndex };
          sheets.push({
            where: `${category}/${subject.anatomy}/${directionalMode}/${directions}/${String(sheetIndex)}`,
            // The plan the compiler itself resolved, rather than one looked up beside it.
            plan: sheetFacts(category, subject, output).plan,
            prompt: generatePrompt(category, subject, output),
          });
        }
      }
    }
  }
  compiled.set(category, sheets);
  return sheets;
}

function statesItsEnds(plan: SheetPlan): boolean {
  return plan.groups.some((group) => group.ends !== undefined);
}

describe('where each component ends', () => {
  it.each(SUBJECT_CATEGORIES)(
    'tells no %s sheet of whole drawings that an entry is a severed part',
    (category) => {
      for (const { where, plan, prompt } of everySheet(category)) {
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

  it.each(SUBJECT_CATEGORIES)('states once where a piece ends on every %s sheet of pieces', (category) => {
    for (const { where, plan, prompt } of everySheet(category)) {
      if (plan.extent !== 'PIECE') continue;
      const inventory = sectionOf(prompt, 'COMPONENT INVENTORY');
      const generic = inventory.includes(BOUNDARY_HEADING) ? 1 : 0;
      const own = inventory.match(ENDS_OPENING)?.length ?? 0;

      // One of the two, never both and never neither — and which one is the plan's to say.
      expect(generic + own, where).toBe(1);
      expect(own === 1, where).toBe(statesItsEnds(plan));
      expect(sectionOf(prompt, 'NON-NEGOTIABLE OUTPUT CONTRACT'), where).toContain('none carrying another');
      expect(sectionOf(prompt, 'LAYOUT AND SELF-AUDIT'), where).toContain('stops at its own joins');
    }
  });

  it('never gives a sheet of whole drawings a statement of where its pieces end', () => {
    // `ends` would print a trunk's joins above an inventory of whole drawings, which is the
    // contradiction this fixes arriving by the other route.
    for (const category of SUBJECT_CATEGORIES) {
      for (const { where, plan } of everySheet(category)) {
        if (plan.extent === 'WHOLE') expect(statesItsEnds(plan), where).toBe(false);
      }
    }
  });

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
