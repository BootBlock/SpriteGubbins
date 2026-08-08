import { CATEGORY_SHEET_PLANS } from '../constants/sheetPlans/index.ts';
import { DIRECTION_COVERAGE } from '../constants/promptText/index.ts';
import type { ComponentKind, SheetPlan, SheetSeries } from '../types/components.ts';
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
 * A character is anatomy; a building and a terrain are tiles and structure; an object, an item and a
 * vehicle are made of parts and mechanisms. The overlaps are deliberate — `structure` covers an item's
 * guard as well as a building's quoin — and the exclusions are the load-bearing half: no category
 * admits every kind, so a plan filed under the wrong one has somewhere to fail.
 *
 * VEHICLE sharing OBJECT's pair, and TERRAIN sharing BUILDING's, are the honest answer rather than a
 * missing distinction. What separates each of those pairs is *which* pieces their plans name — a hull
 * and a drive against a housing and a hatch, a material boundary against a wall run — and that is a
 * difference between two inventories, not between two kinds of component. A `drive` or a `landform`
 * kind admitted by one category alone would classify nothing this check could act on.
 *
 * **EFFECT is the one row that admits a single kind, and the one kind no other row admits.** That is
 * not a stronger claim about effects than the rows above make about their subjects — it is the same
 * claim, and it happens to bite hardest here: `frame` classifies a position in time, so an entry of
 * that kind under any of the spatial categories is a flipbook filed under a part breakdown, and an
 * entry of any other kind under EFFECT is a part breakdown filed under a flipbook. Both directions
 * fail, which is what makes this the sharpest pairing in the table rather than the loosest.
 * INTERFACE shares BUILDING's pair for the same reason, and it is worth saying why `tile` is right
 * there rather than loose: a nine-slice's edges and centre repeat and butt against copies of
 * themselves, which is the whole of what this union means by a tile. What separates the two
 * categories is that one tiles a floor and the other tiles a panel edge — again a difference between
 * inventories. The check that keeps *those* apart is the environment-vocabulary net in
 * `sheetPlans.test.ts`, which is derived from each category's own section 8 rather than from this
 * table, because a category that bans floors in its exclusions must not require them in its
 * inventory whatever kinds it admits.
 */
export const PERMITTED_KINDS: Readonly<Record<SubjectCategory, readonly ComponentKind[]>> = {
  CHARACTER: ['anatomy', 'appendage'],
  CREATURE: ['anatomy', 'appendage'],
  OBJECT: ['structure', 'mechanism'],
  ITEM: ['structure', 'mechanism'],
  BUILDING: ['structure', 'tile'],
  VEHICLE: ['structure', 'mechanism'],
  EFFECT: ['frame'],
  INTERFACE: ['structure', 'tile'],
  TERRAIN: ['tile', 'structure'],
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
    for (const [mode, series] of Object.entries(plans) as [DirectionalMode, SheetSeries][]) {
      // Names are what a run row, a toast and an inventory heading identify a sheet by, and what
      // `sheetIdentity` keys a batch's progress on — two sheets of one series sharing one would make
      // the drawer tick both off when either was copied.
      const names = new Set(series.map((plan) => plan.name));
      if (names.size !== series.length) {
        violations.push({ category, mode, message: 'has two sheets with the same name' });
      }

      for (const plan of series) {
        for (const kind of kindsIn(plan)) {
          if (!categoryPermits(category, kind)) {
            violations.push({
              category,
              mode,
              message: `asks for a component of kind "${kind}", which ${category} does not admit`,
            });
          }
        }
        // A sheet drawing every facing of a run list would be the 120-piece sheet the splitter exists
        // to prevent: under `'primary'` coverage the set is a list of sheets to generate, not a
        // description of one, so `'every'` there asks for all of them at once.
        if (plan.facings === 'every' && DIRECTION_COVERAGE[mode] === 'primary') {
          violations.push({
            category,
            mode,
            message: `sheet "${plan.name}" draws every facing of a set the mode reads as a run list`,
          });
        }
        if (plan.groups.length === 0) {
          violations.push({ category, mode, message: `sheet "${plan.name}" has no component groups` });
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
  }

  return violations;
}
