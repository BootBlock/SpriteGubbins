import type { SheetPlan, SheetSeries } from '../../types/components.ts';
import type { FacingTuple } from './directionalViews.ts';
import { chunkName, coreFacingChunks, viewsOf } from './directionalViews.ts';
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

/** The articulation variants both single-direction modes share for a limb pair's second side. */
const MIRRORED_ARM = 'The same eight variants as the left arm, redrawn for the right side';
const MIRRORED_LEG = 'The same nine variants as the left leg, redrawn for the right side';

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
 */
const TRUNK_TERMINATION = `Each of these is a severed, isolated piece of one figure — never the whole figure with the other
parts faded or hidden. A head ends at the neck, with no torso below it. A torso ends at the neck
opening, the two shoulder openings and the waist, and carries **no head, no arms and no legs**: each
opening is a clean, capped joint socket, never a stump trailing into a limb. A pelvis ends at the
waist and the two hip openings, and carries **no legs**. A trunk piece that arrives wearing any limb
has merged entries the inventory lists separately, and breaks the count in section 0.`;

export const CHARACTER_POSE_LIBRARY: SheetPlan = {
  name: 'Pose library',
  facings: 'run',
  assembly: `${CHARACTER_POSES}.`,
  groups: [
    {
      heading: null,
      entries: [
        { text: '1 head, 1 torso, 1 pelvis, in the primary direction', count: 3, kind: 'anatomy' },
        {
          text: '8 left-arm articulation variants: upper arm ×3, lower arm ×3, hand ×2',
          count: 8,
          kind: 'anatomy',
        },
        { text: '8 right-arm articulation variants, redrawn for the right side', count: 8, kind: 'anatomy' },
        {
          text: '9 left-leg articulation variants: upper leg ×3, lower leg ×3, foot ×3',
          count: 9,
          kind: 'anatomy',
        },
        { text: '9 right-leg articulation variants, redrawn for the right side', count: 9, kind: 'anatomy' },
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
    groups: [
      {
        heading: null,
        intro: `One view of **one** head, **one** torso and **one** pelvis per facing: the same piece of geometry
drawn at each object yaw section 3 lists, in that order. Separate designs, mirrored copies, or views
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
  groups: [
    {
      heading: 'Left arm',
      entries: [
        { text: 'Upper arms: neutral lowered, forward-diagonal, raised', count: 3, kind: 'anatomy' },
        {
          text: 'Lower arms: extension-compatible, moderate-flexion-compatible, strong-flexion-compatible',
          count: 3,
          kind: 'anatomy',
        },
        { text: 'Hands: relaxed empty, closed/grip-ready empty', count: 2, kind: 'anatomy' },
      ],
    },
    { heading: 'Right arm', entries: [{ text: MIRRORED_ARM, count: 8, kind: 'anatomy' }] },
    {
      heading: 'Left leg',
      entries: [
        { text: 'Upper legs: neutral vertical, forward, backward', count: 3, kind: 'anatomy' },
        {
          text: 'Lower legs: extension-compatible, moderate-flexion-compatible, strong-flexion-compatible',
          count: 3,
          kind: 'anatomy',
        },
        {
          text: 'Feet: flat planted, forward-step/heel-strike, rear-step/toe-off',
          count: 3,
          kind: 'anatomy',
        },
      ],
    },
    { heading: 'Right leg', entries: [{ text: MIRRORED_LEG, count: 9, kind: 'anatomy' }] },
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
  groups: [
    {
      heading: null,
      intro: "One direction's worth of rig pieces, each drawn once in rest orientation:",
      entries: [
        { text: 'Head ×1, torso ×1, pelvis ×1', count: 3, kind: 'anatomy' },
        { text: 'Left arm: upper arm, lower arm, hand', count: 3, kind: 'anatomy' },
        { text: 'Right arm: upper arm, lower arm, hand', count: 3, kind: 'anatomy' },
        { text: 'Left leg: upper leg, lower leg, foot', count: 3, kind: 'anatomy' },
        { text: 'Right leg: upper leg, lower leg, foot', count: 3, kind: 'anatomy' },
      ],
      outro: `${TRUNK_TERMINATION}

${RIG_PIECES_OUTRO}`,
    },
  ],
};
