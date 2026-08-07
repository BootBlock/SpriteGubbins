import type { SheetPlan } from '../../types/components.ts';

/**
 * What a CREATURE sheet asks for, per sheet mode.
 *
 * Structurally parallel to CHARACTER — a quadruped decomposes into the same segment chain a biped
 * does — but the *terminology* is its own: forelimb and hindlimb rather than arm and leg, body and
 * hindquarters rather than torso and pelvis. That distinction is the point. A creature sheet asking
 * for "hands" invites a generator to draw a humanoid hand on a beast, which is the humanoid-only
 * assumption these plans exist to stop reaching a non-humanoid subject.
 *
 * Limbs are named fore/hind rather than numbered, so a subject with more than four states the extra
 * ones through its additional-anatomy field, where they are counted as their own components.
 */

const MIRRORED_FORELIMB = 'The same eight variants as the left forelimb, redrawn for the right side';
const MIRRORED_HINDLIMB = 'The same nine variants as the left hindlimb, redrawn for the right side';

export const CREATURE_POSE_LIBRARY: SheetPlan = {
  assembly:
    'a neutral standing stance; an alert stance; a lowered stalking crouch; a walking gait with opposing limbs; a running gait with full limb extension; and a rearing or lunging pose.',
  groups: [
    {
      heading: null,
      entries: [
        { text: '1 head, 1 body, 1 hindquarters, in the primary direction', count: 3, kind: 'anatomy' },
        {
          text: '8 left-forelimb articulation variants: upper limb ×3, lower limb ×3, foot or claw ×2',
          count: 8,
          kind: 'anatomy',
        },
        {
          text: '8 right-forelimb articulation variants, redrawn for the right side',
          count: 8,
          kind: 'anatomy',
        },
        {
          text: '9 left-hindlimb articulation variants: upper limb ×3, lower limb ×3, foot or claw ×3',
          count: 9,
          kind: 'anatomy',
        },
        {
          text: '9 right-hindlimb articulation variants, redrawn for the right side',
          count: 9,
          kind: 'anatomy',
        },
      ],
    },
  ],
};

export const CREATURE_DIRECTIONAL_VARIANTS: SheetPlan = {
  assembly:
    'a neutral standing stance; an alert stance; a lowered stalking crouch; a walking gait with opposing limbs; a running gait with full limb extension; and a rearing or lunging pose — in each of the directions listed above.',
  groups: [
    {
      heading: 'Directional core',
      intro: `Three views each of **one** head, **one** body and **one** hindquarters: the same piece of geometry drawn
at each object yaw section 3 lists, in that order. Three separate designs, three mirrored
copies, or three views facing the same way are all failures of this entry, however well drawn.`,
      entries: [
        { text: 'Heads: front-three-quarter, right side, back-three-quarter', count: 3, kind: 'anatomy' },
        { text: 'Bodies: front-three-quarter, right side, back-three-quarter', count: 3, kind: 'anatomy' },
        {
          text: 'Hindquarters: front-three-quarter, right side, back-three-quarter',
          count: 3,
          kind: 'anatomy',
        },
      ],
    },
    {
      heading: 'Left forelimb',
      entries: [
        { text: 'Upper limbs: neutral lowered, forward-diagonal, raised', count: 3, kind: 'anatomy' },
        {
          text: 'Lower limbs: extension-compatible, moderate-flexion-compatible, strong-flexion-compatible',
          count: 3,
          kind: 'anatomy',
        },
        { text: 'Feet or claws: relaxed, spread/grip-ready', count: 2, kind: 'anatomy' },
      ],
    },
    { heading: 'Right forelimb', entries: [{ text: MIRRORED_FORELIMB, count: 8, kind: 'anatomy' }] },
    {
      heading: 'Left hindlimb',
      entries: [
        { text: 'Upper limbs: neutral vertical, forward, backward', count: 3, kind: 'anatomy' },
        {
          text: 'Lower limbs: extension-compatible, moderate-flexion-compatible, strong-flexion-compatible',
          count: 3,
          kind: 'anatomy',
        },
        { text: 'Feet or claws: flat planted, forward-step, rear-step/push-off', count: 3, kind: 'anatomy' },
      ],
    },
    { heading: 'Right hindlimb', entries: [{ text: MIRRORED_HINDLIMB, count: 9, kind: 'anatomy' }] },
  ],
};

export const CREATURE_CUTOUT_RIG: SheetPlan = {
  assembly:
    'any gait the rig produces by rotating the pieces about their pivots. The artwork commits to none of them, which is why every piece is drawn unposed.',
  groups: [
    {
      heading: null,
      intro: "One direction's worth of rig pieces, each drawn once in rest orientation:",
      entries: [
        { text: 'Head ×1, body ×1, hindquarters ×1', count: 3, kind: 'anatomy' },
        { text: 'Left forelimb: upper limb, lower limb, foot or claw', count: 3, kind: 'anatomy' },
        { text: 'Right forelimb: upper limb, lower limb, foot or claw', count: 3, kind: 'anatomy' },
        { text: 'Left hindlimb: upper limb, lower limb, foot or claw', count: 3, kind: 'anatomy' },
        { text: 'Right hindlimb: upper limb, lower limb, foot or claw', count: 3, kind: 'anatomy' },
      ],
      outro: `An eight-direction rig is eight of these sheets, not one sheet of 120 pieces. Run this once per
direction with the same identity lock.`,
    },
  ],
};
