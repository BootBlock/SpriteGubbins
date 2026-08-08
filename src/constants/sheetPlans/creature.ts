import type { SheetPlan, SheetSeries } from '../../types/components.ts';
import { viewsOf } from './directionalViews.ts';

/**
 * What a CREATURE sheet asks for, per sheet mode.
 *
 * Structurally parallel to CHARACTER — a quadruped decomposes into the same segment chain a biped
 * does, and outgrows a single sheet at the same five views for the same reason — but the
 * *terminology* is its own: forelimb and hindlimb rather than arm and leg, body and hindquarters
 * rather than torso and pelvis. That distinction is the point. A creature sheet asking for "hands"
 * invites a generator to draw a humanoid hand on a beast, which is the humanoid-only assumption
 * these plans exist to stop reaching a non-humanoid subject.
 *
 * Limbs are named fore/hind rather than numbered, so a subject with more than four states the extra
 * ones through its additional-anatomy field, where they are counted as their own components.
 */

const MIRRORED_FORELIMB = 'The same eight variants as the left forelimb, redrawn for the right side';
const MIRRORED_HINDLIMB = 'The same nine variants as the left hindlimb, redrawn for the right side';

/** The gaits a full set of a creature's components has to reach, shared by both modes that promise them. */
const CREATURE_GAITS =
  'a neutral standing stance; an alert stance; a lowered stalking crouch; a walking gait with opposing limbs; a running gait with full limb extension; and a rearing or lunging pose';

export const CREATURE_POSE_LIBRARY: SheetPlan = {
  name: 'Pose library',
  facings: 'assembly',
  assembly: `${CREATURE_GAITS}.`,
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

/** Sheet one of two: the trunk, turned. See `CHARACTER_DIRECTIONAL_CORE` for why this is a series. */
export const CREATURE_DIRECTIONAL_CORE: SheetPlan = {
  name: 'Directional core',
  facings: 'every',
  assembly:
    'one head, one body and one hindquarters seen at each of the directions listed above, reading as one animal turned rather than several drawings of it — the trunk the articulation sheet hangs its limbs on.',
  groups: [
    {
      heading: null,
      intro: `One view of **one** head, **one** body and **one** hindquarters per facing: the same piece of
geometry drawn at each object yaw section 3 lists, in that order. Separate designs, mirrored copies,
or views facing the same way are all failures of this entry, however well drawn.`,
      entries: [
        viewsOf('Heads', 'anatomy'),
        viewsOf('Bodies', 'anatomy'),
        viewsOf('Hindquarters', 'anatomy'),
      ],
    },
  ],
};

/** Sheet two of two: the limbs, at the one facing section 3 names. */
export const CREATURE_ARTICULATION: SheetPlan = {
  name: 'Articulation',
  facings: 'assembly',
  assembly: `the limbs of ${CREATURE_GAITS} — each fitted to the trunk drawn on the directional core sheet, at the single direction listed above.`,
  groups: [
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

export const CREATURE_DIRECTIONAL_VARIANTS: SheetSeries = [CREATURE_DIRECTIONAL_CORE, CREATURE_ARTICULATION];

export const CREATURE_CUTOUT_RIG: SheetPlan = {
  name: 'Rig pieces',
  facings: 'assembly',
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
