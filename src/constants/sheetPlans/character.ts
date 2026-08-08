import type { SheetPlan, SheetSeries } from '../../types/components.ts';
import { viewsOf } from './directionalViews.ts';
import { RIG_PIECES_OUTRO } from './rigPieces.ts';

/**
 * What a CHARACTER sheet asks for, per sheet mode.
 *
 * The prose is carried over verbatim from the mode-keyed inventories this replaced — it was correct
 * for characters all along, and the defect was never its wording but that *every* category received
 * it. What changed is ownership: these live under CHARACTER, so no other category can reach them.
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

export const CHARACTER_POSE_LIBRARY: SheetPlan = {
  name: 'Pose library',
  facings: 'assembly',
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
    },
  ],
};

/**
 * Sheet one of two: the trunk, turned.
 *
 * Five views rather than three, and that is the whole reason this mode is a series. Three views is
 * the most a single forty-three-component sheet could carry beside a character's limbs — and 45°,
 * 90° and 135° is simultaneously the *most* efficient three-view set (six facings, since each of
 * them flips into a distinct second one) and the only one that can reach neither the camera-facing
 * view nor the one directly away, because 0° and 180° are their own mirror. Drawing those two
 * outright is what takes the classic vocabulary to all eight facings, and it costs six components
 * the old single sheet did not have.
 */
export const CHARACTER_DIRECTIONAL_CORE: SheetPlan = {
  name: 'Directional core',
  facings: 'every',
  assembly:
    'one head, one torso and one pelvis seen at each of the directions listed above, reading as one body turned rather than several drawings of it — the trunk the articulation sheet hangs its limbs on.',
  groups: [
    {
      heading: null,
      intro: `One view of **one** head, **one** torso and **one** pelvis per facing: the same piece of geometry
drawn at each object yaw section 3 lists, in that order. Separate designs, mirrored copies, or views
facing the same way are all failures of this entry, however well drawn.`,
      entries: [viewsOf('Heads', 'anatomy'), viewsOf('Torsos', 'anatomy'), viewsOf('Pelvises', 'anatomy')],
    },
  ],
};

/**
 * Sheet two of two: the limbs, at one facing.
 *
 * These thirty-four variants are unchanged from the single sheet they used to share with the core —
 * they were never directional, which is exactly why they are the half that comes off. A limb pair
 * redrawn at all five yaws would be a hundred and seventy components, so the sheet states one facing
 * and section 3 names which: the same mechanism a cut-out rig's pieces already use.
 */
export const CHARACTER_ARTICULATION: SheetPlan = {
  name: 'Articulation',
  facings: 'assembly',
  assembly: `the limbs of ${CHARACTER_POSES} — each fitted to the trunk drawn on the directional core sheet, at the single direction listed above.`,
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

export const CHARACTER_DIRECTIONAL_VARIANTS: SheetSeries = [
  CHARACTER_DIRECTIONAL_CORE,
  CHARACTER_ARTICULATION,
];

export const CHARACTER_CUTOUT_RIG: SheetPlan = {
  name: 'Rig pieces',
  facings: 'assembly',
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
      outro: RIG_PIECES_OUTRO,
    },
  ],
};
