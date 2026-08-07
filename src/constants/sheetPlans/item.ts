import type { SheetPlan } from '../../types/components.ts';

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
  assembly:
    'the complete item as held or stowed, and in each state its parts allow — sheathed, drawn, opened, or expended — without redrawing any part that does not change.',
  groups: [
    {
      heading: null,
      intro: "One direction's worth of parts, with a separate component for each state a part has:",
      entries: [
        { text: 'Grip, handle or hold ×1', count: 1, kind: 'structure' },
        { text: 'Main body or shaft ×1', count: 1, kind: 'structure' },
        {
          text: 'Working end, as the subject defines it: primary state, secondary state',
          count: 2,
          kind: 'mechanism',
        },
        { text: 'Guard, collar or transition piece ×1', count: 1, kind: 'structure' },
        { text: 'Detachable or consumable part: full, depleted', count: 2, kind: 'mechanism' },
        { text: 'Fittings: pommel or cap ×1, binding or wrap ×1, fixing ×1', count: 3, kind: 'structure' },
      ],
    },
  ],
};

export const ITEM_DIRECTIONAL_VARIANTS: SheetPlan = {
  assembly:
    'the complete item seen from each of the directions listed above, reading as one object turned rather than several drawings of it.',
  groups: [
    {
      heading: 'Directional core',
      intro: `Three views each of **one** body and **one** working end: the same piece of geometry drawn
at each object yaw section 3 lists, in that order. Three separate designs, three mirrored
copies, or three views facing the same way are all failures of this entry.`,
      entries: [
        {
          text: 'Bodies or shafts: front-three-quarter, right side, back-three-quarter',
          count: 3,
          kind: 'structure',
        },
        {
          text: 'Working ends: front-three-quarter, right side, back-three-quarter',
          count: 3,
          kind: 'mechanism',
        },
      ],
    },
    {
      heading: 'Grip and fittings',
      entries: [
        { text: 'Grip, handle or hold, at each of the three yaws', count: 3, kind: 'structure' },
        { text: 'Guard, collar or transition piece, at each of the three yaws', count: 3, kind: 'structure' },
      ],
    },
  ],
};
