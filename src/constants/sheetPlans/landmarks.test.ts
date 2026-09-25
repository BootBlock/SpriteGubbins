import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../output/index.ts';
import { assemblyBaseSubjectsOf } from '../../test/assemblyBaseSubjects.ts';
import { everySheetOf, planProseFor } from '../../test/categoryProse.ts';
import type { ViewSheetPlan } from '../../types/components.ts';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { generatePrompt } from '../../utils/promptCompiler.ts';
import { sheetSeriesFor, supportsMode } from './index.ts';

/**
 * The pieces a landmark sentence names, in the two shapes a landmark writes them in.
 *
 * A landmark sentence is a statement about *components* — which end of each one leads — so its
 * grammatical subjects are the only words in it that have to be the sheet's own vocabulary. The rest
 * of a clause describes surfaces of that piece (the jaws, the dorsal ridge, the headstock), and those
 * are anatomy rather than inventory lines: no plan lists them and none ever will.
 *
 * Both patterns read a lower-case article, the negative one reads `a` and `an` alone, and both bound
 * the subject at four words, so a clause opening a longer compound — `a deck gun or working mount’s`
 * — is read by its last four, every one of which still has to ground.
 */
const NAMED_PIECE = [
  /\b(?:a|an|the) ([a-z]+(?: [a-z]+){0,3})(?:’s|’) (?:front|rear)\b/g,
  /\b(?:a|an) ([a-z]+(?: [a-z]+){0,3}) has no (?:front|rear)\b/g,
];

/**
 * The words of a named piece that have to be grounded — everything but the conjunctions and
 * articles holding a compound subject together, which are the sentence's own scaffolding.
 */
const SCAFFOLDING = new Set(['a', 'an', 'the', 'or', 'and']);

function namedPiecesIn(landmark: string): readonly string[] {
  return NAMED_PIECE.flatMap((pattern) =>
    // Discharged rather than defaulted: an empty subject would split into one empty word, which
    // grounds against anything and would report a piece as checked that was never read.
    [...landmark.matchAll(pattern)].flatMap(([, piece]) => (piece === undefined ? [] : [piece])),
  );
}

/** The shape a landmark takes when it names no piece: the subject as a whole has a front. */
const WHOLE_SUBJECT = /\bthe front is\b/;

/** Every sheet of views a category can compile, once per distinct name and landmark. */
function viewSheetsOf(category: SubjectCategory): readonly ViewSheetPlan[] {
  const seen = new Set<string>();
  return everySheetOf(category).flatMap((plan) => {
    if (plan.facings === 'run') return [];
    const key = `${plan.name} / ${plan.landmark}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [plan];
  });
}

describe('ViewSheetPlan.landmark', () => {
  it('names only pieces the sheet it sits on draws', () => {
    // The defect (issue #286): the sentence was a record keyed by category, and a category's sheets
    // stopped sharing their pieces once a base could choose them. An octopus's directional core was
    // told which end of a body and a hindquarters leads above an inventory of heads and mantles, and a
    // CHARACTER core which end of a foot leads, which only the articulation run draws.
    //
    // Grounded against the sheet's own prose and the class it says its components are — the one place
    // a sheet names what its pieces *are*, as `a landform piece` is named — rather than against the
    // category's, which is exactly the corpus that passed both of those. Matched with a leading
    // boundary only, so a plan writing the plural grounds the singular.
    for (const category of SUBJECT_CATEGORIES) {
      for (const plan of viewSheetsOf(category)) {
        const where = `${category} / ${plan.name}`;
        const prose = `${planProseFor(plan)} ${plan.componentClass}`;
        const pieces = namedPiecesIn(plan.landmark);
        // Without this a sentence reworded into a shape neither pattern reads would pass while
        // asserting nothing at all, which is the one way this check can rot silently.
        expect(
          pieces.length > 0 || WHOLE_SUBJECT.test(plan.landmark),
          `${where}: the landmark names no piece and does not state a front for the subject itself`,
        ).toBe(true);

        for (const piece of pieces) {
          for (const word of piece.split(' ').filter((part) => !SCAFFOLDING.has(part))) {
            // `String.raw`, because a plain template literal reads \b as a backspace: the regex then
            // matches nothing and every sheet fails at once, which is loud but for the wrong reason.
            const grounded = new RegExp(String.raw`\b${word}`, 'i').test(prose);
            expect(grounded, `${where}: “${word}” is a piece this sheet never lists`).toBe(true);
          }
        }
      }
    }
  });

  it('is written for six categories, which are the six with a sheet of views', () => {
    // Stated rather than derived, so a category gaining or losing its directional sheets is an edit
    // that shows up here — and so the grounding sweep above is known to have read something.
    expect(SUBJECT_CATEGORIES.filter((category) => viewSheetsOf(category).length > 0)).toEqual([
      'CHARACTER',
      'CREATURE',
      'OBJECT',
      'ITEM',
      'BUILDING',
      'VEHICLE',
    ]);
  });

  it('gives no two categories the same landmark, which would be one of them written in the other’s pieces', () => {
    const owners = new Map<string, Set<SubjectCategory>>();
    for (const category of SUBJECT_CATEGORIES) {
      for (const plan of viewSheetsOf(category)) {
        owners.set(plan.landmark, new Set([...(owners.get(plan.landmark) ?? []), category]));
      }
    }
    expect([...owners.values()].filter((categories) => categories.size > 1)).toEqual([]);
  });

  it.each(SUBJECT_CATEGORIES)('reaches section 3 of every %s base’s directional sheets', (category) => {
    // The sentence the prompt states is the sheet's, which is the half the grounding sweep cannot see.
    const output = {
      ...DEFAULT_OUTPUT_CONFIG,
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'FOUR_CARDINAL',
    } as const;
    for (const subject of assemblyBaseSubjectsOf(category)) {
      if (!supportsMode(category, subject, output.directionalMode)) continue;
      const [first] = sheetSeriesFor(category, subject, output.directionalMode, output.directions);
      if (first.facings === 'run') continue;
      const prompt = generatePrompt(category, subject, { ...output, sheetIndex: 0 });
      expect(prompt, `${category} / ${subject.anatomy}`).toContain(`For this subject: ${first.landmark}`);
    }
  });
});
