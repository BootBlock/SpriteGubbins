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
 *
 * **Both plans draw the carry piece, and until they did the prompt promised one nobody listed.** The
 * `clothing` field is *Scabbard / Holster* here, and its own guidance says the sheath is "emitted as
 * its own component" — while section 4 carried no entry for it on either sheet and section 1's paint
 * rule said every applied attribute was painted onto the piece it sits on. So a reader who asked for
 * a matched scabbard was told twice that they would get one and handed a sheet with nowhere for it.
 * It is a component rather than paint because that is the whole reason to ask for one: the item has
 * to appear worn on a character as well as sitting in an inventory slot, which needs the two
 * separable. It is drawn **empty** for the reason section 4's boundary rule gives — a sheath with the
 * blade in it merges two entries the count lists separately — and it is named for the carry piece
 * rather than for a scabbard, because the pool offers a display case, an oilcloth roll and a woven
 * basket beside the sheath.
 *
 * **The part library carries it and the directional sheet does not**, which is the same division
 * that already keeps the pommel, the binding and the detachable part off the directional sheet: the
 * directional core draws the four pieces whose appearance a yaw actually changes, and every entry
 * there costs one drawing at each facing. It is also what the ceiling allows — five entries at five
 * facings is 25 before a single named piece is counted, and `Emblazoned Tower Shield` is a shipped
 * preset that spends the remaining 20 on four pieces at all five. A reader who needs the carry piece
 * turned has the part library, whose facings are a **run list**: one generation per direction, each
 * drawing every part at that facing.
 */

export const ITEM_PART_LIBRARY: SheetPlan = {
  name: 'Part library',
  facings: 'run',
  assembly:
    'the complete item as held or stowed, and in each state its parts allow — sheathed, drawn, opened, or expended — without redrawing any part that does not change.',
  targetQuantity: 'ASSEMBLED',
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
        {
          label: 'scabbard-holster-or-carry-piece',
          text: 'Scabbard, holster or carry piece ×1, drawn empty',
          count: 1,
          kind: 'structure',
          drawsClothing: true,
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
