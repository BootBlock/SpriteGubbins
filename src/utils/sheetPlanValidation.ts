import { CATEGORY_SHEET_PLANS } from '../constants/sheetPlans/index.ts';
import type { ComponentKind, SheetPlan } from '../types/components.ts';
import type { DirectionalMode } from '../types/output.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import type { SubjectCategory } from '../types/subject.ts';

/**
 * Structural checks on the plan tables.
 *
 * The point of checking *kinds* rather than searching generated prose: the contamination that
 * shipped — a character sheet asking for floors and wall corners — is visible in the data as an
 * entry of kind `tile` sitting under CHARACTER, long before it becomes a sentence. Scanning the
 * output for the word "floor" would also flag a legitimate building tileset, and would miss a
 * contaminated entry that happened to avoid the vocabulary.
 *
 * This is a property of the tables, not of a user's configuration, so it runs as a test rather than
 * at runtime: there is no state a user can reach that makes a table entry wrong, and a check the
 * studio ran on every keystroke would be spending work to re-confirm a constant.
 */

/**
 * Which kinds of component each category may ask for.
 *
 * A character is anatomy; a building is structure and tiles; an object and an item are made of parts
 * and mechanisms. The overlaps are deliberate — `structure` covers an item's guard as well as a
 * building's quoin — and the exclusions are the load-bearing half: no category admits every kind, so
 * a plan filed under the wrong one has somewhere to fail.
 */
export const PERMITTED_KINDS: Readonly<Record<SubjectCategory, readonly ComponentKind[]>> = {
  CHARACTER: ['anatomy', 'appendage'],
  CREATURE: ['anatomy', 'appendage'],
  OBJECT: ['structure', 'mechanism'],
  ITEM: ['structure', 'mechanism'],
  BUILDING: ['structure', 'tile'],
};

/** Whether this category may contain a component of this kind at all. */
export function categoryPermits(category: SubjectCategory, kind: ComponentKind): boolean {
  return PERMITTED_KINDS[category].includes(kind);
}

/** Every kind a plan actually asks for, deduplicated. */
export function kindsIn(plan: SheetPlan): readonly ComponentKind[] {
  return [...new Set(plan.groups.flatMap((group) => group.entries.map((entry) => entry.kind)))];
}

/** One thing wrong with one (category, mode) pairing. */
export interface PlanViolation {
  readonly category: SubjectCategory;
  readonly mode: DirectionalMode;
  readonly message: string;
}

/**
 * Every structural problem across the whole table.
 *
 * Returns all of them rather than throwing on the first, so one run reports the full picture —
 * a table with three misfiled plans should not need three runs to find them.
 */
export function validateAllSheetPlans(): readonly PlanViolation[] {
  const violations: PlanViolation[] = [];

  for (const category of SUBJECT_CATEGORIES) {
    const plans = CATEGORY_SHEET_PLANS[category];
    for (const [mode, plan] of Object.entries(plans) as [DirectionalMode, SheetPlan][]) {
      for (const kind of kindsIn(plan)) {
        if (!categoryPermits(category, kind)) {
          violations.push({
            category,
            mode,
            message: `asks for a component of kind "${kind}", which ${category} does not admit`,
          });
        }
      }
      if (plan.groups.length === 0) {
        violations.push({ category, mode, message: 'has no component groups' });
      }
      for (const group of plan.groups) {
        if (group.entries.length === 0) {
          violations.push({
            category,
            mode,
            message: `has an empty group (${group.heading ?? 'unheaded'})`,
          });
        }
        for (const entry of group.entries) {
          if (entry.count < 1 || !Number.isInteger(entry.count)) {
            violations.push({
              category,
              mode,
              message: `entry "${entry.text}" contributes ${String(entry.count)} components`,
            });
          }
        }
      }
    }
  }

  return violations;
}
