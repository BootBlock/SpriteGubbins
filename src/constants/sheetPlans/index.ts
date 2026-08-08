import type { SheetPlan, SheetSeries } from '../../types/components.ts';
import { DIRECTIONAL_MODES } from '../../types/output.ts';
import type { DirectionalMode } from '../../types/output.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { BUILDING_DIRECTIONAL_VARIANTS, BUILDING_MODULE_LIBRARY, BUILDING_TILESET } from './building.ts';
import { CHARACTER_CUTOUT_RIG, CHARACTER_DIRECTIONAL_VARIANTS, CHARACTER_POSE_LIBRARY } from './character.ts';
import { CREATURE_CUTOUT_RIG, CREATURE_DIRECTIONAL_VARIANTS, CREATURE_POSE_LIBRARY } from './creature.ts';
import { ITEM_DIRECTIONAL_VARIANTS, ITEM_PART_LIBRARY } from './item.ts';
import { OBJECT_CUTOUT_RIG, OBJECT_DIRECTIONAL_VARIANTS, OBJECT_PART_LIBRARY } from './object.ts';
import { VEHICLE_CUTOUT_RIG, VEHICLE_DIRECTIONAL_VARIANTS, VEHICLE_PART_LIBRARY } from './vehicle.ts';

/**
 * Which sheet each category can actually produce, and what it asks for.
 *
 * **This table is the fix.** The inventory used to be `Record<DirectionalMode, string>` — one
 * dimension, no category — so the sheet mode alone decided what was drawn and every category got the
 * same answer. A CHARACTER on `TILESET_MODULAR` was handed floors, wall tops, wall faces and corners;
 * an OBJECT on the default mode was handed a pelvis and two legs. Neither pairing was expressible as
 * wrong, because nothing related the two axes.
 *
 * Keying on both makes the relation explicit: a pairing that is absent here does not exist, and
 * `resolveMode` below is what stops an absent one ever reaching the compiler.
 *
 * `Partial` is load-bearing. Not every category supports every mode — an item has no cut-out rig, and
 * only a building is a tile field — so the gaps are the point rather than an omission to fill.
 *
 * **Every entry is a series, and most of them have one member.** A pairing outgrows a single sheet
 * when its inventory passes `PRACTICAL_COMPONENT_CEILING`, which is a fact about what a generation
 * returns rather than anything about the subject — so it is the *pairing* that has to be able to say
 * "this takes two images", and a bare `SheetPlan` had nowhere to say it. Wrapping the single-sheet
 * plans here rather than in their own files keeps each category file about what is drawn.
 */
export const CATEGORY_SHEET_PLANS: Readonly<
  Record<SubjectCategory, Readonly<Partial<Record<DirectionalMode, SheetSeries>>>>
> = {
  CHARACTER: {
    SINGLE_DIRECTION_POSE_LIBRARY: [CHARACTER_POSE_LIBRARY],
    CORE_DIRECTIONAL_VARIANTS: CHARACTER_DIRECTIONAL_VARIANTS,
    CUTOUT_RIG_SINGLE_DIRECTION: [CHARACTER_CUTOUT_RIG],
  },
  CREATURE: {
    SINGLE_DIRECTION_POSE_LIBRARY: [CREATURE_POSE_LIBRARY],
    CORE_DIRECTIONAL_VARIANTS: CREATURE_DIRECTIONAL_VARIANTS,
    CUTOUT_RIG_SINGLE_DIRECTION: [CREATURE_CUTOUT_RIG],
  },
  OBJECT: {
    SINGLE_DIRECTION_POSE_LIBRARY: [OBJECT_PART_LIBRARY],
    CORE_DIRECTIONAL_VARIANTS: [OBJECT_DIRECTIONAL_VARIANTS],
    CUTOUT_RIG_SINGLE_DIRECTION: [OBJECT_CUTOUT_RIG],
  },
  ITEM: {
    SINGLE_DIRECTION_POSE_LIBRARY: [ITEM_PART_LIBRARY],
    CORE_DIRECTIONAL_VARIANTS: [ITEM_DIRECTIONAL_VARIANTS],
  },
  BUILDING: {
    SINGLE_DIRECTION_POSE_LIBRARY: [BUILDING_MODULE_LIBRARY],
    CORE_DIRECTIONAL_VARIANTS: [BUILDING_DIRECTIONAL_VARIANTS],
    TILESET_MODULAR: [BUILDING_TILESET],
  },
  VEHICLE: {
    SINGLE_DIRECTION_POSE_LIBRARY: [VEHICLE_PART_LIBRARY],
    CORE_DIRECTIONAL_VARIANTS: [VEHICLE_DIRECTIONAL_VARIANTS],
    CUTOUT_RIG_SINGLE_DIRECTION: [VEHICLE_CUTOUT_RIG],
  },
};

/**
 * What a stored sheet index is allowed to be, bounded by the longest series the table holds.
 *
 * Derived rather than written down, so a pairing that grows a third sheet admits one here in the
 * same edit. It is deliberately a bound on *corrupt storage* and not a validity check: which indices
 * are real depends on the category, which `parseOutputConfig` does not have, so an index that is
 * whole and in range but larger than its own series resolves to sheet one in {@link sheetPlanFor}.
 * That is the same division `primaryDirection` draws — a facing is checked against the direction set
 * because both live in one config, and a sheet cannot be, because its series does not.
 */
export const SHEET_INDEX_RANGE = {
  min: 0,
  max:
    Math.max(
      ...Object.values(CATEGORY_SHEET_PLANS).flatMap((byMode) =>
        Object.values(byMode).map((series) => series.length),
      ),
    ) - 1,
} as const;

/**
 * The mode a category falls back to when the one it was given does not exist for it.
 *
 * Every category needs one, and it has to be a mode that category actually supports —
 * `sheetPlans.test.ts` pins both, because a default pointing at a missing plan would reintroduce the
 * undefined lookup this whole module removes.
 */
export const DEFAULT_MODE_FOR: Readonly<Record<SubjectCategory, DirectionalMode>> = {
  CHARACTER: 'CORE_DIRECTIONAL_VARIANTS',
  CREATURE: 'CORE_DIRECTIONAL_VARIANTS',
  OBJECT: 'CORE_DIRECTIONAL_VARIANTS',
  ITEM: 'CORE_DIRECTIONAL_VARIANTS',
  // A building is the one category for which a repeating tile field is the usual deliverable.
  BUILDING: 'TILESET_MODULAR',
  VEHICLE: 'CORE_DIRECTIONAL_VARIANTS',
};

/** Whether this category can produce this kind of sheet at all. */
export function supportsMode(category: SubjectCategory, mode: DirectionalMode): boolean {
  return CATEGORY_SHEET_PLANS[category][mode] !== undefined;
}

/** The modes this category offers, in the canonical order `DIRECTIONAL_MODES` declares. */
export function modesFor(category: SubjectCategory): readonly DirectionalMode[] {
  return DIRECTIONAL_MODES.filter((mode) => supportsMode(category, mode));
}

/**
 * The mode actually used for this category — the one asked for where it exists, the category's
 * default otherwise.
 *
 * The studio prevents the mismatch (the selector only offers supported modes, and switching category
 * re-resolves the stored one), but this is not defence in depth for its own sake: a preset written
 * before this table existed, a history row from an older build, or a hand-edited export can all
 * arrive carrying a pairing that was legal when it was saved. Substituting the default degrades such
 * a record to a coherent sheet, where the alternative is the contaminated prompt this replaced.
 */
export function resolveMode(category: SubjectCategory, mode: DirectionalMode): DirectionalMode {
  return supportsMode(category, mode) ? mode : DEFAULT_MODE_FOR[category];
}

/**
 * Every sheet a pairing takes, always defined and never empty.
 *
 * Resolves the mode first, so the lookup cannot miss and no caller has to invent behaviour for an
 * absent plan — which is how a `?? SOMETHING_ELSE` would quietly put another category's inventory
 * back on the sheet.
 */
export function sheetSeriesFor(category: SubjectCategory, mode: DirectionalMode): SheetSeries {
  const series = CATEGORY_SHEET_PLANS[category][resolveMode(category, mode)];
  // Unreachable while `DEFAULT_MODE_FOR` names a supported mode, which `sheetPlans.test.ts` pins.
  if (series === undefined) throw new Error(`No sheet plan for ${category} / ${mode}.`);
  return series;
}

/**
 * The sheet index this pairing actually has, for a stored one it may not.
 *
 * An index the series does not hold falls back to its first sheet, for the same reason
 * `sheetDirections` resolves a facing through its own set rather than trusting the stored one: a
 * configuration reaches this from browser storage, an exported JSON file and a preset written when
 * some other pairing was selected, and every one of those can name a second sheet on a pairing that
 * has one.
 *
 * Exported alongside {@link sheetPlanFor} because the studio's sheet control needs the *number* to
 * put in its select while the compiler needs the plan, and a component deriving the index by
 * matching against the plan it got back would be a second implementation of this one line.
 */
export function resolveSheetIndex(
  category: SubjectCategory,
  mode: DirectionalMode,
  sheetIndex: number,
): number {
  const { length } = sheetSeriesFor(category, mode);
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
  sheetIndex: number,
): SheetPlan {
  const series = sheetSeriesFor(category, mode);
  const [first] = series;
  // The fallback is unreachable — `resolveSheetIndex` has already answered with an index the series
  // holds — but `noUncheckedIndexedAccess` types the lookup as possibly absent, and the honest way
  // to discharge that is the first sheet rather than an assertion.
  return series[resolveSheetIndex(category, mode, sheetIndex)] ?? first;
}
