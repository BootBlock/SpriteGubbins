import type { SheetPlan } from '../../types/components.ts';

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

export const CHARACTER_POSE_LIBRARY: SheetPlan = {
  assembly:
    'a neutral standing pose; a relaxed stance; a forward reach; a walking stride with opposing limbs; a running stride with elbow and knee flexion; and both a shallow and a deep crouch.',
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

export const CHARACTER_DIRECTIONAL_VARIANTS: SheetPlan = {
  assembly:
    'a neutral standing pose; a relaxed stance; a forward reach; a walking stride with opposing limbs; a running stride with elbow and knee flexion; and both a shallow and a deep crouch — in each of the directions listed above.',
  groups: [
    {
      heading: 'Directional core',
      intro: `Three views each of **one** head, **one** torso and **one** pelvis: the same piece of geometry drawn
at each object yaw section 3 lists, in that order. Three separate designs, three mirrored copies, or
three views facing the same way are all failures of this entry, however well drawn.`,
      entries: [
        { text: 'Heads: front-three-quarter, right side, back-three-quarter', count: 3, kind: 'anatomy' },
        { text: 'Torsos: front-three-quarter, right side, back-three-quarter', count: 3, kind: 'anatomy' },
        { text: 'Pelvises: front-three-quarter, right side, back-three-quarter', count: 3, kind: 'anatomy' },
      ],
    },
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

export const CHARACTER_CUTOUT_RIG: SheetPlan = {
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
      outro: `An eight-direction rig is eight of these sheets, not one sheet of 120 pieces. Run this once per
direction with the same identity lock.`,
    },
  ],
};
