import type { SheetPlan, SheetSeries } from '../../types/components.ts';
import type { FacingTuple } from './directionalViews.ts';
import { chunkName, coreFacingChunks, viewsOf } from './directionalViews.ts';
import { RIG_PIECES_OUTRO } from './rigPieces.ts';

/**
 * What a CREATURE sheet asks for, per sheet mode.
 *
 * Structurally parallel to CHARACTER — a quadruped decomposes into the same segment chain a biped
 * does, its directional core is steered by the same chosen facings, and it splits at the same
 * eight-compass set for the same reason — but the *terminology* is its own: forelimb and hindlimb
 * rather than arm and leg, body and hindquarters rather than torso and pelvis. That distinction is
 * the point. A creature sheet asking for "hands" invites a generator to draw a humanoid hand on a
 * beast, which is the humanoid-only assumption these plans exist to stop reaching a non-humanoid
 * subject.
 *
 * Limbs are named fore/hind rather than numbered, so a subject with more than four states the extra
 * ones through its additional-anatomy field, where they are counted as their own components.
 */

const MIRRORED_FORELIMB = 'The same eight variants as the left forelimb, redrawn for the right side';
const MIRRORED_HINDLIMB = 'The same nine variants as the left hindlimb, redrawn for the right side';

/** The gaits a full set of a creature's components has to reach, shared by both modes that promise them. */
const CREATURE_GAITS =
  'a neutral standing stance; an alert stance; a lowered stalking crouch; a walking gait with opposing limbs; a running gait with full limb extension; and a rearing or lunging pose';

/**
 * Where each trunk piece ends — the creature spelling of the character plans' own paragraph, and
 * there for the same reason: a generator's prior for "body" is a body *with legs*, so trunk sheets
 * come back wearing limbs the inventory never listed unless the joins are named.
 */
const TRUNK_TERMINATION = `Each of these is a severed, isolated piece of one animal — never the whole animal with the other
parts faded or hidden. A head ends at the neck, with no body behind it. A body ends at the neck
join, the two forelimb shoulder joins and the join to the hindquarters, and carries **no head and no
limbs**: each join is a clean, capped socket, never a stump trailing into a limb. A hindquarters
ends at the body join and the two hindlimb hip joins, and carries **no limbs** — and no tail, unless
the inventory lists a tail as its own component. A trunk piece that arrives wearing any limb has
merged entries the inventory lists separately, and breaks the count in section [SEC:CONTRACT].`;

export const CREATURE_POSE_LIBRARY: SheetPlan = {
  name: 'Pose library',
  facings: 'run',
  assembly: `${CREATURE_GAITS}.`,
  targetQuantity: 'ASSEMBLED',
  // Eight fore and nine hind variants a side: one limb segment per orientation it is drawn at.
  posing: 'PER_POSITION',
  groups: [
    {
      heading: null,
      entries: [
        {
          label: 'trunk',
          parts: ['head', 'body', 'hindquarters'],
          text: '1 head, 1 body, 1 hindquarters, in the primary direction',
          count: 3,
          kind: 'anatomy',
        },
        {
          label: 'left-forelimb',
          parts: [
            'left-fore-upper-limb-1',
            'left-fore-upper-limb-2',
            'left-fore-upper-limb-3',
            'left-fore-lower-limb-1',
            'left-fore-lower-limb-2',
            'left-fore-lower-limb-3',
            'left-fore-foot-1',
            'left-fore-foot-2',
          ],
          text: '8 left-forelimb articulation variants: upper limb ×3, lower limb ×3, foot or claw ×2',
          count: 8,
          kind: 'anatomy',
        },
        {
          label: 'right-forelimb',
          parts: [
            'right-fore-upper-limb-1',
            'right-fore-upper-limb-2',
            'right-fore-upper-limb-3',
            'right-fore-lower-limb-1',
            'right-fore-lower-limb-2',
            'right-fore-lower-limb-3',
            'right-fore-foot-1',
            'right-fore-foot-2',
          ],
          text: '8 right-forelimb articulation variants, redrawn for the right side',
          count: 8,
          kind: 'anatomy',
        },
        {
          label: 'left-hindlimb',
          parts: [
            'left-hind-upper-limb-1',
            'left-hind-upper-limb-2',
            'left-hind-upper-limb-3',
            'left-hind-lower-limb-1',
            'left-hind-lower-limb-2',
            'left-hind-lower-limb-3',
            'left-hind-foot-1',
            'left-hind-foot-2',
            'left-hind-foot-3',
          ],
          text: '9 left-hindlimb articulation variants: upper limb ×3, lower limb ×3, foot or claw ×3',
          count: 9,
          kind: 'anatomy',
        },
        {
          label: 'right-hindlimb',
          parts: [
            'right-hind-upper-limb-1',
            'right-hind-upper-limb-2',
            'right-hind-upper-limb-3',
            'right-hind-lower-limb-1',
            'right-hind-lower-limb-2',
            'right-hind-lower-limb-3',
            'right-hind-foot-1',
            'right-hind-foot-2',
            'right-hind-foot-3',
          ],
          text: '9 right-hindlimb articulation variants, redrawn for the right side',
          count: 9,
          kind: 'anatomy',
        },
      ],
      outro: TRUNK_TERMINATION,
    },
  ],
};

/** One core sheet: the trunk, turned to this sheet's share of the chosen facings. */
function creatureDirectionalCore(chunk: FacingTuple, chunks: readonly FacingTuple[]): SheetPlan {
  return {
    name: chunkName('Directional core', chunk, chunks),
    facings: chunk,
    assembly:
      'one head, one body and one hindquarters seen at each of the directions listed above, reading as one animal turned rather than several drawings of it — the trunk the articulation sheets hang their limbs on.',
    targetQuantity: 'ASSEMBLED',
    // One head, one body and one hindquarters, repeated across yaws — the camera turning, not the trunk.
    posing: 'UNSTATED',
    groups: [
      {
        heading: null,
        intro: `One view of **one** head, **one** body and **one** hindquarters per facing: the same piece of
geometry drawn at each object yaw section [SEC:CAMERA] lists, in that order. Separate designs, mirrored copies,
or views facing the same way are all failures of this entry, however well drawn.`,
        entries: [
          viewsOf('Heads', 'anatomy', chunk),
          viewsOf('Bodies', 'anatomy', chunk),
          viewsOf('Hindquarters', 'anatomy', chunk),
        ],
        outro: TRUNK_TERMINATION,
      },
    ],
  };
}

/** The limbs, one facing per generation — the creature spelling of the character articulation run. */
export const CREATURE_ARTICULATION: SheetPlan = {
  name: 'Articulation',
  facings: 'run',
  assembly: `the limbs of ${CREATURE_GAITS} — each fitted to the trunk drawn on the directional core sheets, at the single direction listed above.`,
  targetQuantity: 'ASSEMBLED',
  // The creature spelling of the character articulation run, and posed for the same reason.
  posing: 'PER_POSITION',
  groups: [
    {
      heading: 'Left forelimb',
      entries: [
        {
          label: 'left-fore-upper-limbs',
          parts: [
            'left-fore-upper-limb-neutral',
            'left-fore-upper-limb-forward-diagonal',
            'left-fore-upper-limb-raised',
          ],
          text: 'Upper limbs: neutral lowered, forward-diagonal, raised',
          count: 3,
          kind: 'anatomy',
        },
        {
          label: 'left-fore-lower-limbs',
          parts: [
            'left-fore-lower-limb-extension',
            'left-fore-lower-limb-moderate-flexion',
            'left-fore-lower-limb-strong-flexion',
          ],
          text: 'Lower limbs: extension-compatible, moderate-flexion-compatible, strong-flexion-compatible',
          count: 3,
          kind: 'anatomy',
        },
        {
          label: 'left-fore-feet',
          parts: ['left-fore-foot-relaxed', 'left-fore-foot-spread'],
          text: 'Feet or claws: relaxed, spread/grip-ready',
          count: 2,
          kind: 'anatomy',
        },
      ],
    },
    {
      heading: 'Right forelimb',
      entries: [
        {
          label: 'right-forelimb',
          parts: [
            'right-fore-upper-limb-neutral',
            'right-fore-upper-limb-forward-diagonal',
            'right-fore-upper-limb-raised',
            'right-fore-lower-limb-extension',
            'right-fore-lower-limb-moderate-flexion',
            'right-fore-lower-limb-strong-flexion',
            'right-fore-foot-relaxed',
            'right-fore-foot-spread',
          ],
          text: MIRRORED_FORELIMB,
          count: 8,
          kind: 'anatomy',
        },
      ],
    },
    {
      heading: 'Left hindlimb',
      entries: [
        {
          label: 'left-hind-upper-limbs',
          parts: [
            'left-hind-upper-limb-neutral',
            'left-hind-upper-limb-forward',
            'left-hind-upper-limb-backward',
          ],
          text: 'Upper limbs: neutral vertical, forward, backward',
          count: 3,
          kind: 'anatomy',
        },
        {
          label: 'left-hind-lower-limbs',
          parts: [
            'left-hind-lower-limb-extension',
            'left-hind-lower-limb-moderate-flexion',
            'left-hind-lower-limb-strong-flexion',
          ],
          text: 'Lower limbs: extension-compatible, moderate-flexion-compatible, strong-flexion-compatible',
          count: 3,
          kind: 'anatomy',
        },
        {
          label: 'left-hind-feet',
          parts: ['left-hind-foot-planted', 'left-hind-foot-forward-step', 'left-hind-foot-push-off'],
          text: 'Feet or claws: flat planted, forward-step, rear-step/push-off',
          count: 3,
          kind: 'anatomy',
        },
      ],
    },
    {
      heading: 'Right hindlimb',
      entries: [
        {
          label: 'right-hindlimb',
          parts: [
            'right-hind-upper-limb-neutral',
            'right-hind-upper-limb-forward',
            'right-hind-upper-limb-backward',
            'right-hind-lower-limb-extension',
            'right-hind-lower-limb-moderate-flexion',
            'right-hind-lower-limb-strong-flexion',
            'right-hind-foot-planted',
            'right-hind-foot-forward-step',
            'right-hind-foot-push-off',
          ],
          text: MIRRORED_HINDLIMB,
          count: 9,
          kind: 'anatomy',
        },
      ],
    },
  ],
};

/** The directional pairing: the core sheet or sheets for the chosen facings, then the limbs. */
export function creatureDirectionalVariants(facings: FacingTuple): SheetSeries {
  const chunks = coreFacingChunks(facings);
  const [first, ...rest] = chunks;
  return [
    creatureDirectionalCore(first, chunks),
    ...rest.map((chunk) => creatureDirectionalCore(chunk, chunks)),
    CREATURE_ARTICULATION,
  ];
}

export const CREATURE_CUTOUT_RIG: SheetPlan = {
  name: 'Rig pieces',
  facings: 'run',
  assembly:
    'any gait the rig produces by rotating the pieces about their pivots. The artwork commits to none of them, which is why every piece is drawn unposed.',
  targetQuantity: 'ASSEMBLED',
  // The sheet whose inventory is the rig, and the one entry `fixedRigMode` reads.
  posing: 'AT_REST',
  groups: [
    {
      heading: null,
      intro: 'One direction’s worth of rig pieces, each drawn once in rest orientation:',
      entries: [
        {
          label: 'trunk',
          parts: ['head', 'body', 'hindquarters'],
          text: 'Head ×1, body ×1, hindquarters ×1',
          count: 3,
          kind: 'anatomy',
        },
        {
          label: 'left-forelimb',
          parts: ['left-fore-upper-limb', 'left-fore-lower-limb', 'left-fore-foot'],
          text: 'Left forelimb: upper limb, lower limb, foot or claw',
          count: 3,
          kind: 'anatomy',
        },
        {
          label: 'right-forelimb',
          parts: ['right-fore-upper-limb', 'right-fore-lower-limb', 'right-fore-foot'],
          text: 'Right forelimb: upper limb, lower limb, foot or claw',
          count: 3,
          kind: 'anatomy',
        },
        {
          label: 'left-hindlimb',
          parts: ['left-hind-upper-limb', 'left-hind-lower-limb', 'left-hind-foot'],
          text: 'Left hindlimb: upper limb, lower limb, foot or claw',
          count: 3,
          kind: 'anatomy',
        },
        {
          label: 'right-hindlimb',
          parts: ['right-hind-upper-limb', 'right-hind-lower-limb', 'right-hind-foot'],
          text: 'Right hindlimb: upper limb, lower limb, foot or claw',
          count: 3,
          kind: 'anatomy',
        },
      ],
      outro: `${TRUNK_TERMINATION}

${RIG_PIECES_OUTRO}`,
    },
  ],
};
