import type { SheetPlan } from '../../types/components.ts';
import { atEachYaw, viewsOf } from './directionalViews.ts';

/**
 * What a BUILDING sheet asks for, per sheet mode.
 *
 * This category is labelled "Building / Environment Tile", so a modular tile set is a *right* answer
 * for it — and the tileset plan below is the original text, moved here unchanged. What was wrong was
 * never this inventory; it was that it sat in a table keyed on the sheet mode alone, where every
 * other category could reach it. A character asking for floors and wall corners is the failure that
 * produced these files.
 *
 * TERRAIN is the other category laid as a tile field, and the two do not overlap: this plan is a
 * floor field with walls *around* it, which is architecture, and a terrain blend set is two materials
 * meeting across open ground. What stays here is the environment art that is a discrete structure —
 * a tree, a parallax band, a bridge span.
 *
 * The two non-tile modes describe a building as discrete structural modules, so a subject that is a
 * single structure rather than a repeating field still has an inventory of its own instead of
 * borrowing a humanoid's arms and legs.
 */

export const BUILDING_TILESET: SheetPlan = {
  name: 'Tile set',
  facings: 'assembly',
  assembly:
    'a continuous floor field, a straight wall run, and both outer and inner corners, with no visible join where tiles meet.',
  groups: [
    {
      heading: null,
      intro: `A floor tile, a wall *top* and a wall *face* are three distinct tiles; it is the face that produces
the angled read.`,
      entries: [
        { text: 'Floor ×4: one base tile and three low-frequency variants', count: 4, kind: 'tile' },
        { text: 'Wall top ×1, wall face ×1', count: 2, kind: 'tile' },
        {
          text: 'Wall top corners ×4: outer-left, outer-right, inner-left, inner-right',
          count: 4,
          kind: 'tile',
        },
        {
          text: 'Wall face corners ×4: outer-left, outer-right, inner-left, inner-right',
          count: 4,
          kind: 'tile',
        },
        { text: 'Floor edge trim ×2', count: 2, kind: 'tile' },
      ],
      outro: `Every tile is seamless: opposite edges match so tiles butt without a visible join, and no tile
carries a feature that reveals repetition when laid in a field.`,
    },
  ],
};

export const BUILDING_MODULE_LIBRARY: SheetPlan = {
  name: 'Module library',
  facings: 'assembly',
  assembly:
    'the complete structure, and the variations its modules allow — a longer façade by repeating a wall bay, an open or closed entrance, a roof carried across either footprint.',
  groups: [
    {
      heading: null,
      intro: "One direction's worth of structural modules, each drawn once:",
      entries: [
        { text: 'Ground-floor wall bay: blank, windowed', count: 2, kind: 'structure' },
        { text: 'Upper-floor wall bay: blank, windowed', count: 2, kind: 'structure' },
        { text: 'Entrance module: closed, open', count: 2, kind: 'structure' },
        { text: 'Roof section ×1, roof ridge or cap ×1', count: 2, kind: 'structure' },
        { text: 'Corner post or quoin ×1', count: 1, kind: 'structure' },
        { text: 'Foundation or plinth course ×1', count: 1, kind: 'structure' },
        {
          text: 'Façade fittings: awning ×1, sign board ×1, projecting fixture ×1',
          count: 3,
          kind: 'structure',
        },
      ],
      outro: `Modules butt against their neighbours on a shared module width, so a wall bay drawn here can sit
beside any other without a step in the course lines.`,
    },
  ],
};

/** One sheet, five views — twenty components. See `OBJECT_DIRECTIONAL_VARIANTS` for why it is not a series. */
export const BUILDING_DIRECTIONAL_VARIANTS: SheetPlan = {
  name: 'Directional views',
  facings: 'every',
  assembly:
    'the complete structure seen from each of the directions listed above, with its module courses aligning across those views.',
  groups: [
    {
      heading: 'Directional core',
      intro: `One view of **one** wall bay and **one** roof section per facing: the same piece of geometry drawn
at each object yaw section 3 lists, in that order. Separate designs, mirrored copies, or views facing
the same way are all failures of this entry.`,
      entries: [viewsOf('Wall bays', 'structure'), viewsOf('Roof sections', 'structure')],
    },
    {
      heading: 'Openings and corners',
      entries: [atEachYaw('Entrance module', 'structure'), atEachYaw('Corner post or quoin', 'structure')],
    },
  ],
};
