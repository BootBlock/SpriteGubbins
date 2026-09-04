import type { SheetPlan } from '../../types/components.ts';

/**
 * What an EFFECT sheet asks for.
 *
 * **One plan, because an effect has one deliverable: a flipbook.** Every other category's inventory
 * is a set of pieces that exist at the same moment and are assembled in space — a hull and its drive,
 * a torso and its limbs, a floor and its walls. An effect's components are the *same* phenomenon at
 * successive moments, assembled in time. Nothing on this sheet is a part of anything else on it.
 *
 * That is also why this category declines the other three sheet modes, and why declining is the
 * answer rather than an omission (`CATEGORY_SHEET_PLANS` is `Partial` precisely so it can be):
 *
 * - **No `CORE_DIRECTIONAL_VARIANTS`.** Section 3's directional half is written for rigid geometry —
 *   it asks for landmarks that lead and trail, for occlusion that proves the subject turned, and for
 *   a rear view that hides what the front presented. An explosion has no front axis to point
 *   anywhere, so that sheet would demand evidence of rotation the subject cannot produce. It would
 *   also spend the whole component budget on facings and leave none for time, which delivers five
 *   stills of a thing whose entire identity is that it changes. A directional effect — a slash arc, a
 *   muzzle flash in a top-down shooter — is served properly by the mode below: its `'run'` facings
 *   make a direction set a *run list*, so `EIGHT_COMPASS` beside it is eight frame sequences under
 *   one identity lock rather than one sheet of eight frozen frames.
 * - **No `CUTOUT_RIG_SINGLE_DIRECTION`.** A rig is pieces that rotate about pivots against each
 *   other. An effect articulates about nothing.
 * - **No `TILESET_MODULAR`.** An effect is a subject, not a repeating field.
 *
 * The entries name *phases*, not specifics, for the same reason every other category's do: section 1
 * forbids inferring anything the subject did not state, and the subject's own Effect Type and Frame
 * Assembly Base already say whether this is a burst, a loop or a telegraph. An inventory reading
 * "fireball at 20% expansion" would do that inferring on the template's behalf for every frost nova
 * and portal that is neither.
 *
 * **The two groups are two stretches of one sequence, not two layers to composite**, and that is a
 * correction rather than a nicety. It is the wrong shape for the deliverable: one flipbook is what a
 * generation can register against a single point, and a user who genuinely wants a separable
 * shockwave ring or debris chunk has the additional-elements field, which section 1 excepts from its
 * paint rule. So the Secondary Layer is painted into the frames rather than broken out into six
 * components of its own — and section 1 says exactly that, because its paint rule excepts only what
 * a plan draws separately and no entry below is the subject's secondary layer. A plan that broke it
 * out and left the sentence alone would have made section 1 false, in the same way an unqualified
 * section 8 made the particle ban false.
 */
export const EFFECT_FRAME_SEQUENCE: SheetPlan = {
  name: 'Frame sequence',
  facings: 'run',
  assembly:
    'one continuous animation played in the order the inventory lists — every frame a complete state of the effect, sharing one registration point, one cell scale and one camera, and none of them a layer to be stacked on another. Where the subject asks for a loop, that same run is a cycle whose final frame reads back into its first with no visible seam.',
  targetQuantity: 'COMPONENT',
  // One phenomenon, one component per phase of its life: the artwork is the motion here.
  posing: 'PER_POSITION',
  scaleUnitFrame: 'CELL',
  groups: [
    {
      heading: 'Core sequence',
      intro: `The effect’s own body, one component per phase of its life, read left to right as time. Every
frame is a **complete state** of the effect and not a layer to be stacked on another: a frame that
only makes sense composited over its neighbour is a failure of this group.`,
      entries: [
        {
          label: 'onset',
          parts: ['onset-first-visible', 'onset-building'],
          text: 'Onset: first visible frame, building frame',
          count: 2,
          kind: 'frame',
        },
        {
          label: 'expansion',
          parts: ['expansion-early', 'expansion-mid', 'expansion-late'],
          text: 'Expansion: early, mid, late',
          count: 3,
          kind: 'frame',
        },
        {
          label: 'peak-frame',
          text: 'Peak frame ×1, at the widest extent and brightest core the sequence reaches',
          count: 1,
          kind: 'frame',
        },
        {
          label: 'decay',
          parts: ['decay-early', 'decay-mid', 'decay-late'],
          text: 'Decay: early, mid, late',
          count: 3,
          kind: 'frame',
        },
        { label: 'dissipation', text: 'Dissipation: final visible frame', count: 1, kind: 'frame' },
      ],
      outro: `Consecutive frames must differ in **shape**, not only in brightness or opacity: two frames
separated by a fade are one frame drawn twice, and the engine can produce that fade itself for free.
No frame may be a scaled, rotated or mirrored copy of another for the same reason — those are
transforms the engine already has, and a sheet that spends a component on one has bought nothing.
The peak frame fixes the extent every other frame is drawn inside, so nothing overruns its own cell.`,
    },
    {
      heading: 'Residue and clearing',
      intro: `The **later frames of that same sequence**, after the core has burnt out. They continue the run
above without a break — frame eleven follows frame ten — and what carries them is whatever secondary
layer the subject named, painted into these frames exactly as it is painted into the ones before.
This is a stretch of time, not a second layer to composite: the effect simply outlives its own core,
which is what the trailing smoke, debris or sparks are for.`,
      entries: [
        {
          label: 'core-spent',
          parts: ['core-spent-last-visible', 'core-spent-first-absent'],
          text: 'Core spent: the last frame the core is visible in, and the first without it',
          count: 2,
          kind: 'frame',
        },
        { label: 'residue-at-full-extent', text: 'Residue at full extent ×1', count: 1, kind: 'frame' },
        {
          label: 'clearing',
          parts: ['clearing-early', 'clearing-mid', 'clearing-late'],
          text: 'Clearing: early, mid, late',
          count: 3,
          kind: 'frame',
        },
      ],
      outro: `Where the subject names no secondary layer, these frames carry the core’s own lingering residue
instead — the last of the glow, the settling motes — rather than being dropped: the count section [SEC:CONTRACT]
contracts for is exact, and a sheet returning six fewer components than it promised fails that
contract whatever the subject said. A looping effect has no residue to clear, so these are the frames
that carry it back round to its first.`,
    },
  ],
};
