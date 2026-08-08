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
 *   muzzle flash in a top-down shooter — is served properly by the mode below: `'primary'` coverage
 *   makes a direction set a *run list*, so `EIGHT_COMPASS` beside it is eight frame sequences under
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
 */
export const EFFECT_FRAME_SEQUENCE: SheetPlan = {
  name: 'Frame sequence',
  facings: 'assembly',
  assembly:
    'a single continuous animation played in the order the inventory lists, every frame sharing one registration point, one cell scale and one camera — and, where the subject asks for a loop, a cycle whose final frame reads back into its first with no visible seam.',
  groups: [
    {
      heading: 'Core sequence',
      intro: `The effect's own body, one component per phase of its life, read left to right as time. Every
frame is a **complete state** of the effect and not a layer to be stacked on another: a frame that
only makes sense composited over its neighbour is a failure of this group.`,
      entries: [
        { text: 'Onset: first visible frame, building frame', count: 2, kind: 'frame' },
        { text: 'Expansion: early, mid, late', count: 3, kind: 'frame' },
        {
          text: 'Peak frame ×1, at the widest extent and brightest core the sequence reaches',
          count: 1,
          kind: 'frame',
        },
        { text: 'Decay: early, mid, late', count: 3, kind: 'frame' },
        { text: 'Dissipation: final visible frame', count: 1, kind: 'frame' },
      ],
      outro: `Consecutive frames must differ in **shape**, not only in brightness or opacity: two frames
separated by a fade are one frame drawn twice, and the engine can produce that fade itself for free.
No frame may be a scaled, rotated or mirrored copy of another for the same reason — those are
transforms the engine already has, and a sheet that spends a component on one has bought nothing.
The peak frame fixes the extent every other frame is drawn inside, so nothing overruns its own cell.`,
    },
    {
      heading: 'Secondary layer',
      intro: `The trailing layer the subject names — smoke, debris, sparks — on its own frames rather than
painted into the core's. It almost always outlives the core, so keeping it separate is what lets the
engine run the two at different rates, tint one without the other, or drop it entirely at low
quality:`,
      entries: [
        { text: 'Emergence: first frame, second frame', count: 2, kind: 'frame' },
        { text: 'Full extent frame ×1', count: 1, kind: 'frame' },
        { text: 'Clearing: early, mid, final frame', count: 3, kind: 'frame' },
      ],
      outro: `Drawn against the same registration point as the core sequence, so the two overlay without being
nudged into place. Where the subject states no secondary layer, these components carry the core's own
lingering residue instead — the last of the glow, the settling motes — rather than being omitted:
the count section 0 contracts for is exact, and a sheet returning six fewer components than it
promised fails that contract whatever the subject said.`,
    },
  ],
};
