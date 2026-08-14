import { fieldLabelFor } from '../constants/categories/index.ts';
import {
  resolveMode,
  resolveSheetIndex,
  sheetPlanFor,
  sheetSeriesFor,
} from '../constants/sheetPlans/index.ts';
import type { ComponentGroup, SheetFacings, SheetPlan } from '../types/components.ts';
import type { AnatomyComponent } from '../types/anatomy.ts';
import type { DirectionalMode } from '../types/output.ts';
import type { DirectionSet } from '../types/rendering.ts';
import type { SubjectCategory } from '../types/subject.ts';
import { countAnatomyComponents, formatAnatomyComponent } from './additionalAnatomy.ts';
import type { BatchSheet } from './sheetBatch.ts';

/**
 * The components one sheet actually asks for: its plan's entries, plus whatever anatomy the subject
 * names.
 *
 * **Both halves come from one structure.** The count is a sum over the plan's entries and the
 * inventory prose is rendered from those same entries, so the two cannot disagree — where previously
 * a hand-maintained `Record<DirectionalMode, number>` sat beside a hand-written
 * `Record<DirectionalMode, string>` and nothing checked that 43 was what the bullets added up to.
 *
 * Every reader of the number — the prompt's contract, its inventory heading, its self-audit, its list
 * of the batch's other sheets, the mode selector, the component-budget notice, the atlas grid and the
 * split drawer — sums these entries through one of the functions below, rather than through eight
 * additions that must stay equal.
 *
 * **There are three totals because there are three honest answers, and which one a reader wants
 * depends on what it is describing.** `componentCountFor` is one sheet, and that is what
 * `PRACTICAL_COMPONENT_CEILING` bounds: it is a statement about a single generation, so a series
 * totalling forty-nine across two images is not over it. The prompt's contract, the inventory
 * heading, the budget notice and the atlas grid all describe one image and take that.
 * `seriesComponentCount` is the pairing, and the mode selector alone takes it — because that label
 * is read while *choosing* a pairing, and a two-generation job reading the same figure as a single
 * sheet is the question the label exists to answer. `batchComponentCount` is the whole job, facings
 * and all, and the split drawer takes it: eight facings of a fifteen-piece rig is one hundred and
 * twenty components, and until it was summed that figure appeared nowhere the app computed it.
 */

/** What one group contributes, summing its entries rather than trusting a number in its heading. */
function groupTotal(group: ComponentGroup): number {
  return group.entries.reduce((total, entry) => total + entry.count, 0);
}

/** What one sheet's plan contributes, before the subject's own anatomy. */
export function planComponentCount(plan: SheetPlan): number {
  return plan.groups.reduce((total, group) => total + groupTotal(group), 0);
}

/**
 * The facings this sheet draws the subject's additional anatomy at, or `null` where it draws none.
 *
 * A **multi-view sheet** draws each named piece at each of its own facings, exactly as its plan's
 * entries are drawn: the trunk is one body turned, and a tail drawn once at one unstated yaw cannot
 * attach to that trunk at any other facing — which was the shipped defect, a directional core whose
 * heads turned while the horns beside them did not. The answer is the plan's own tuple, so both
 * chunks of a split eight-compass core carry the anatomy, each at its own facings, and the
 * inventory can name the facings per entry the way `viewsOf` does.
 *
 * A **`'run'` sheet** carries the anatomy only where it is the series' trunk — the first sheet,
 * whose inventory is the whole subject drawn to one facing per generation, so the anatomy is one
 * more piece of that facing's body. The character and creature articulation sheets are `'run'`
 * sheets that are *not* first, and they stay bare: their inventory is limbs for a trunk the core
 * sheets drew, and a tail beside them would hang on nothing.
 *
 * **Asked of the *resolved* index, never the stored one.** The two answer differently exactly where
 * the stored index is not one the series holds — and that state is reachable without corrupt
 * storage, because switching category carries the sheet mode across while the new category's series
 * may be shorter. Resolving in `sheetPlanFor` alone was the bug: a CHARACTER on sheet two switched
 * to an OBJECT got the right plan and no anatomy, so the prompt's count, its self-audit and its
 * inventory all agreed on a figure that silently omitted the pieces the user had typed.
 */
export function anatomyFacingsFor(
  category: SubjectCategory,
  mode: DirectionalMode,
  directions: DirectionSet,
  sheetIndex: number,
): SheetFacings | null {
  const plan = sheetPlanFor(category, mode, directions, sheetIndex);
  if (plan.facings !== 'run') return plan.facings;
  return resolveSheetIndex(category, mode, directions, sheetIndex) === 0 ? 'run' : null;
}

/** What the anatomy adds to a sheet drawing it at these facings: every piece, once per view. */
function anatomyCountAt(facings: SheetFacings, additional: readonly AnatomyComponent[]): number {
  return countAnatomyComponents(additional) * (facings === 'run' ? 1 : facings.length);
}

/** The count the prompt states, once the subject's own additional anatomy is included. */
export function componentCountFor(
  category: SubjectCategory,
  mode: DirectionalMode,
  directions: DirectionSet,
  sheetIndex: number,
  additional: readonly AnatomyComponent[],
): number {
  const plan = sheetPlanFor(category, mode, directions, sheetIndex);
  const facings = anatomyFacingsFor(category, mode, directions, sheetIndex);
  return planComponentCount(plan) + (facings === null ? 0 : anatomyCountAt(facings, additional));
}

/** What every sheet of the pairing costs together — what the deliverable asks for, not one image. */
export function seriesComponentCount(
  category: SubjectCategory,
  mode: DirectionalMode,
  directions: DirectionSet,
  additional: readonly AnatomyComponent[],
): number {
  return sheetSeriesFor(category, mode, directions).reduce(
    (total, _plan, index) => total + componentCountFor(category, mode, directions, index, additional),
    0,
  );
}

/** How many sheets the pairing takes for this direction set. One for most; up to three for an eight-compass character. */
export function sheetCountFor(
  category: SubjectCategory,
  mode: DirectionalMode,
  directions: DirectionSet,
): number {
  return sheetSeriesFor(category, mode, directions).length;
}

/**
 * What one sheet of an enumerated batch costs — the figure that sheet's own prompt contracts for.
 *
 * The same sum as {@link componentCountFor}, asked of a sheet `sheetBatch` produced rather than of
 * the three coordinates a studio configuration holds. It resolves the mode for the same reason every
 * other reader does: a batch sheet carries the configuration's *stored* mode, which the category may
 * have no plan for.
 *
 * Its existence is what stops section 6's per-sheet list, the split drawer's row figures and the
 * batch total below being three arithmetics over one run list — the drift this module was written to
 * make impossible, arriving one axis further out. That the row's figure and the prompt's own are one
 * sum is what makes the row's budget flag checkable: a chip reading "over budget" beside a number the
 * sheet does not actually contract for would be worse than no chip at all.
 */
export function sheetComponentCount(
  category: SubjectCategory,
  sheet: BatchSheet,
  additional: readonly AnatomyComponent[],
): number {
  return componentCountFor(
    category,
    resolveMode(category, sheet.output.directionalMode),
    sheet.output.directions,
    sheet.output.sheetIndex,
    additional,
  );
}

/**
 * What the whole batch asks for: every sheet of it, each counted as its own prompt states it.
 *
 * **A split configuration is already a series, and this is the number nothing was saying.** The
 * drawer listed the runs and each row gave its word count while the studio said "this sheet asks for
 * 15 components" — true of every one of the eight, and no help at all to someone deciding whether to
 * start a job of one hundred and twenty.
 *
 * **Summed over the enumerated list, never multiplied out.** Sheets × facings is a second arithmetic
 * for something `sheetBatch` already decided, and the batch is their cross product rather than either
 * axis: the moment one sheet of a series stops costing what its neighbour costs, a multiplication is
 * wrong and a sum is still right. That is not hypothetical — the literal "eight of these sheets, not
 * one sheet of 120 pieces" in the rig plans was exactly such a figure, correct for the one
 * configuration it was written against and shipped unchanged into the other four direction sets.
 *
 * **The subject's own anatomy is counted once per facing, not once per batch.** Each facing's first
 * sheet draws it and contracts for it, so a tail on an eight-facing rig genuinely is eight drawings
 * of a tail — one per generation. Any other answer would be a total no prompt in the batch states.
 *
 * **Reported, never compared.** `exceedsComponentBudget` stays per-sheet: the budget is what a single
 * generation may be asked for, and a batch total is not something any one image has to survive.
 */
export function batchComponentCount(
  category: SubjectCategory,
  sheets: readonly BatchSheet[],
  additional: readonly AnatomyComponent[],
): number {
  return sheets.reduce((total, sheet) => total + sheetComponentCount(category, sheet, additional), 0);
}

/** One group as the Markdown section 4 carries, with its total written from its own entries. */
function renderGroup(group: ComponentGroup): string {
  const parts: string[] = [];
  if (group.heading !== null) parts.push(`#### ${group.heading} — ${String(groupTotal(group))}`);
  if (group.intro !== undefined) parts.push(group.intro);
  parts.push(group.entries.map((entry) => `- ${entry.text}.`).join('\n'));
  if (group.outro !== undefined) parts.push(group.outro);
  return parts.join('\n\n');
}

/**
 * The inventory section 4 carries: a heading naming this sheet and stating its true total, the
 * category's own entries, then one entry per named anatomy.
 *
 * The heading total is derived here for the same reason the group totals are — a heading reading
 * "15 in total" above a section 0 demanding 18 is the self-contradiction the whole mechanism exists
 * to prevent, and a model resolving it arbitrarily is how a sheet comes back with the wrong number of
 * pieces.
 *
 * **The sheet's name is in that heading because a series makes the number ambiguous without it.** A
 * character's articulation sheet and its directional core are both "the component inventory" of the
 * same configuration, and a reader handed one of them has no way to tell which — nor to tell a
 * thirty-four-component sheet apart from a sheet that lost nine components to a bad edit.
 *
 * **Its heading is the category's own name for the field**, read from `fieldLabelFor` exactly as
 * section 1's lines are, so the two sections call the same pieces the same thing. A fixed
 * "Additional anatomy" was the character vocabulary reaching all six categories — the defect section
 * 1 carried at sixteen sites and this one carried at one.
 *
 * **On a multi-view sheet each entry names the facings it is drawn at**, in the `viewsOf` shape the
 * plan's own entries use — `Demon Horn ×2: south, west, north, east` — because naming the views is
 * what engages section 3's rotation rules and section 9's directional audit, which bind any
 * component "the inventory lists in more than one direction". The intro states the arithmetic
 * (×N pieces at each listed facing) in the same terms as section 4's own entry rule, and the
 * heading's total is that product, summed by {@link componentCountFor}'s own helper. The intro also
 * fixes the *within-entry* reading order that arithmetic leaves open — an entry carrying both a ×N
 * and a facing list expands along two axes, and section 4 orders entries against each other without
 * saying which axis varies faster inside one. Facings are the outer axis, in the order the entry
 * lists them, with the N copies together at each — the reading every `viewsOf` entry already has,
 * extended rather than contradicted.
 *
 * The anatomy comes *last*, and the text says so. Labels are banned by section 0, so grid position is
 * the only thing that identifies a component — appending keeps every base entry at the position the
 * plan promised, where interleaving would silently renumber everything after it.
 */
export function componentBreakdownFor(
  category: SubjectCategory,
  mode: DirectionalMode,
  directions: DirectionSet,
  sheetIndex: number,
  additional: readonly AnatomyComponent[],
): string {
  const plan = sheetPlanFor(category, mode, directions, sheetIndex);
  const total = componentCountFor(category, mode, directions, sheetIndex, additional);

  const inventory = `### Component inventory: ${plan.name} — ${String(total)} in total

${plan.groups.map(renderGroup).join('\n\n')}`;
  const facings = anatomyFacingsFor(category, mode, directions, sheetIndex);
  if (facings === null || additional.length === 0) {
    return inventory;
  }

  const entries = additional
    .map((component) =>
      facings === 'run'
        ? `- ${formatAnatomyComponent(component)}.`
        : `- ${formatAnatomyComponent(component)}: ${facings.join(', ')}.`,
    )
    .join('\n');

  // On a multi-view sheet the pieces turn with the trunk, so the sentence states the per-view
  // arithmetic in the same terms as section 4's own entry rule — a piece marked ×N at each listed
  // facing — and then the sub-order that arithmetic leaves open. An entry carrying both a ×N and a
  // facing list expands along two axes, and grid position is the only identity a labelless sheet
  // has, so which axis varies faster decides which drawing *is* component k: the facings are the
  // outer axis, exactly as the entry spells them, because that is how every `viewsOf` entry above
  // already reads. A run sheet draws each piece once, so its sentence carries no arithmetic at all.
  const drawn =
    facings === 'run'
      ? 'Each of these is drawn as its own component rather than painted onto another.'
      : `Each of these is drawn as its own component rather than painted onto another — and, like every
entry above, once per facing: a piece marked ×N is N separate components at each of the facings its
entry names. Within one entry, walk its facings in the order listed and place all N copies together
at each facing before moving to the next — never one copy at every facing before the second copy
appears.`;

  // Headed by whatever this category calls the field, the same way section 1's lines are: these are
  // the pieces named in *Attached Modules* on a vehicle and in *Extra Appendages* on a creature, and
  // a heading reading "Additional anatomy" over a missile pod is the character vocabulary reaching a
  // category that has none. The word "anatomy" went with it — what the sentence is actually claiming
  // is that these are separate components rather than painted-on detail, which is true of a turret.
  return `${inventory}

#### ${fieldLabelFor(category, 'additional_anatomy')} — ${String(anatomyCountAt(facings, additional))}

${drawn}
They come last in reading order, after the ${String(planComponentCount(plan))} components above:

${entries}`;
}
