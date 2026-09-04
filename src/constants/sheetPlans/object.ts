import type { SheetPlan, SheetSeries } from '../../types/components.ts';
import type { FacingTuple } from './directionalViews.ts';
import { atEachYaw, chunkName, coreFacingChunks, viewsOf } from './directionalViews.ts';

/**
 * What an OBJECT sheet asks for, per sheet mode.
 *
 * New content, because there was none: every category previously received the humanoid inventories,
 * so an interactive object was asked for a pelvis, two arms and two legs. These describe an object
 * the way an object actually comes apart — a housing, what it stands on, what opens, what moves, and
 * what is bolted to it.
 *
 * Deliberately generic. The entries name *functional roles* rather than a crate's slats or a
 * console's screen, because the subject definition already says what the object is and section 1
 * forbids inferring anything it does not state — including inferring a weapon's parts from a role.
 * An object whose decomposition genuinely differs states the extra pieces as additional components.
 */

export const OBJECT_PART_LIBRARY: SheetPlan = {
  name: 'Part library',
  facings: 'run',
  assembly:
    'the complete object in its resting state, and in each state its moving parts allow — opened, activated, or mid-travel — without redrawing any part that does not move.',
  targetQuantity: 'ASSEMBLED',
  scaleUnitFrame: 'SHEET',
  groups: [
    {
      heading: null,
      intro: 'One direction’s worth of parts, with a separate component for each state a part has:',
      entries: [
        {
          label: 'main-housing-or-body-shell',
          text: 'Main housing or body shell ×1',
          count: 1,
          kind: 'structure',
        },
        { label: 'base', text: 'Base, mount or footing ×1', count: 1, kind: 'structure' },
        {
          label: 'access-panel',
          parts: ['access-panel-closed', 'access-panel-part-open', 'access-panel-fully-open'],
          text: 'Access panel, lid or hatch: closed, part-open, fully open',
          count: 3,
          kind: 'mechanism',
        },
        {
          label: 'primary-moving-subassembly',
          parts: [
            'primary-moving-subassembly-rest',
            'primary-moving-subassembly-mid-travel',
            'primary-moving-subassembly-full-travel',
          ],
          text: 'Primary moving subassembly: rest, mid-travel, full-travel',
          count: 3,
          kind: 'mechanism',
        },
        {
          label: 'interface-or-control-face',
          parts: ['control-face-inactive', 'control-face-active'],
          text: 'Interface or control face: inactive, active',
          count: 2,
          kind: 'mechanism',
        },
        {
          label: 'fittings',
          parts: ['handle', 'latch', 'mounting-bracket-1', 'mounting-bracket-2'],
          text: 'Fittings: handle ×1, latch or catch ×1, mounting bracket ×2',
          count: 4,
          kind: 'structure',
        },
      ],
    },
  ],
};

/**
 * The directional views, steered by the chosen facings.
 *
 * Every entry here is a piece drawn once per facing, so the whole plan scales with the set: six
 * pieces at five views is thirty components, inside the ceiling on one sheet. The eight-compass set
 * would be forty-eight, past it — so `coreFacingChunks` splits that set into a cardinal sheet and a
 * diagonal sheet, exactly as the character core splits, and every group scales to its sheet's own
 * chunk. Unlike CHARACTER and CREATURE there is no articulation run behind these: the moving parts
 * are views of the same object, so they turn with it.
 */
function objectDirectionalSheet(chunk: FacingTuple, chunks: readonly FacingTuple[]): SheetPlan {
  return {
    name: chunkName('Directional views', chunk, chunks),
    facings: chunk,
    assembly:
      'the complete object seen from each of the directions listed above, with its moving parts in matching positions across those views.',
    targetQuantity: 'ASSEMBLED',
    scaleUnitFrame: 'SHEET',
    groups: [
      {
        heading: 'Directional core',
        intro: `One view of **one** housing and **one** base per facing: the same piece of geometry drawn at each
object yaw section [SEC:CAMERA] lists, in that order. Separate designs, mirrored copies, or views facing the
same way are all failures of this entry.`,
        entries: [viewsOf('Housings', 'structure', chunk), viewsOf('Bases', 'structure', chunk)],
      },
      {
        heading: 'Moving parts',
        entries: [
          atEachYaw('Access panel, lid or hatch', 'mechanism', chunk),
          atEachYaw('Primary moving subassembly', 'mechanism', chunk),
        ],
      },
      {
        heading: 'Fittings',
        entries: [atEachYaw('Handle', 'structure', chunk), atEachYaw('Latch or catch', 'structure', chunk)],
      },
    ],
  };
}

/** The directional pairing: one sheet for up to five facings, two for the eight-compass set. */
export function objectDirectionalVariants(facings: FacingTuple): SheetSeries {
  const chunks = coreFacingChunks(facings);
  const [first, ...rest] = chunks;
  return [
    objectDirectionalSheet(first, chunks),
    ...rest.map((chunk) => objectDirectionalSheet(chunk, chunks)),
  ];
}

export const OBJECT_CUTOUT_RIG: SheetPlan = {
  name: 'Rig pieces',
  facings: 'run',
  assembly:
    'any state the rig produces by rotating its moving parts about their pivots. The artwork commits to none of them, which is why every piece is drawn in its rest position.',
  targetQuantity: 'ASSEMBLED',
  scaleUnitFrame: 'SHEET',
  groups: [
    {
      heading: null,
      intro: 'One direction’s worth of rig pieces, each drawn once in rest position:',
      entries: [
        {
          label: 'main-housing-or-body-shell',
          text: 'Main housing or body shell ×1',
          count: 1,
          kind: 'structure',
        },
        { label: 'base', text: 'Base, mount or footing ×1', count: 1, kind: 'structure' },
        {
          label: 'access-panel',
          text: 'Access panel, lid or hatch ×1, drawn closed',
          count: 1,
          kind: 'mechanism',
        },
        {
          label: 'primary-moving-subassembly',
          parts: ['primary-moving-subassembly-root', 'primary-moving-subassembly-travelling'],
          text: 'Primary moving subassembly: root segment, travelling segment',
          count: 2,
          kind: 'mechanism',
        },
        {
          label: 'fittings',
          parts: ['handle', 'latch'],
          text: 'Fittings: handle ×1, latch or catch ×1',
          count: 2,
          kind: 'structure',
        },
      ],
      outro: `Each moving piece carries its pivot at the joint it turns about, matched in diameter to the piece
it turns against, exactly as any other articulated segment on a rigged sheet would.`,
    },
  ],
};
