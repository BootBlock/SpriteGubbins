import type { SheetSeries } from '../../types/components.ts';
import { DIRECTIONAL_MODES } from '../../types/output.ts';
import type { DirectionalMode } from '../../types/output.ts';
import type { SubjectCategory } from '../../types/subject.ts';
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
import { PORTRAIT_EXPRESSION_LIBRARY } from './portrait.ts';
import { ICON_SYMBOL_SET } from './icon.ts';
import { BACKGROUND_LAYER_LIBRARY, BACKGROUND_PARALLAX_SET } from './background.ts';
import { FONT_GLYPH_SET } from './font.ts';

/**
 * Which sheet each category can produce, and which of them it falls back to.
 *
 * Split out of this directory's index so `rigModes.ts` can read it: the rig a sheet asks for is
 * partly the sheet's own answer — `CUTOUT_RIG_SINGLE_DIRECTION` draws the rig pieces themselves —
 * and a rig table importing the index it is re-exported from would be a cycle. The index keeps what
 * is built *on* this table: the series a pairing produces, and the sheet of it.
 */

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
  // One mode, and `sheetPlans/portrait.ts` argues the other three out one by one: a portrait's turn
  // is the sitter's pose inside a fixed frame rather than a camera, nothing on a face rotates about a
  // pivot, and a head does not butt against a copy of itself.
  PORTRAIT: {
    SINGLE_DIRECTION_POSE_LIBRARY: fixed(PORTRAIT_EXPRESSION_LIBRARY),
  },
  // One mode, for the reasons `sheetPlans/icon.ts` gives. The absent `TILESET_MODULAR` is the one
  // worth naming here: an icon grid is cells sitting apart with clear margin between them, which is
  // the opposite of pieces that butt against copies of themselves.
  ICON: {
    SINGLE_DIRECTION_POSE_LIBRARY: fixed(ICON_SYMBOL_SET),
  },
  // The fourth category to take the tileset, and the second whose repeat is along one axis rather
  // than two: a parallax band loops against its own copy along the scroll direction. The layer
  // library is the answer for the screens that never scroll.
  BACKGROUND: {
    SINGLE_DIRECTION_POSE_LIBRARY: fixed(BACKGROUND_LAYER_LIBRARY),
    TILESET_MODULAR: fixed(BACKGROUND_PARALLAX_SET),
  },
  // One mode, and the only pairing in the table whose series exists because the *character set*
  // outgrew a generation rather than because the subject has parts. `sheetPlans/font.ts` argues the
  // other three modes out one by one; the absent `TILESET_MODULAR` is the one worth naming here,
  // because a font sheet looks like a grid and is the opposite of a tile field — the cells sit apart
  // and the engine decides the spacing at runtime.
  FONT: {
    SINGLE_DIRECTION_POSE_LIBRARY: fixed(...FONT_GLYPH_SET),
  },
};

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
  // The only mode each has, so the fallback and the choice are the same thing for both.
  PORTRAIT: 'SINGLE_DIRECTION_POSE_LIBRARY',
  ICON: 'SINGLE_DIRECTION_POSE_LIBRARY',
  // The parallax set rather than the layer library: a scrolling band is what "a background" means as
  // a deliverable far more often than a single painted panel does, and it is the half of the pair
  // that cannot be assembled by hand from the other.
  BACKGROUND: 'TILESET_MODULAR',
  // The only mode it has, so the fallback and the choice are the same thing here.
  FONT: 'SINGLE_DIRECTION_POSE_LIBRARY',
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
