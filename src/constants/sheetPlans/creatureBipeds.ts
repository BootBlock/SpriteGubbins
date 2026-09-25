import {
  BEAST_LANDMARK,
  BEAST_TERMINATION,
  BEAST_TRUNK,
  FORELIMB_ABOVE_THE_END,
  HINDLIMB,
  HINDLIMB_ABOVE_THE_END,
} from './beastBody.ts';
import { bodySegment } from './bodySegment.ts';
import { creaturePlansFor } from './creatureBody.ts';
import type { CreatureBody, LimbSegment } from './creatureBody.ts';
import type { ModePlans } from './modePlans.ts';

/**
 * The two *Anatomy Base* values that stand on two legs, and the sheets each of them draws (issue #285).
 *
 * **What the four-limbed sheets got wrong about them.** Both stand on hindlimbs the quadruped's sheets
 * draw well enough, but those sheets end every forelimb in a `foot or claw` and promise a quadruped's
 * gaits. A bipedal beast's forelimb is off the ground and ends in a hand that grasps and rakes, and a
 * bird's forelimb is a wing. So the bipedal beast keeps the quadruped's trunk, the joins it names and
 * its hindlimb, and ends its forelimb in a hand; the avian body is its own.
 */

/** A bipedal beast's forelimb: raised off the ground, and ending in a hand rather than a foot. */
const GRASPING_FORELIMB: readonly [LimbSegment, ...LimbSegment[]] = [
  ...FORELIMB_ABOVE_THE_END,
  bodySegment('clawed hand', 'hand', [
    { text: 'relaxed', slug: 'relaxed' },
    { text: 'clenched', slug: 'clenched' },
    { text: 'splayed to rake', slug: 'splayed' },
  ]),
];

/** A werebeast, a raptor, a troll: the quadruped's trunk and hindlimbs, risen onto the hindlimbs. */
const BIPEDAL_BEAST: CreatureBody = {
  trunk: BEAST_TRUNK,
  limbs: [
    { label: 'left-forelimb', stem: 'left-fore', heading: 'Left forelimb', segments: GRASPING_FORELIMB },
    {
      label: 'right-forelimb',
      stem: 'right-fore',
      heading: 'Right forelimb',
      segments: GRASPING_FORELIMB,
      mirrors: 'the left forelimb',
    },
    { label: 'left-hindlimb', stem: 'left-hind', heading: 'Left hindlimb', segments: HINDLIMB },
    {
      label: 'right-hindlimb',
      stem: 'right-hind',
      heading: 'Right hindlimb',
      segments: HINDLIMB,
      mirrors: 'the left hindlimb',
    },
  ],
  limbNoun: 'limbs',
  motionNoun: 'gait',
  motions:
    'a neutral upright stance on the hindlimbs; an alert stance; a hunched stalking crouch; a two-legged walking gait; a two-legged run with full hindlimb extension; and a raking or grappling strike with the forelimbs',
  termination: BEAST_TERMINATION,
  landmark: BEAST_LANDMARK,
  scale: {
    pieces: 'a clawed hand drawn beside the body it belongs to is in proportion to it',
    trunk: 'a head drawn beside the body it joins is in proportion to it',
    limbs: 'a clawed hand drawn beside an upper limb is in proportion to it',
  },
};

/** A wing's segments, which the right wing shares because it is the same wing redrawn. */
const WING: readonly [LimbSegment, ...LimbSegment[]] = [
  bodySegment('inner wing', 'inner-wing', [
    { text: 'folded', slug: 'folded' },
    { text: 'level', slug: 'level' },
    { text: 'raised', slug: 'raised' },
    { text: 'lowered', slug: 'lowered' },
  ]),
  bodySegment('outer wing', 'outer-wing', [
    { text: 'folded', slug: 'folded' },
    { text: 'spread', slug: 'spread' },
    { text: 'swept back', slug: 'swept' },
  ]),
];

/** A bird's leg: the hindlimb's thigh and shin, over a foot that perches and strikes. */
const TALONED_LEG: readonly [LimbSegment, ...LimbSegment[]] = [
  ...HINDLIMB_ABOVE_THE_END,
  {
    name: 'foot or talon',
    slug: 'foot',
    plural: 'Feet or talons',
    pluralSlug: 'feet',
    positions: [
      { text: 'flat planted', slug: 'planted' },
      { text: 'perched grip', slug: 'perched' },
      { text: 'talons spread', slug: 'spread' },
    ],
  },
];

/** A roc, a harpy, a terror bird: a head and a body on two legs, with wings for forelimbs and a tail fan. */
const AVIAN: CreatureBody = {
  trunk: [
    { name: 'head', slug: 'head', plural: 'Heads' },
    { name: 'body', slug: 'body', plural: 'Bodies' },
  ],
  limbs: [
    { label: 'left-wing', stem: 'left-wing', heading: 'Left wing', segments: WING },
    {
      label: 'right-wing',
      stem: 'right-wing',
      heading: 'Right wing',
      segments: WING,
      mirrors: 'the left wing',
    },
    { label: 'left-leg', stem: 'left-leg', heading: 'Left leg', segments: TALONED_LEG },
    {
      label: 'right-leg',
      stem: 'right-leg',
      heading: 'Right leg',
      segments: TALONED_LEG,
      mirrors: 'the left leg',
    },
    {
      label: 'tail',
      stem: 'tail',
      heading: 'Tail',
      segments: [
        bodySegment('tail fan', 'fan', [
          { text: 'closed', slug: 'closed' },
          { text: 'fanned', slug: 'fanned' },
        ]),
      ],
    },
  ],
  limbNoun: 'wings, legs and tail',
  motionNoun: 'movement',
  motions:
    'a perched resting stance with the wings folded; an alert stance with the wings half raised; a two-legged walk; a take-off leap with the wings raised; a flapping flight with the wings raised and lowered in turn; a level glide with the wings spread; and a diving strike with the talons forward',
  termination: `Each of these is a severed, isolated piece of one animal — never the whole animal with the other
parts faded or hidden. A head ends at the neck, with no body behind it. A body ends at the neck join,
the two wing roots, the two hip joins and the tail join, and carries **no wings, no legs and no
tail**: each join is a clean, capped socket, never a stump trailing into a limb. An inner wing ends at
the wing root and the join to the outer wing, and carries no outer wing. Every wing, leg and tail piece
is a component counted in its own right, on this sheet or on another of this series, so a body that
arrives wearing one has merged two components into one and breaks the count in section
[SEC:CONTRACT].`,
  landmark:
    'a head’s front is the beak and its rear the back of the skull and the neck join; a body’s front is the breast and its rear the join to the tail.',
  scale: {
    pieces: 'an outer wing drawn beside the body it belongs to is in proportion to it',
    trunk: 'a head drawn beside the body it joins is in proportion to it',
    // A talon rather than the pose library's `foot or talon`, because this sheet writes `Feet or
    // talons` and the singular `foot` appears nowhere on it.
    limbs: 'a talon drawn beside an inner wing is in proportion to it',
  },
};

export const CREATURE_BIPEDAL_BEAST_PLANS: ModePlans = creaturePlansFor(BIPEDAL_BEAST);
export const CREATURE_AVIAN_PLANS: ModePlans = creaturePlansFor(AVIAN);
