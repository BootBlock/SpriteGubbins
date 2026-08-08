import type { SheetPlan } from '../../types/components.ts';
import { atEachYaw, viewsOf } from './directionalViews.ts';

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
  facings: 'assembly',
  assembly:
    'the complete object in its resting state, and in each state its moving parts allow — opened, activated, or mid-travel — without redrawing any part that does not move.',
  groups: [
    {
      heading: null,
      intro: "One direction's worth of parts, with a separate component for each state a part has:",
      entries: [
        { text: 'Main housing or body shell ×1', count: 1, kind: 'structure' },
        { text: 'Base, mount or footing ×1', count: 1, kind: 'structure' },
        {
          text: 'Access panel, lid or hatch: closed, part-open, fully open',
          count: 3,
          kind: 'mechanism',
        },
        {
          text: 'Primary moving subassembly: rest, mid-travel, full-travel',
          count: 3,
          kind: 'mechanism',
        },
        { text: 'Interface or control face: inactive, active', count: 2, kind: 'mechanism' },
        { text: 'Fittings: handle ×1, latch or catch ×1, mounting bracket ×2', count: 4, kind: 'structure' },
      ],
    },
  ],
};

/**
 * One sheet, five views — a series of one, and legitimately so.
 *
 * Every entry here is already a piece drawn once per facing, so widening the core from three views
 * to five scales the whole plan rather than a group of it: thirty components against a ceiling of
 * forty-three. CHARACTER and CREATURE are the two categories that had to split, because theirs carry
 * thirty-four limb variants that are not views of anything and do not scale with the set. Splitting
 * this one to match would ask for five generations of six components each, and spend the identity
 * lock five times to buy nothing.
 */
export const OBJECT_DIRECTIONAL_VARIANTS: SheetPlan = {
  name: 'Directional views',
  facings: 'every',
  assembly:
    'the complete object seen from each of the directions listed above, with its moving parts in matching positions across those views.',
  groups: [
    {
      heading: 'Directional core',
      intro: `One view of **one** housing and **one** base per facing: the same piece of geometry drawn at each
object yaw section 3 lists, in that order. Separate designs, mirrored copies, or views facing the
same way are all failures of this entry.`,
      entries: [viewsOf('Housings', 'structure'), viewsOf('Bases', 'structure')],
    },
    {
      heading: 'Moving parts',
      entries: [
        atEachYaw('Access panel, lid or hatch', 'mechanism'),
        atEachYaw('Primary moving subassembly', 'mechanism'),
      ],
    },
    {
      heading: 'Fittings',
      entries: [atEachYaw('Handle', 'structure'), atEachYaw('Latch or catch', 'structure')],
    },
  ],
};

export const OBJECT_CUTOUT_RIG: SheetPlan = {
  name: 'Rig pieces',
  facings: 'assembly',
  assembly:
    'any state the rig produces by rotating its moving parts about their pivots. The artwork commits to none of them, which is why every piece is drawn in its rest position.',
  groups: [
    {
      heading: null,
      intro: "One direction's worth of rig pieces, each drawn once in rest position:",
      entries: [
        { text: 'Main housing or body shell ×1', count: 1, kind: 'structure' },
        { text: 'Base, mount or footing ×1', count: 1, kind: 'structure' },
        { text: 'Access panel, lid or hatch ×1, drawn closed', count: 1, kind: 'mechanism' },
        { text: 'Primary moving subassembly: root segment, travelling segment', count: 2, kind: 'mechanism' },
        { text: 'Fittings: handle ×1, latch or catch ×1', count: 2, kind: 'structure' },
      ],
      outro: `Each moving piece carries its pivot at the joint it turns about, matched in diameter to the piece
it turns against, exactly as any other articulated segment on a rigged sheet would.`,
    },
  ],
};
