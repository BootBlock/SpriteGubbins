import type { ComponentEntry, SheetPlan, SheetSeries } from '../../types/components.ts';
import type { FacingTuple } from './directionalViews.ts';
import { chunkName, coreFacingChunks, viewsOf } from './directionalViews.ts';
import { mirroredLimb } from './mirroredLimb.ts';
import { RIG_PIECES_OUTRO } from './rigPieces.ts';

/**
 * What a CHARACTER sheet asks for, per sheet mode.
 *
 * The directional plans are **functions of the chosen facings** rather than constants: the
 * Directions control steers which views the core draws, so the inventory has to be written against
 * the set the user actually picked. The single-facing plans stay constants with `'run'` facings —
 * their inventories are written for one facing, and the direction set is their run list.
 *
 * Group headings carry no number. `componentBreakdownFor` sums each group's entries and writes the
 * total, so a heading cannot claim a figure its own bullets contradict.
 */

/**
 * The poses a full set of a character's components has to reach, worded as one sentence fragment so
 * both modes that promise them promise the same seven.
 */
const CHARACTER_POSES =
  'a neutral standing pose; a relaxed stance; a forward reach; a walking stride with opposing limbs; a running stride with elbow and knee flexion; and both a shallow and a deep crouch';

/**
 * Where each trunk piece ends, stated as its own paragraph because nothing else in the prompt says
 * it and its absence is the reported failure: a generator's prior for "torso" is a torso *with
 * arms*, so trunk sheets came back wearing limbs the inventory never listed. Section 4's generic
 * boundary rule states the principle; this names the joins in the category's own vocabulary, which
 * is what a generator can actually check a drawing against.
 *
 * **The closing sentence is about the series, not about this sheet's own list**, and that is the
 * correction rather than a nicety. It read "has merged entries the inventory lists separately",
 * which is true on the pose library and the rig — both of which list the limbs — and false on the
 * directional core, whose inventory is heads, torsos and pelvises alone. The limbs are on the
 * articulation sheet there, so the sentence justified a real rule by naming a list the sheet
 * carrying it does not have. What is true on all three is that the limbs are counted somewhere in
 * the series, and a trunk that arrives wearing one has taken a component that was counted twice.
 */
const TRUNK_TERMINATION = `Each of these is a severed, isolated piece of one figure — never the whole figure with the other
parts faded or hidden. A head ends at the neck, with no torso below it. A torso ends at the neck
opening, the two shoulder openings and the waist, and carries **no head, no arms and no legs**: each
opening is a clean, capped joint socket, never a stump trailing into a limb. A pelvis ends at the
waist and the two hip openings, and carries **no legs**. Every limb is a component counted in its own
right, on this sheet or on another of this series, so a trunk piece that arrives wearing one has
merged two components into one and breaks the count in section [SEC:CONTRACT].`;

export const CHARACTER_POSE_LIBRARY: SheetPlan = {
  name: 'Pose library',
  facings: 'run',
  assembly: `${CHARACTER_POSES}.`,
  targetQuantity: 'ASSEMBLED',
  // Eight arm and nine leg variants a side: one limb segment per orientation it is drawn at.
  posing: 'PER_POSITION',
  scaleUnitFrame: 'SHEET',
  groups: [
    {
      heading: null,
      entries: [
        {
          label: 'trunk',
          parts: ['head', 'torso', 'pelvis'],
          text: '1 head, 1 torso, 1 pelvis, in the primary direction',
          count: 3,
          kind: 'anatomy',
        },
        {
          label: 'left-arm',
          parts: [
            'left-upper-arm-1',
            'left-upper-arm-2',
            'left-upper-arm-3',
            'left-lower-arm-1',
            'left-lower-arm-2',
            'left-lower-arm-3',
            'left-hand-1',
            'left-hand-2',
          ],
          text: '8 left-arm articulation variants: upper arm ×3, lower arm ×3, hand ×2',
          count: 8,
          kind: 'anatomy',
        },
        {
          label: 'right-arm',
          parts: [
            'right-upper-arm-1',
            'right-upper-arm-2',
            'right-upper-arm-3',
            'right-lower-arm-1',
            'right-lower-arm-2',
            'right-lower-arm-3',
            'right-hand-1',
            'right-hand-2',
          ],
          text: '8 right-arm articulation variants, redrawn for the right side',
          count: 8,
          kind: 'anatomy',
        },
        {
          label: 'left-leg',
          parts: [
            'left-upper-leg-1',
            'left-upper-leg-2',
            'left-upper-leg-3',
            'left-lower-leg-1',
            'left-lower-leg-2',
            'left-lower-leg-3',
            'left-foot-1',
            'left-foot-2',
            'left-foot-3',
          ],
          text: '9 left-leg articulation variants: upper leg ×3, lower leg ×3, foot ×3',
          count: 9,
          kind: 'anatomy',
        },
        {
          label: 'right-leg',
          parts: [
            'right-upper-leg-1',
            'right-upper-leg-2',
            'right-upper-leg-3',
            'right-lower-leg-1',
            'right-lower-leg-2',
            'right-lower-leg-3',
            'right-foot-1',
            'right-foot-2',
            'right-foot-3',
          ],
          text: '9 right-leg articulation variants, redrawn for the right side',
          count: 9,
          kind: 'anatomy',
        },
      ],
      outro: TRUNK_TERMINATION,
    },
  ],
};

/**
 * One core sheet: the trunk, turned to this sheet's share of the chosen facings.
 *
 * Up to five views share a sheet; the eight-compass set arrives as two — see `coreFacingChunks` for
 * why the split is by yaw parity. Either way the entries, the count and section 3's yaw list are all
 * written from the same tuple, so they cannot disagree about which views the sheet owes.
 */
function characterDirectionalCore(chunk: FacingTuple, chunks: readonly FacingTuple[]): SheetPlan {
  return {
    name: chunkName('Directional core', chunk, chunks),
    facings: chunk,
    assembly:
      'one head, one torso and one pelvis seen at each of the directions listed above, reading as one body turned rather than several drawings of it — the trunk the articulation sheets hang their limbs on.',
    targetQuantity: 'ASSEMBLED',
    // One head, one torso and one pelvis, repeated across yaws — the camera turning, not the trunk moving.
    posing: 'UNSTATED',
    scaleUnitFrame: 'SHEET',
    groups: [
      {
        heading: null,
        intro: `One view of **one** head, **one** torso and **one** pelvis per facing: the same piece of geometry
drawn at each object yaw section [SEC:CAMERA] lists, in that order. Separate designs, mirrored copies, or views
facing the same way are all failures of this entry, however well drawn.`,
        entries: [
          viewsOf('Heads', 'anatomy', chunk),
          viewsOf('Torsos', 'anatomy', chunk),
          viewsOf('Pelvises', 'anatomy', chunk),
        ],
        outro: TRUNK_TERMINATION,
      },
    ],
  };
}

/**
 * The left arm, as the three entries the right arm's single line counts.
 *
 * Hoisted rather than written inside its group because `mirroredLimb` reads it: the sentence the
 * right side carries states this side's total, so the total has to be summed from here rather than
 * spelled out beside it. The same applies to the leg below.
 */
const LEFT_ARM_ENTRIES: readonly ComponentEntry[] = [
  {
    label: 'left-upper-arms',
    parts: ['left-upper-arm-neutral', 'left-upper-arm-forward-diagonal', 'left-upper-arm-raised'],
    text: 'Upper arms: neutral lowered, forward-diagonal, raised',
    count: 3,
    kind: 'anatomy',
  },
  {
    label: 'left-lower-arms',
    parts: ['left-lower-arm-extension', 'left-lower-arm-moderate-flexion', 'left-lower-arm-strong-flexion'],
    text: 'Lower arms: extension-compatible, moderate-flexion-compatible, strong-flexion-compatible',
    count: 3,
    kind: 'anatomy',
  },
  {
    label: 'left-hands',
    parts: ['left-hand-relaxed', 'left-hand-closed'],
    text: 'Hands: relaxed empty, closed/grip-ready empty',
    count: 2,
    kind: 'anatomy',
  },
];

/** The left leg, as the three entries the right leg's single line counts. */
const LEFT_LEG_ENTRIES: readonly ComponentEntry[] = [
  {
    label: 'left-upper-legs',
    parts: ['left-upper-leg-neutral', 'left-upper-leg-forward', 'left-upper-leg-backward'],
    text: 'Upper legs: neutral vertical, forward, backward',
    count: 3,
    kind: 'anatomy',
  },
  {
    label: 'left-lower-legs',
    parts: ['left-lower-leg-extension', 'left-lower-leg-moderate-flexion', 'left-lower-leg-strong-flexion'],
    text: 'Lower legs: extension-compatible, moderate-flexion-compatible, strong-flexion-compatible',
    count: 3,
    kind: 'anatomy',
  },
  {
    label: 'left-feet',
    parts: ['left-foot-planted', 'left-foot-heel-strike', 'left-foot-toe-off'],
    text: 'Feet: flat planted, forward-step/heel-strike, rear-step/toe-off',
    count: 3,
    kind: 'anatomy',
  },
];

/**
 * The limbs, one facing per generation.
 *
 * These thirty-four variants were never directional, which is exactly why they are the half that
 * comes off the core: a limb pair redrawn at every yaw of a set would be hundreds of components. As
 * a `'run'` sheet the chosen direction set is its run list — an eight-direction game generates the
 * articulation sheet once per facing, each run's limbs fitted to the trunk views the core sheets
 * drew, at thirty-four components a generation.
 */
export const CHARACTER_ARTICULATION: SheetPlan = {
  name: 'Articulation',
  facings: 'run',
  assembly: `the limbs of ${CHARACTER_POSES} — each fitted to the trunk drawn on the directional core sheets, at the single direction listed above.`,
  targetQuantity: 'ASSEMBLED',
  // The same thirty-four orientations as the pose library's limbs, which is what this sheet is.
  posing: 'PER_POSITION',
  scaleUnitFrame: 'SHEET',
  groups: [
    { heading: 'Left arm', entries: LEFT_ARM_ENTRIES },
    {
      heading: 'Right arm',
      entries: [
        mirroredLimb({
          label: 'right-arm',
          mirrors: 'the left arm',
          of: LEFT_ARM_ENTRIES,
          parts: [
            'right-upper-arm-neutral',
            'right-upper-arm-forward-diagonal',
            'right-upper-arm-raised',
            'right-lower-arm-extension',
            'right-lower-arm-moderate-flexion',
            'right-lower-arm-strong-flexion',
            'right-hand-relaxed',
            'right-hand-closed',
          ],
        }),
      ],
    },
    { heading: 'Left leg', entries: LEFT_LEG_ENTRIES },
    {
      heading: 'Right leg',
      entries: [
        mirroredLimb({
          label: 'right-leg',
          mirrors: 'the left leg',
          of: LEFT_LEG_ENTRIES,
          parts: [
            'right-upper-leg-neutral',
            'right-upper-leg-forward',
            'right-upper-leg-backward',
            'right-lower-leg-extension',
            'right-lower-leg-moderate-flexion',
            'right-lower-leg-strong-flexion',
            'right-foot-planted',
            'right-foot-heel-strike',
            'right-foot-toe-off',
          ],
        }),
      ],
    },
  ],
};

/** The directional pairing: the core sheet or sheets for the chosen facings, then the limbs. */
export function characterDirectionalVariants(facings: FacingTuple): SheetSeries {
  const chunks = coreFacingChunks(facings);
  const [first, ...rest] = chunks;
  return [
    characterDirectionalCore(first, chunks),
    ...rest.map((chunk) => characterDirectionalCore(chunk, chunks)),
    CHARACTER_ARTICULATION,
  ];
}

export const CHARACTER_CUTOUT_RIG: SheetPlan = {
  name: 'Rig pieces',
  facings: 'run',
  assembly:
    'any pose the rig produces by rotating the pieces about their pivots. The artwork commits to none of them, which is why every piece is drawn unposed.',
  targetQuantity: 'ASSEMBLED',
  // The sheet whose inventory is the rig, and the one entry `fixedRigMode` reads.
  posing: 'AT_REST',
  scaleUnitFrame: 'SHEET',
  groups: [
    {
      heading: null,
      intro: 'One direction’s worth of rig pieces, each drawn once in rest orientation:',
      entries: [
        {
          label: 'trunk',
          parts: ['head', 'torso', 'pelvis'],
          text: 'Head ×1, torso ×1, pelvis ×1',
          count: 3,
          kind: 'anatomy',
        },
        {
          label: 'left-arm',
          parts: ['left-upper-arm', 'left-lower-arm', 'left-hand'],
          text: 'Left arm: upper arm, lower arm, hand',
          count: 3,
          kind: 'anatomy',
        },
        {
          label: 'right-arm',
          parts: ['right-upper-arm', 'right-lower-arm', 'right-hand'],
          text: 'Right arm: upper arm, lower arm, hand',
          count: 3,
          kind: 'anatomy',
        },
        {
          label: 'left-leg',
          parts: ['left-upper-leg', 'left-lower-leg', 'left-foot'],
          text: 'Left leg: upper leg, lower leg, foot',
          count: 3,
          kind: 'anatomy',
        },
        {
          label: 'right-leg',
          parts: ['right-upper-leg', 'right-lower-leg', 'right-foot'],
          text: 'Right leg: upper leg, lower leg, foot',
          count: 3,
          kind: 'anatomy',
        },
      ],
      outro: `${TRUNK_TERMINATION}

${RIG_PIECES_OUTRO}`,
    },
  ],
};
