import type { SheetPlan, SheetSeries } from '../../types/components.ts';
import { DIRECTIONAL_MODES } from '../../types/output.ts';
import type { DirectionalMode } from '../../types/output.ts';
import type { DirectionSet } from '../../types/rendering.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { resolveDirectionSet } from '../categoryDirectionSets.ts';
import { DIRECTION_LISTS } from '../promptText/camera.ts';
import type { FacingTuple } from './directionalViews.ts';
import { buildingDirectionalVariants, BUILDING_MODULE_LIBRARY, BUILDING_TILESET } from './building.ts';
import { characterDirectionalVariants, CHARACTER_CUTOUT_RIG, CHARACTER_POSE_LIBRARY } from './character.ts';
import { creatureDirectionalVariants, CREATURE_CUTOUT_RIG, CREATURE_POSE_LIBRARY } from './creature.ts';
import { EFFECT_FRAME_SEQUENCE } from './effect.ts';
import { INTERFACE_NINE_SLICE, INTERFACE_STATE_LIBRARY } from './interface.ts';
import { itemDirectionalVariants, ITEM_PART_LIBRARY } from './item.ts';
import { objectDirectionalVariants, OBJECT_CUTOUT_RIG, OBJECT_PART_LIBRARY } from './object.ts';
import { TERRAIN_BLEND_SET, TERRAIN_FEATURE_LIBRARY } from './terrain.ts';
import { vehicleDirectionalVariants, VEHICLE_CUTOUT_RIG, VEHICLE_PART_LIBRARY } from './vehicle.ts';

// The second category-scoped table, kept in its own file because it answers a different question —
// which categories articulate, rather than which sheets they produce — and surfaced here because
// every caller already reaches this directory through its index.
export { CATEGORY_RIG_MODES, resolveRigMode, supportsRigMode } from './rigModes.ts';

/**
 * One pairing's series, as a function of the facings the user chose.
 *
 * A function rather than a constant because the directional plans are *written against* the chosen
 * facings — the entries name them, the counts multiply by them, and the eight-compass core splits
 * across two sheets — where every other plan ignores the argument: a run-list sheet's inventory is
 * written for one facing whichever set drives the runs.
 */
type SeriesFor = (facings: FacingTuple) => SheetSeries;

/** A pairing whose sheets do not vary with the chosen facings. */
function fixed(...series: SheetSeries): SeriesFor {
  return () => series;
}

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
 * `Partial` is load-bearing. Not every category supports every mode — an item has no cut-out rig,
 * nothing on an interface turns about a pivot, only a building, an interface and a terrain assemble
 * from repeating pieces, and a terrain has no directional core at all — so the gaps are the point
 * rather than an omission to fill.
 *
 * **Every entry takes the chosen facings, and the directional entries are the ones that read
 * them.** A `CORE_DIRECTIONAL_VARIANTS` series draws the facings the Directions control names — one
 * sheet for up to five views, a cardinal and a diagonal sheet for the eight-compass set — where it
 * used to draw a fixed five whatever the control said. How many sheets a pairing takes is therefore
 * a property of the *chosen set* as well as of the pairing, which is exactly what a constant table
 * could not say.
 */
export const CATEGORY_SHEET_PLANS: Readonly<
  Record<SubjectCategory, Readonly<Partial<Record<DirectionalMode, SeriesFor>>>>
> = {
  CHARACTER: {
    SINGLE_DIRECTION_POSE_LIBRARY: fixed(CHARACTER_POSE_LIBRARY),
    CORE_DIRECTIONAL_VARIANTS: characterDirectionalVariants,
    CUTOUT_RIG_SINGLE_DIRECTION: fixed(CHARACTER_CUTOUT_RIG),
  },
  CREATURE: {
    SINGLE_DIRECTION_POSE_LIBRARY: fixed(CREATURE_POSE_LIBRARY),
    CORE_DIRECTIONAL_VARIANTS: creatureDirectionalVariants,
    CUTOUT_RIG_SINGLE_DIRECTION: fixed(CREATURE_CUTOUT_RIG),
  },
  OBJECT: {
    SINGLE_DIRECTION_POSE_LIBRARY: fixed(OBJECT_PART_LIBRARY),
    CORE_DIRECTIONAL_VARIANTS: objectDirectionalVariants,
    CUTOUT_RIG_SINGLE_DIRECTION: fixed(OBJECT_CUTOUT_RIG),
  },
  ITEM: {
    SINGLE_DIRECTION_POSE_LIBRARY: fixed(ITEM_PART_LIBRARY),
    CORE_DIRECTIONAL_VARIANTS: itemDirectionalVariants,
  },
  BUILDING: {
    SINGLE_DIRECTION_POSE_LIBRARY: fixed(BUILDING_MODULE_LIBRARY),
    CORE_DIRECTIONAL_VARIANTS: buildingDirectionalVariants,
    TILESET_MODULAR: fixed(BUILDING_TILESET),
  },
  VEHICLE: {
    SINGLE_DIRECTION_POSE_LIBRARY: fixed(VEHICLE_PART_LIBRARY),
    CORE_DIRECTIONAL_VARIANTS: vehicleDirectionalVariants,
    CUTOUT_RIG_SINGLE_DIRECTION: fixed(VEHICLE_CUTOUT_RIG),
  },
  // The one category that offers a single mode, and the `Partial` above is what lets it say so.
  // An effect's sheet is a flipbook: `'run'` facings are the only kind that leave the whole
  // component budget for *time*, and they are also what turns a direction set into a run list, so a
  // directional slash gets eight frame sequences rather than one sheet of eight frozen frames.
  // `sheetPlans/effect.ts` argues the other three modes out one by one.
  EFFECT: {
    SINGLE_DIRECTION_POSE_LIBRARY: fixed(EFFECT_FRAME_SEQUENCE),
  },
  // Two of the four, and the two gaps are the argument in `sheetPlans/interface.ts`: a flat widget
  // has no facings to turn to, and nothing on an interface rotates about a pivot. The nine-slice
  // takes `TILESET_MODULAR` because that is genuinely what it is — fixed corners, edges that repeat
  // along one axis, a centre that repeats along both.
  INTERFACE: {
    SINGLE_DIRECTION_POSE_LIBRARY: fixed(INTERFACE_STATE_LIBRARY),
    TILESET_MODULAR: fixed(INTERFACE_NINE_SLICE),
  },
  // No directional mode, and that absence is the answer rather than a gap. A tile is laid flat and
  // read from above; turning one 90° produces the tile the set already draws at the next edge, so a
  // multi-view core would be several drawings of one component the inventory names once. The
  // landform pieces could be turned, but they arrive on a sheet whose other half cannot be.
  TERRAIN: {
    SINGLE_DIRECTION_POSE_LIBRARY: fixed(TERRAIN_FEATURE_LIBRARY),
    TILESET_MODULAR: fixed(TERRAIN_BLEND_SET),
  },
};

/**
 * What a stored sheet index is allowed to be, bounded by the longest series any pairing produces
 * over any direction set its category offers.
 *
 * Derived rather than written down, so a pairing that grows a third sheet admits one here in the
 * same edit — the eight-compass character series is the current maximum at three. It is deliberately
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
  // BUILDING and TERRAIN are the two whose usual deliverable is a repeating field rather than a
  // subject — a building's floors and walls, and a terrain's two materials meeting. INTERFACE can
  // produce a tile field too and does not default to one, which is the distinction: a nine-slice is
  // one widget's stretching frame, not the whole deliverable.
  BUILDING: 'TILESET_MODULAR',
  VEHICLE: 'CORE_DIRECTIONAL_VARIANTS',
  // The only mode it has, so the fallback and the choice are the same thing here.
  EFFECT: 'SINGLE_DIRECTION_POSE_LIBRARY',
  // The state library rather than the nine-slice: it is the mode that covers every widget an
  // interface has, where a nine-slice is one widget's stretching frame. It is also the only one of
  // the two that carries a cursor, a bar and a toggle, which is most of what a kit is asked for.
  INTERFACE: 'SINGLE_DIRECTION_POSE_LIBRARY',
  TERRAIN: 'TILESET_MODULAR',
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
 * Every sheet a pairing takes for the chosen direction set, always defined and never empty.
 *
 * Both axes of the address are resolved before the lookup: the mode through {@link resolveMode}, and
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
