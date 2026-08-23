import type { SheetPlan, SheetSeries } from '../../types/components.ts';
import type { DirectionalMode } from '../../types/output.ts';
import type { DirectionSet } from '../../types/rendering.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { resolveDirectionSet } from '../categoryDirectionSets.ts';
import { DIRECTION_LISTS } from '../promptText/camera.ts';
import { CATEGORY_SHEET_PLANS, resolveMode } from './modes.ts';

// The table this directory is named for, in its own file so the rig table below can read it without
// importing the index that re-exports it. Everything here is built on it.
export { CATEGORY_SHEET_PLANS, DEFAULT_MODE_FOR, modesFor, resolveMode, supportsMode } from './modes.ts';

// The second category-scoped table, kept in its own file because it answers a different question —
// which categories articulate, rather than which sheets they produce — and surfaced here because
// every caller already reaches this directory through its index.
export { CATEGORY_RIG_MODES, fixedRigMode, resolveRigMode, supportsRigMode } from './rigModes.ts';

/**
 * What a stored sheet index is allowed to be, bounded by the longest series any pairing produces
 * over any direction set its category offers.
 *
 * Derived rather than written down, so a pairing that grows a sheet admits one here in the same
 * edit — FONT's glyph set is the current maximum at four, printable ASCII being more glyphs than one
 * generation delivers, and the eight-compass character series is the longest *directional* one at
 * three. It is deliberately
 * a bound on *corrupt storage* and not a validity check: which indices are real depends on the
 * category and the chosen set, which `parseOutputConfig` does not have, so an index that is whole
 * and in range but larger than its own series resolves to sheet one in {@link sheetPlanFor}.
 */
export const SHEET_INDEX_RANGE = {
  min: 0,
  max:
    Math.max(
      ...Object.values(CATEGORY_SHEET_PLANS).flatMap((byMode) =>
        Object.values(byMode).flatMap((seriesFor) =>
          Object.values(DIRECTION_LISTS).map((facings) => seriesFor(facings).length),
        ),
      ),
    ) - 1,
} as const;

/**
 * Every sheet a pairing takes for the chosen direction set, always defined and never empty.
 *
 * Both axes of the address are resolved before the lookup: the mode through `resolveMode`, and
 * the set through `resolveDirectionSet`, because which facings mean anything is the category's
 * answer — an interface or a terrain narrows every stored set to `SINGLE_FRONT`. So no caller has to
 * invent behaviour for an absent plan or an impossible facing, which is how a `?? SOMETHING_ELSE`
 * would quietly put another category's inventory back on the sheet.
 */
export function sheetSeriesFor(
  category: SubjectCategory,
  mode: DirectionalMode,
  directions: DirectionSet,
): SheetSeries {
  const seriesFor = CATEGORY_SHEET_PLANS[category][resolveMode(category, mode)];
  // Unreachable while `DEFAULT_MODE_FOR` names a supported mode, which `sheetPlans.test.ts` pins.
  if (seriesFor === undefined) throw new Error(`No sheet plan for ${category} / ${mode}.`);
  return seriesFor(DIRECTION_LISTS[resolveDirectionSet(category, directions)]);
}

/**
 * The sheet index this pairing actually has, for a stored one it may not.
 *
 * An index the series does not hold falls back to its first sheet, for the same reason
 * `sheetDirections` resolves a facing through its own set rather than trusting the stored one: a
 * configuration reaches this from browser storage, an exported JSON file and a preset written when
 * some other pairing was selected, and every one of those can name a third sheet on a pairing that
 * has one — or on a direction set whose series is shorter, since the set now decides the length too.
 *
 * Exported alongside {@link sheetPlanFor} because the studio's sheet control needs the *number* to
 * put in its select while the compiler needs the plan, and a component deriving the index by
 * matching against the plan it got back would be a second implementation of this one line.
 */
export function resolveSheetIndex(
  category: SubjectCategory,
  mode: DirectionalMode,
  directions: DirectionSet,
  sheetIndex: number,
): number {
  const { length } = sheetSeriesFor(category, mode, directions);
  const held = Number.isInteger(sheetIndex) && sheetIndex >= 0 && sheetIndex < length;
  return held ? sheetIndex : 0;
}

/**
 * One sheet of that series, resolved *through* it rather than indexed into it — so no caller has to
 * invent behaviour for a `SheetPlan | undefined`.
 */
export function sheetPlanFor(
  category: SubjectCategory,
  mode: DirectionalMode,
  directions: DirectionSet,
  sheetIndex: number,
): SheetPlan {
  const series = sheetSeriesFor(category, mode, directions);
  const [first] = series;
  // The fallback is unreachable — `resolveSheetIndex` has already answered with an index the series
  // holds — but `noUncheckedIndexedAccess` types the lookup as possibly absent, and the honest way
  // to discharge that is the first sheet rather than an assertion.
  return series[resolveSheetIndex(category, mode, directions, sheetIndex)] ?? first;
}
