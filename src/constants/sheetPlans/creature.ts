import { creaturePlansFor } from './creatureBody.ts';
import type { CreatureBody, LimbSegment } from './creatureBody.ts';
import type { ModePlans } from './modePlans.ts';

/**
 * What a CREATURE sheet asks for, per sheet mode.
 *
 * Structurally parallel to CHARACTER — a quadruped decomposes into the same segment chain a biped
 * does, its directional core is steered by the same chosen facings, and it splits at the same
 * eight-compass set for the same reason — but the *terminology* is its own: forelimb and hindlimb
 * rather than arm and leg, body and hindquarters rather than torso and pelvis. That distinction is
 * the point. A creature sheet asking for "hands" invites a generator to draw a humanoid hand on a
 * beast, which is the humanoid-only assumption these plans exist to stop reaching a non-humanoid
 * subject.
 *
 * Limbs are named fore/hind rather than numbered, so a subject with more than four states the extra
 * ones through its additional-anatomy field, where they are counted as their own components.
 *
 * **These are the sheets of a four-limbed animal**, and that is a claim about the base rather than about
 * the category (issue #286). The bases whose bodies have no fore and hind limbs — a serpent, a worm, an
 * octopus, a fish, a rooted growth and an amorphous mass — declare their own bodies in
 * `creatureBodies.ts` and `creatureAmorphous.ts`, and `creatureBody.ts` builds every jointed body's
 * sheets, this one's included.
 */

/** The gaits a full set of a quadruped's components has to reach, shared by the sheets that promise them. */
const CREATURE_GAITS =
  'a neutral standing stance; an alert stance; a lowered stalking crouch; a walking gait with opposing limbs; a running gait with full limb extension; and a rearing or lunging pose';

/**
 * Where each trunk piece ends — the creature spelling of the character plans' own paragraph, and
 * there for the same reason: a generator's prior for "body" is a body *with legs*, so trunk sheets
 * come back wearing limbs the inventory never listed unless the joins are named.
 *
 * Its closing sentence is about the series rather than about this sheet's own list, for the reason
 * the character spelling records: the directional core's inventory is heads, bodies and
 * hindquarters, so a sentence citing the limbs "the inventory lists separately" named a list that
 * sheet does not have.
 */
const TRUNK_TERMINATION = `Each of these is a severed, isolated piece of one animal — never the whole animal with the other
parts faded or hidden. A head ends at the neck, with no body behind it. A body ends at the neck
join, the two forelimb shoulder joins and the join to the hindquarters, and carries **no head and no
limbs**: each join is a clean, capped socket, never a stump trailing into a limb. A hindquarters
ends at the body join and the two hindlimb hip joins, and carries **no limbs** — and no tail, unless
the inventory lists a tail as its own component. Every limb is a component counted in its own right,
on this sheet or on another of this series, so a trunk piece that arrives wearing one has merged two
components into one and breaks the count in section [SEC:CONTRACT].`;

/** A forelimb's segments, which the right forelimb shares because it is the same limb redrawn. */
const FORELIMB: readonly [LimbSegment, ...LimbSegment[]] = [
  {
    name: 'upper limb',
    slug: 'upper-limb',
    plural: 'Upper limbs',
    pluralSlug: 'upper-limbs',
    positions: [
      { text: 'neutral lowered', slug: 'neutral' },
      { text: 'forward-diagonal', slug: 'forward-diagonal' },
      { text: 'raised', slug: 'raised' },
    ],
  },
  {
    name: 'lower limb',
    slug: 'lower-limb',
    plural: 'Lower limbs',
    pluralSlug: 'lower-limbs',
    positions: [
      { text: 'extension-compatible', slug: 'extension' },
      { text: 'moderate-flexion-compatible', slug: 'moderate-flexion' },
      { text: 'strong-flexion-compatible', slug: 'strong-flexion' },
    ],
  },
  {
    name: 'foot or claw',
    slug: 'foot',
    plural: 'Feet or claws',
    pluralSlug: 'feet',
    positions: [
      { text: 'relaxed', slug: 'relaxed' },
      { text: 'spread/grip-ready', slug: 'spread' },
    ],
  },
];

/** A hindlimb's segments: a foot with a third position, for the push-off a forelimb never makes. */
const HINDLIMB: readonly [LimbSegment, ...LimbSegment[]] = [
  {
    name: 'upper limb',
    slug: 'upper-limb',
    plural: 'Upper limbs',
    pluralSlug: 'upper-limbs',
    positions: [
      { text: 'neutral vertical', slug: 'neutral' },
      { text: 'forward', slug: 'forward' },
      { text: 'backward', slug: 'backward' },
    ],
  },
  {
    name: 'lower limb',
    slug: 'lower-limb',
    plural: 'Lower limbs',
    pluralSlug: 'lower-limbs',
    positions: [
      { text: 'extension-compatible', slug: 'extension' },
      { text: 'moderate-flexion-compatible', slug: 'moderate-flexion' },
      { text: 'strong-flexion-compatible', slug: 'strong-flexion' },
    ],
  },
  {
    name: 'foot or claw',
    slug: 'foot',
    plural: 'Feet or claws',
    pluralSlug: 'feet',
    positions: [
      { text: 'flat planted', slug: 'planted' },
      { text: 'forward-step', slug: 'forward-step' },
      { text: 'rear-step/push-off', slug: 'push-off' },
    ],
  },
];

/** A four-limbed animal: a head, a body and hindquarters, and a forelimb and a hindlimb a side. */
const QUADRUPED: CreatureBody = {
  trunk: [
    { name: 'head', slug: 'head', plural: 'Heads' },
    { name: 'body', slug: 'body', plural: 'Bodies' },
    { name: 'hindquarters', slug: 'hindquarters', plural: 'Hindquarters' },
  ],
  limbs: [
    { label: 'left-forelimb', stem: 'left-fore', heading: 'Left forelimb', segments: FORELIMB },
    {
      label: 'right-forelimb',
      stem: 'right-fore',
      heading: 'Right forelimb',
      segments: FORELIMB,
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
  motions: CREATURE_GAITS,
  termination: TRUNK_TERMINATION,
  // The nouns are this body's own — a body and a hindquarters, never a torso and a pelvis. The sentence
  // was drafted from CHARACTER's and kept its vocabulary, so section 3 named two pieces the inventory in
  // section 4 does not list, and the landmark rule reached the generator in words it had nothing to
  // attach them to.
  landmark:
    'a head’s front is the jaws, beak, muzzle or mandibles and its rear the back of the skull and the neck socket; a body’s front is the chest and forward shoulder girdle and its rear the dorsal ridge and the join to the hindquarters; a hindquarters’ front is the join to the body and its rear the hind or tail end.',
  scale: {
    pieces: 'a foot or claw drawn beside the body it belongs to is in proportion to it',
    trunk: 'a head drawn beside the body it joins is in proportion to it',
    // A claw rather than the pose library's `foot or claw`, because this sheet writes `Feet or
    // claws` and the singular `foot` appears nowhere on it.
    limbs: 'a claw drawn beside an upper limb is in proportion to it',
  },
};

/** The three sheets a four-limbed creature is drawn on, which is what the category falls back to. */
export const CREATURE_STANDARD_PLANS: ModePlans = creaturePlansFor(QUADRUPED);
