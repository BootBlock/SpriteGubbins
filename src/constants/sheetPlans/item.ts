import type { SheetPlan, SheetSeries } from '../../types/components.ts';
import type { FacingTuple } from './directionalViews.ts';
import { atEachYaw, chunkName, coreFacingChunks, viewsOf } from './directionalViews.ts';

/**
 * What an ITEM sheet asks for, per sheet mode.
 *
 * An item is a hand-held or inventory-scale thing, so it decomposes by *grip, body and working end*
 * rather than by housing and mounting the way a placed object does — and it has no rig, which is why
 * this category offers no cut-out mode.
 *
 * The working end is named as such rather than as a blade, head or muzzle. Section 1 forbids
 * inferring equipment from a role, and an inventory entry reading "blade" would do exactly that
 * inferring on the template's behalf for every item that has no blade.
 */

export const ITEM_PART_LIBRARY: SheetPlan = {
  name: 'Part library',
  facings: 'run',
  assembly:
    'the complete item as held or stowed, and in each state its parts allow — sheathed, drawn, opened, or expended — without redrawing any part that does not change.',
  targetQuantity: 'ASSEMBLED',
  // The working end is drawn in two states, and the consumable part full and depleted.
  posing: 'PER_POSITION',
  groups: [
    {
      heading: null,
      intro: 'One direction’s worth of parts, with a separate component for each state a part has:',
      entries: [
        { label: 'grip', text: 'Grip, handle or hold ×1', count: 1, kind: 'structure' },
        { label: 'main-body-or-shaft', text: 'Main body or shaft ×1', count: 1, kind: 'structure' },
        {
          label: 'working-end',
          parts: ['working-end-primary', 'working-end-secondary'],
          text: 'Working end, as the subject defines it: primary state, secondary state',
          count: 2,
          kind: 'mechanism',
        },
        { label: 'guard', text: 'Guard, collar or transition piece ×1', count: 1, kind: 'structure' },
        {
          label: 'detachable-or-consumable-part',
          parts: ['detachable-part-full', 'detachable-part-depleted'],
          text: 'Detachable or consumable part: full, depleted',
          count: 2,
          kind: 'mechanism',
        },
        {
          label: 'fittings',
          parts: ['pommel', 'binding', 'fixing'],
          text: 'Fittings: pommel or cap ×1, binding or wrap ×1, fixing ×1',
          count: 3,
          kind: 'structure',
        },
      ],
    },
  ],
};

/**
 * The directional views, steered by the chosen facings — four pieces per view, so one sheet holds
 * up to five facings and the eight-compass set splits into a cardinal and a diagonal sheet, exactly
 * as `objectDirectionalVariants` does.
 */
function itemDirectionalSheet(chunk: FacingTuple, chunks: readonly FacingTuple[]): SheetPlan {
  return {
    name: chunkName('Directional views', chunk, chunks),
    facings: chunk,
    assembly:
      'the complete item seen from each of the directions listed above, reading as one object turned rather than several drawings of it.',
    targetQuantity: 'ASSEMBLED',
    // A yaw is the camera turning rather than the item moving, so the repeated entries are views.
    posing: 'UNSTATED',
    groups: [
      {
        heading: 'Directional core',
        intro: `One view of **one** body and **one** working end per facing: the same piece of geometry drawn at
each object yaw section [SEC:CAMERA] lists, in that order. Separate designs, mirrored copies, or views facing
the same way are all failures of this entry.`,
        entries: [
          viewsOf('Bodies or shafts', 'structure', chunk),
          viewsOf('Working ends', 'mechanism', chunk),
        ],
      },
      {
        heading: 'Grip and fittings',
        entries: [
          atEachYaw('Grip, handle or hold', 'structure', chunk),
          atEachYaw('Guard, collar or transition piece', 'structure', chunk),
        ],
      },
    ],
  };
}

/** The directional pairing: one sheet for up to five facings, two for the eight-compass set. */
export function itemDirectionalVariants(facings: FacingTuple): SheetSeries {
  const chunks = coreFacingChunks(facings);
  const [first, ...rest] = chunks;
  return [itemDirectionalSheet(first, chunks), ...rest.map((chunk) => itemDirectionalSheet(chunk, chunks))];
}
