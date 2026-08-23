import { CATEGORY_DIRECTION_SETS } from '../constants/categoryDirectionSets.ts';
import { DIRECTION_LISTS } from '../constants/promptText/index.ts';
import { modesFor, sheetSeriesFor } from '../constants/sheetPlans/index.ts';
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
  // A portrait's components are the same head drawn twelve times, which is anatomy by any reading of
  // this union. It takes CHARACTER's pair rather than `anatomy` alone for the reason that pair exists
  // at all: `appendage` covers what is attached to the head rather than part of it — a horn, an ear
  // fin, a mane — and an entry for one of those is not a misfiling.
  PORTRAIT: ['anatomy', 'appendage'],
  // The one row that admits `structure` alone, and the narrowness is the claim. An icon is a mark in
  // a cell: it has no anatomy, no mechanism to drive, no frame that belongs to it (the plate is
  // INTERFACE's) and it never butts against a copy of itself, so a `tile` entry here would be a
  // background band or a nine-slice filed under a symbol set. `structure` is what the union already
  // means by "a piece of the subject", and every entry in `ICON_SYMBOL_SET` is one.
  ICON: ['structure'],
  // BUILDING's pair, and for the reason INTERFACE shares it: the bands of a parallax set repeat and
  // butt against copies of themselves along one axis, which is the whole of what this union means by
  // a tile, while the loose pieces placed over them are `structure`. What separates the three is
  // which pieces their plans name — a wall run, a panel edge, a horizon band — and that is a
  // difference between inventories rather than between kinds.
  BACKGROUND: ['tile', 'structure'],
  // ICON's row, and the narrowness is the same claim: a glyph is a mark on a baseline. It has no
  // anatomy, no mechanism, no frame of its own, and it never butts against a copy of itself — an
  // engine spaces characters at runtime and the cells sit apart — so a `tile` entry here would be a
  // nine-slice or a background band filed under a font. Every entry in the four `font.ts` plans is a
  // single character, which is what this union already means by a piece of the subject.
  FONT: ['structure'],
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
    for (const mode of modesFor(category)) {
      // The series is a function of the chosen direction set now, so every set the category offers
      // is validated — the eight-compass series holds sheets no other set produces, and checking
      // one set would leave the others' plans unexamined.
      for (const directions of CATEGORY_DIRECTION_SETS[category]) {
        const series = sheetSeriesFor(category, mode, directions);
        const setFacings = DIRECTION_LISTS[directions];

        // Names are what a run row, a toast and an inventory heading identify a sheet by, and what
        // `sheetIdentity` keys a batch's progress on — two sheets of one series sharing one would
        // make the drawer tick both off when either was copied.
        const names = new Set(series.map((plan) => plan.name));
        if (names.size !== series.length) {
          violations.push({ category, mode, message: `has two sheets with the same name on ${directions}` });
        }

        for (const plan of series) {
          for (const kind of kindsIn(plan)) {
            if (!categoryPermits(category, kind)) {
              violations.push({
                category,
                mode,
                message: `asks for a component of kind “${kind}”, which ${category} does not admit`,
              });
            }
          }
          // A multi-view sheet's facings come from the set its series was built for, so a facing
          // outside that set is a view the Directions control never asked for — the drifted-plan
          // failure the old fixed-set arrangement made impossible and the builders must not reopen.
          if (plan.facings !== 'run') {
            for (const facing of plan.facings) {
              if (!setFacings.includes(facing)) {
                violations.push({
                  category,
                  mode,
                  message: `sheet “${plan.name}” draws “${facing}”, which ${directions} does not contain`,
                });
              }
            }
          }
          if (plan.groups.length === 0) {
            violations.push({ category, mode, message: `sheet “${plan.name}” has no component groups` });
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
                  message: `entry “${entry.text}” contributes ${String(entry.count)} components`,
                });
              }
            }
          }
        }
      }
    }
  }

  return violations;
}
