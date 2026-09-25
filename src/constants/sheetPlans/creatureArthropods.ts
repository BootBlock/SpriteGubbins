import { FLEXIONS } from './beastBody.ts';
import { bodySegment, CURVES } from './bodySegment.ts';
import { creaturePlansFor } from './creatureBody.ts';
import type { CreatureBody, LimbSegment } from './creatureBody.ts';
import type { ModePlans } from './modePlans.ts';

/**
 * The three *Anatomy Base* values that walk on jointed legs, and the sheets each of them draws
 * (issue #285).
 *
 * **Each one is a base the four-limbed sheets could not draw.** Those sheets draw a head, a body, a
 * hindquarters and four limbs, so `Hexapod Insect` stated six legs over four, the pool's arachnid had no
 * base with eight, and `Centipede Multi-Segment` stated a chain of segments over a hindquarters.
 *
 * **Every leg is drawn, and that is why two of these bodies split.** An insect's front leg is not its
 * hind leg, and a spider's are angled and sized by pair, so drawing one leg for all of them — the
 * octopus's answer — would lose the difference the rig and the reader both need. Six legs of eight
 * variants each are 48 components and eight are 64, so `limbSheets` deals them onto two pose library
 * and two articulation sheets. A centipede's legs are the octopus's case instead: every pair is the
 * same leg, one to each segment, so it is drawn once a side.
 */

/** One jointed leg: a thigh, a shin and a clawed tip, each drawn once per position. */
const JOINTED_LEG: readonly [LimbSegment, ...LimbSegment[]] = [
  bodySegment('upper leg', 'upper-leg', [
    { text: 'neutral splayed', slug: 'neutral' },
    { text: 'swung forward', slug: 'forward' },
    { text: 'swung back', slug: 'back' },
  ]),
  bodySegment('lower leg', 'lower-leg', FLEXIONS),
  bodySegment('clawed tip', 'tip', [
    { text: 'planted', slug: 'planted' },
    { text: 'gripping', slug: 'gripping' },
  ]),
];

/**
 * A left leg and the right leg mirroring it, named for their place along the body, and the set of legs a
 * split draws them with.
 */
function legPair(place: string, set: string): CreatureBody['limbs'] {
  const stem = place.replaceAll(' ', '-');
  return [
    {
      label: `left-${stem}-leg`,
      stem: `left-${stem}`,
      heading: `Left ${place} leg`,
      segments: JOINTED_LEG,
      set,
    },
    {
      label: `right-${stem}-leg`,
      stem: `right-${stem}`,
      heading: `Right ${place} leg`,
      segments: JOINTED_LEG,
      mirrors: `the left ${place} leg`,
      set,
    },
  ];
}

/** Where each piece ends, for a trunk whose legs all meet one piece of it. */
function leggedTermination(pieces: string): string {
  return `Each of these is a severed, isolated piece of one animal — never the whole animal with the other
parts faded or hidden. ${pieces} Each join is a clean, capped socket, never a stump trailing into a
leg. Every leg is a component counted in its own right, on this sheet or on another of this
series, so a trunk piece that arrives wearing one has merged two components into one and breaks the
count in section [SEC:CONTRACT].`;
}

/** A beetle, a mantis, a hive drone: a head, a thorax and an abdomen, with three pairs of legs on the thorax. */
const HEXAPOD: CreatureBody = {
  trunk: [
    { name: 'head', slug: 'head', plural: 'Heads' },
    { name: 'thorax', slug: 'thorax', plural: 'Thoraxes' },
    { name: 'abdomen', slug: 'abdomen', plural: 'Abdomens' },
  ],
  limbs: [
    ...legPair('front', 'front and middle legs'),
    ...legPair('middle', 'front and middle legs'),
    ...legPair('hind', 'hind legs'),
  ],
  limbNoun: 'legs',
  motionNoun: 'gait',
  motions:
    'a neutral stance on all six legs; an alert stance with the head and front legs raised; a lowered crouch; a walking gait with three legs planted while the other three swing; a scuttling run; and a rearing threat with the front legs raised',
  termination: leggedTermination(
    `A head ends at the neck join, with its antennae and mouthparts and no thorax behind it. A thorax ends
at the neck join, the six leg sockets and the join to the abdomen, and carries **no head, no legs and
no wings** unless the inventory lists wings as components of their own. An abdomen ends at the join to
the thorax, with no sting unless the inventory lists one.`,
  ),
  landmark:
    'a head’s front is the mandibles and antennae and its rear the neck join; a thorax’s front is the neck join and its rear the join to the abdomen; an abdomen’s front is the join to the thorax and its rear the tip.',
  scale: {
    pieces: 'a clawed tip drawn beside the thorax it belongs to is in proportion to it',
    trunk: 'a head drawn beside the thorax it joins is in proportion to it',
    limbs: 'a clawed tip drawn beside an upper leg is in proportion to it',
  },
};

/** A spider, a scorpion, a tick: a cephalothorax and an abdomen, with four pairs of legs on the first. */
const ARACHNID: CreatureBody = {
  trunk: [
    { name: 'cephalothorax', slug: 'cephalothorax', plural: 'Cephalothoraxes' },
    { name: 'abdomen', slug: 'abdomen', plural: 'Abdomens' },
  ],
  limbs: [
    ...legPair('front', 'front and second legs'),
    ...legPair('second', 'front and second legs'),
    ...legPair('third', 'third and hind legs'),
    ...legPair('hind', 'third and hind legs'),
  ],
  limbNoun: 'legs',
  motionNoun: 'gait',
  motions:
    'a neutral stance on all eight legs; an alert stance with the front legs raised; a low crouch before a pounce; a walking gait with four legs planted while the other four swing; a skittering run; and a pouncing leap with the front legs reaching',
  termination: leggedTermination(
    `A cephalothorax ends at the join to the abdomen and at the eight leg sockets beneath it, with its eyes
and fangs and **no legs**. An abdomen ends at the join to the cephalothorax, with no tail, sting or
pincer unless the inventory lists one as its own component.`,
  ),
  landmark:
    'a cephalothorax’s front is the eyes and fangs and its rear the join to the abdomen; an abdomen’s front is the join to the cephalothorax and its rear the spinnerets or tail end.',
  scale: {
    pieces: 'a clawed tip drawn beside the cephalothorax it belongs to is in proportion to it',
    trunk: 'a cephalothorax drawn beside the abdomen it joins is in proportion to it',
    limbs: 'a clawed tip drawn beside an upper leg is in proportion to it',
  },
};

/**
 * A centipede, a millipede, a grave-crawler: a head over a chain of body segments that bend, each with a
 * pair of legs. **The chain is as long as the design needs**: the mid segment is repeated between the
 * fore and hind segments, and the leg pieces serve every leg on their side.
 */
const CENTIPEDE: CreatureBody = {
  trunk: [{ name: 'head', slug: 'head', plural: 'Heads' }],
  limbs: [
    {
      label: 'body',
      stem: 'body',
      heading: 'Body',
      segments: [
        bodySegment('fore segment', 'fore-segment', CURVES),
        bodySegment('mid segment', 'mid-segment', CURVES),
        bodySegment('hind segment', 'hind-segment', CURVES),
        bodySegment('tail end', 'tail-end', CURVES),
      ],
    },
    {
      label: 'left-leg',
      stem: 'left',
      heading: 'Left leg',
      intro: 'The pieces every leg on the left side is assembled from, each drawn once per position:',
      segments: JOINTED_LEG,
    },
    {
      label: 'right-leg',
      stem: 'right',
      heading: 'Right leg',
      segments: JOINTED_LEG,
      mirrors: 'the left leg',
    },
  ],
  limbNoun: 'body segments and legs',
  motionNoun: 'movement',
  motions:
    'a coiled resting stance; an alert posture with the front of the body raised; a rippling crawl with each pair of legs stepping a beat behind the pair before it; a fast scuttle with the body swinging from side to side; a striking lunge with the venom claws forward; and a defensive curl',
  termination: `Each of these is a severed, isolated piece of one animal — never the whole animal with the other
parts faded or hidden. A head ends at the join to the fore segment, with its antennae and venom claws
and no body behind it. Each body segment ends at the join to the segment before it and the join to the
segment after it, and carries a pair of leg sockets and **no legs**. The body is assembled from the
fore segment, as many mid segments as its length needs, the hind segment and the tail end, which closes
the body. The leg pieces serve every leg on their side — each body segment takes one leg a side, all
assembled from the same pieces — so the inventory lists them once a side rather than once per leg.
Each join is a clean, capped socket, never a stump trailing into the next piece. Every segment and
every leg piece is a component counted in its own right, on this sheet or on another of this series,
so a segment that arrives wearing a leg has merged two components into one and breaks the count in
section [SEC:CONTRACT].`,
  landmark: 'a head’s front is the antennae and venom claws and its rear the join to the fore segment.',
  scale: {
    pieces: 'a head drawn beside the fore segment it joins is in proportion to it',
    trunk: 'one view of the head and the view beside it are the same head drawn at the same scale',
    limbs: 'a clawed tip drawn beside a fore segment is in proportion to it',
  },
};

export const CREATURE_HEXAPOD_PLANS: ModePlans = creaturePlansFor(HEXAPOD);
export const CREATURE_ARACHNID_PLANS: ModePlans = creaturePlansFor(ARACHNID);
export const CREATURE_CENTIPEDE_PLANS: ModePlans = creaturePlansFor(CENTIPEDE);
