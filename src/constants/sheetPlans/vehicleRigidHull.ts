import type { AssemblyFailure, SheetPlan, SheetSeries } from '../../types/components.ts';
import type { FacingTuple } from './directionalViews.ts';
import { chunkName, coreFacingChunks, viewsOf } from './directionalViews.ts';
import { fixed } from './modePlans.ts';
import type { ModePlans } from './modePlans.ts';

/**
 * The sheets of a `Single Rigid Hull`, which comes apart in one piece (issue #288).
 *
 * **Every component is the whole vehicle, because that is what the base says.** A rigid hull has no
 * turret ring, no axle and no hinge, so there is no hull to cut from a drive unit and no hatch to draw
 * open — and the standard sheets ordered a near-side drive unit at rest and at mid-travel, a far-side
 * one, a mount in three positions and a hatch in two regardless, so section 1 stated a vehicle in one
 * piece above an inventory ordering fifteen. It is `Single Rigid Object`'s defect in the category whose
 * default subject opens on it, which is `OBJECT_RIGID_STATES`' argument as well.
 *
 * **What such a vehicle does have is facings and states, so its two sheets are those**: the vehicle
 * turned, and the vehicle at rest and under power. A hover platform, a sealed drone and a moulded
 * mine cart are all real subjects with nothing that turns against anything, and a game still needs
 * eight views of each.
 *
 * **There is no rig sheet**, because nothing on it turns about a pivot, and `rigModes.ts` offers it no
 * rig for the same reason — `supportsRigMode` reads the absence of this mode rather than a third table.
 *
 * **A stated size names the component here**, since the component is the vehicle: a reader's
 * `64 × 64 px` is checkable against each drawing, where on the standard sheets it names what the parts
 * assemble into and no single component has it.
 *
 * **The cladding and the lamps are painted rather than drawn apart.** Both are pieces of their own on
 * the standard sheets, where the hull carries them separately; on these they are part of the one piece,
 * so no entry claims them and section 1's paint rule covers them. `Bare Unclad Frame` therefore takes
 * nothing off these sheets, which is the honest answer: there is nothing on them to take.
 */

/**
 * How a rigid hull's sheets forbid what goes wrong with them, in the three sections that say it.
 *
 * **Not `VEHICLE_ASSEMBLY_FAILURE`, because a rigid hull has no parts to fit together.** Its *Drive &
 * Assembly Base* says it comes apart in one piece, so every component on its sheets is the whole
 * vehicle, and a form forbidding the parts fitted together would name parts the sheet does not have
 * while forbidding nothing it could draw. What does go wrong is two of the drawings merged into one, or
 * the vehicle staged as a product shot rather than drawn as a sprite — `RIGID_OBJECT_FAILURE`'s three
 * forms in this category's noun.
 */
const RIGID_HULL_FAILURE: AssemblyFailure = {
  instruction:
    'Do not draw the vehicle with two of its drawings merged into one, or staged as a product shot, anywhere on the sheet, including as a reference or key.',
  exclusion: 'Two drawings of the vehicle merged into one, and any staged product shot of it.',
  audit:
    'nothing on the sheet is two drawings of the vehicle merged into one, or a staged product shot of it',
};

const VEHICLE_RIGID_STATES: SheetPlan = {
  name: 'Vehicle states',
  facings: 'run',
  assembly:
    'one vehicle shown at rest and under power, both drawn to the same footprint and registration, so either can replace the other in place without the vehicle shifting.',
  targetQuantity: 'COMPONENT',
  // The one vehicle, drawn once for each state it takes.
  posing: 'PER_POSITION',
  scaleExample:
    'the vehicle at rest and the vehicle under power beside it are the same vehicle drawn at the same scale',
  scaleUnit: 'a full vehicle',
  componentClass: 'this one vehicle, drawn whole',
  assemblyFailure: RIGID_HULL_FAILURE,
  groups: [
    {
      heading: null,
      intro:
        'One direction’s worth of the vehicle, drawn whole once for each state it takes and never cut into parts:',
      entries: [
        { label: 'vehicle-at-rest', text: 'The vehicle at rest ×1', count: 1, kind: 'structure' },
        {
          label: 'vehicle-under-power',
          text: 'The vehicle under power ×1 — lamps lit, drive live, and otherwise unchanged',
          count: 1,
          kind: 'structure',
        },
      ],
    },
  ],
};

/** One sheet of a rigid hull's views: the whole vehicle at each of this sheet's facings. */
function rigidViewSheet(chunk: FacingTuple, chunks: readonly FacingTuple[]): SheetPlan {
  return {
    name: chunkName('Vehicle views', chunk, chunks),
    facings: chunk,
    assembly:
      'one vehicle seen from each facing, every view registered to the same footprint, so the engine can swap one for the next as the vehicle turns without it shifting.',
    targetQuantity: 'COMPONENT',
    // The one vehicle at each yaw, which is the camera turning rather than anything on it moving.
    posing: 'UNSTATED',
    scaleExample:
      'one view of the vehicle and the view beside it are the same vehicle drawn at the same scale',
    scaleUnit: 'a full vehicle',
    componentClass: 'this one vehicle, drawn whole',
    assemblyFailure: RIGID_HULL_FAILURE,
    groups: [
      {
        heading: null,
        intro: `One view of **the vehicle**, drawn whole, per facing: the same drawing turned to each object yaw
section [SEC:CAMERA] lists, in that order. Separate designs, mirrored copies, or views facing the same way are all
failures of this entry.`,
        entries: [viewsOf('Vehicles', 'structure', chunk)],
      },
    ],
  };
}

/**
 * A rigid hull's directional pairing: one sheet for up to five facings, and two for the eight-compass
 * set, for the adjacent-yaw reason `coreFacingChunks` gives rather than for the count.
 */
function rigidViewVariants(facings: FacingTuple): SheetSeries {
  const chunks = coreFacingChunks(facings);
  const [first, ...rest] = chunks;
  return [rigidViewSheet(first, chunks), ...rest.map((chunk) => rigidViewSheet(chunk, chunks))];
}

/** The two sheets a vehicle in one piece is drawn on, and the rig mode it withholds by having neither. */
export const VEHICLE_RIGID_HULL_PLANS: ModePlans = {
  SINGLE_DIRECTION_POSE_LIBRARY: fixed(VEHICLE_RIGID_STATES),
  CORE_DIRECTIONAL_VARIANTS: rigidViewVariants,
};
