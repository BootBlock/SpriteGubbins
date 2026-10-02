import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { assemblyBaseSubjectsOf } from './assemblyBaseSubjects.ts';

/** One case of a sweep: its name, the category and the subject that selects one of its plan tables. */
export type AssemblyBaseCase = readonly [name: string, category: SubjectCategory, subject: SubjectDefinition];

/**
 * {@link assemblyBaseSubjectsOf} for every category, flattened into `it.each` cases, one per category
 * and subject.
 *
 * **Why a sweep splits here rather than looping inside one test.** A sweep that compiles a prompt per
 * sheet grows with ICON's whole-catalogue rosters, and as one test it outgrew Vitest's five-second limit
 * on a slow runner. One case per subject keeps each a bounded slice of the work: a plan table's sheets,
 * or one roster's, which only the roster capacity sizes. The cases together still walk every subject
 * the loop did.
 */
export function assemblyBaseCases(): readonly AssemblyBaseCase[] {
  return SUBJECT_CATEGORIES.flatMap((category) =>
    assemblyBaseSubjectsOf(category).map((subject, index): AssemblyBaseCase => [
      caseName(category, subject, index),
      category,
      subject,
    ]),
  );
}

/** The case's name: its category and place in the walk, then the base, or the roster it draws. */
function caseName(category: SubjectCategory, subject: SubjectDefinition, index: number): string {
  const { icons } = subject;
  const drawn =
    icons === undefined
      ? subject.anatomy || 'no base'
      : `${icons.look}, ${String(icons.picks.length)} picks from ${icons.picks[0] ?? 'none'}`;
  return `${category} subject ${String(index + 1)} (${drawn})`;
}
