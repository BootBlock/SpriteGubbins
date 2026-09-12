import type { SubjectCategory } from '../../types/subject.ts';
import { BACKGROUND_LAYER_LIBRARY, BACKGROUND_PARALLAX_SET } from './background.ts';
import { buildingDirectionalVariants, BUILDING_MODULE_LIBRARY, BUILDING_TILESET } from './building.ts';
import { INTERFACE_NINE_SLICE, INTERFACE_STATE_LIBRARY } from './interface.ts';
import { ITEM_PART_LIBRARY } from './item.ts';
import { fixed } from './modePlans.ts';
import type { ModePlans } from './modePlans.ts';
import { objectRigidViewVariants, OBJECT_RIGID_STATES } from './object.ts';
import { TERRAIN_BLEND_SET, TERRAIN_FEATURE_LIBRARY } from './terrain.ts';

/**
 * The assembly bases whose sheets are not their category's standard ones, each mapped to the plans
 * that do draw it (issue #283).
 *
 * **The defect this exists to answer** (issue #281). Section 1 carries the subject's *Assembly Base*
 * verbatim, and every plan used to be a function of the category, the mode, the direction set and the
 * sheet index alone. So a pooled base whose pieces no sheet drew put section 1 against section 4 on
 * every sheet: OBJECT opened on `Single Rigid Object`, whose card says it comes apart in one piece,
 * above an inventory ordering an access panel in three positions and a moving subassembly in three
 * more. A base that only some modes draw was the same defect on fewer sheets (issue #280), and a reader
 * could still reach it: a state library told `Nine-Slice Stretching Frame` over pieces that stretch
 * nothing.
 *
 * **Keyed by the pooled value, and read at runtime.** `plansFor` in `modes.ts` matches the subject's
 * base against these keys, and `assemblyBases.test.ts` holds every key to its category's pool. A value
 * missing from this table draws its category's standard plans, which is right for every value those
 * plans agree with — so the table lists only the bases that differ.
 *
 * **Two shapes of entry, and both are one statement.** A base can draw sheets of its own, as the rigid
 * object's views and states are, or only some of the standard ones, as a nine-slice frame is. Either
 * way the entry is the plans that draw the base, and a mode missing from an entry is a mode that
 * cannot: the studio does not offer it, and a stored one resolves to a mode that can.
 *
 * **Values that draw the same sheets share one table**, because `plansFor` answers by identity and the
 * studio resets the sheet index only where that identity changes.
 */

// The layer library is `SINGLE_DIRECTION_POSE_LIBRARY` and the parallax set `TILESET_MODULAR`.
const LAYER_LIBRARY_ONLY: ModePlans = { SINGLE_DIRECTION_POSE_LIBRARY: fixed(BACKGROUND_LAYER_LIBRARY) };
const PARALLAX_SET_ONLY: ModePlans = { TILESET_MODULAR: fixed(BACKGROUND_PARALLAX_SET) };

// The tile set is a floor field with walls around it, and the module library and the directional views
// draw structural pieces and no tile at all.
const BUILDING_TILE_SET_ONLY: ModePlans = { TILESET_MODULAR: fixed(BUILDING_TILESET) };
const BUILDING_MODULES_AND_VIEWS: ModePlans = {
  SINGLE_DIRECTION_POSE_LIBRARY: fixed(BUILDING_MODULE_LIBRARY),
  CORE_DIRECTIONAL_VARIANTS: buildingDirectionalVariants,
};

// The state library cuts a widget into the pieces its states change, such as a bar's track and fill,
// and stretches none of them; the nine-slice set cuts every piece to stretch or repeat.
const STATE_LIBRARY_ONLY: ModePlans = { SINGLE_DIRECTION_POSE_LIBRARY: fixed(INTERFACE_STATE_LIBRARY) };
const NINE_SLICE_SET_ONLY: ModePlans = { TILESET_MODULAR: fixed(INTERFACE_NINE_SLICE) };

// The part library draws a detachable part and a working end in two states; the directional views draw
// one working end per facing and nothing that detaches.
const ITEM_PART_LIBRARY_ONLY: ModePlans = { SINGLE_DIRECTION_POSE_LIBRARY: fixed(ITEM_PART_LIBRARY) };

// Every named discipline belongs to one of the two sheets: the blend set joins two materials across a
// flat field, and the feature library raises one level and stands features on it.
const BLEND_SET_ONLY: ModePlans = { TILESET_MODULAR: fixed(TERRAIN_BLEND_SET) };
const FEATURE_LIBRARY_ONLY: ModePlans = { SINGLE_DIRECTION_POSE_LIBRARY: fixed(TERRAIN_FEATURE_LIBRARY) };

// No `CUTOUT_RIG_SINGLE_DIRECTION`: nothing on a rigid object turns about a pivot.
const RIGID_OBJECT: ModePlans = {
  SINGLE_DIRECTION_POSE_LIBRARY: fixed(OBJECT_RIGID_STATES),
  CORE_DIRECTIONAL_VARIANTS: objectRigidViewVariants,
};

export const CATEGORY_ASSEMBLY_BASES: Readonly<
  Partial<Record<SubjectCategory, Readonly<Record<string, ModePlans>>>>
> = {
  BACKGROUND: {
    'Single Non-Repeating Panel': LAYER_LIBRARY_ONLY,
    'Horizontally Seamless Band': PARALLAX_SET_ONLY,
    'Seamless Band With Loose Overlays': PARALLAX_SET_ONLY,
    'Seamless Band With Parallax Sub-Layers': PARALLAX_SET_ONLY,
    // The layer library's mid mass and edge occluders, each drawn once for the left and the right.
    'Panel Split Into Left And Right Halves': LAYER_LIBRARY_ONLY,
  },
  BUILDING: {
    'Modular Building Tiles': BUILDING_TILE_SET_ONLY,
    // The tile set's wall corners; the other two sheets draw a corner post or quoin instead.
    'Corner Tile Piece': BUILDING_TILE_SET_ONLY,
    // A roof and an entrance, which the tile set does not draw.
    'Tower With Detachable Roof': BUILDING_MODULES_AND_VIEWS,
    'Wall Section With Gate': BUILDING_MODULES_AND_VIEWS,
  },
  INTERFACE: {
    'Single Fixed-Size Piece': STATE_LIBRARY_ONLY,
    'Three-Slice Horizontal Stretch': NINE_SLICE_SET_ONLY,
    'Three-Slice Vertical Stretch': NINE_SLICE_SET_ONLY,
    'Nine-Slice Stretching Frame': NINE_SLICE_SET_ONLY,
    'Nine-Slice With Tiling Fill': NINE_SLICE_SET_ONLY,
    // The state library's title bar and panel frame; the nine-slice set draws no header.
    'Stacked Header, Body & Footer': STATE_LIBRARY_ONLY,
    'Nine-Slice With Fixed Corner Ornament': NINE_SLICE_SET_ONLY,
    // The nine-slice set's divider rail between its two end caps.
    'Repeating Track With Two Caps': NINE_SLICE_SET_ONLY,
    // The state library's icon plate, drawn empty, filled and highlighted.
    'Base Plate With Overlay States': STATE_LIBRARY_ONLY,
  },
  ITEM: {
    'Weapon With Detachable Mag': ITEM_PART_LIBRARY_ONLY,
    'Instrument Body & Detachable Bow': ITEM_PART_LIBRARY_ONLY,
    'Tool With Swappable Heads': ITEM_PART_LIBRARY_ONLY,
  },
  OBJECT: {
    'Single Rigid Object': RIGID_OBJECT,
  },
  TERRAIN: {
    'Corner-Matched Blob Set': BLEND_SET_ONLY,
    'Edge-Matched Wang Set': BLEND_SET_ONLY,
    'Framed Platform Set': FEATURE_LIBRARY_ONLY,
    'Uniform Self-Tiling Field': BLEND_SET_ONLY,
    'Terraced Elevation Set': FEATURE_LIBRARY_ONLY,
    'Freestanding Feature Pieces': FEATURE_LIBRARY_ONLY,
    'Dual-Grid Offset Set': BLEND_SET_ONLY,
    'Height-Layered Cliff Set': FEATURE_LIBRARY_ONLY,
  },
};
