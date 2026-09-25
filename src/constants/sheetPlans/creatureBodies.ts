import { bodySegment, CURVES } from './bodySegment.ts';
import { creaturePlansFor } from './creatureBody.ts';
import type { CreatureBody, LimbSegment } from './creatureBody.ts';
import type { ModePlans } from './modePlans.ts';
import type { PartDrawing } from './partDrawing.ts';

/**
 * The five *Anatomy Base* values whose bodies have no fore and hind limbs and still turn about pivots,
 * and the sheets each of them draws (issue #286).
 *
 * **Each one is a base whose own name contradicted the standard sheets.** A serpent and a burrowing
 * worm are a head and a chain of body segments. An octopus is a head, a mantle and eight tentacles. A
 * fish swims on a pair of pectoral fins, a dorsal fin and a tail. A rooted growth is a crown on a stalk
 * over its roots. Section 1 carries the base verbatim, so each of those stated one body above an
 * inventory ordering four limbs and a hindquarters.
 *
 * **Written as bodies rather than as sheets**, so what a reader compares between two bases is the
 * trunk, the limbs and the positions each segment takes. `creatureBody.ts` builds the three sheets from
 * them. `Amorphous — No Fixed Limbs` is not here: nothing on it turns about a pivot, so it has no rig and
 * no segments to draw in positions, and `creatureAmorphous.ts` draws it.
 */

/**
 * A snake, a wyrm, an eel-bodied hydra: a head over a chain of body segments that bend, and nothing
 * else. **Tailless is the base's word, and the plan keeps it**: the last segment closes in a taper
 * rather than a tail, and a tail the reader asks for in *Extra Appendages* is a component of its own.
 */
const SERPENTINE: CreatureBody = {
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
        bodySegment('tapered end', 'tapered-end', CURVES),
      ],
    },
  ],
  limbNoun: 'body segments',
  motionNoun: 'movement',
  motions:
    'a coiled resting stance; an alert posture with the front of the body raised; a slithering glide in S-curves; a sidewinding crawl; a striking lunge; and a constricting coil',
  termination: `Each of these is a severed, isolated piece of one animal — never the whole animal with the other
parts faded or hidden. The animal has **no limbs** at all. A head ends at the neck join, with no body
behind it. Each body segment ends at the join to the segment before it and the join to the segment
after it, and the tapered end ends at the join to the hind segment and closes in a blunt taper, with
**no tail** unless the inventory lists a tail as its own component. Each join is a clean, capped
socket, never a stump trailing into the next piece. Every segment is a component counted in its own
right, on this sheet or on another of this series, so a piece that arrives joined to the next has
merged two components into one and breaks the count in section [SEC:CONTRACT].`,
  landmark: 'a head’s front is the jaws and snout and its rear the back of the skull and the neck join.',
  scale: {
    pieces: 'a head drawn beside the fore segment it joins is in proportion to it',
    trunk: 'one view of the head and the view beside it are the same head drawn at the same scale',
    limbs: 'a tapered end drawn beside a fore segment is in proportion to it',
  },
};

/**
 * How a worm's segment is drawn: stretched thin, at rest, and bunched thick, which is how it crawls.
 *
 * A change of length and girth rather than a bend, so each is a rigid drawing of its own — as a foot
 * is drawn relaxed and spread — and section 5's rule against a pre-bent segment is not in question.
 */
const PERISTALSIS: readonly [PartDrawing, ...PartDrawing[]] = [
  { text: 'stretched', slug: 'stretched' },
  { text: 'relaxed', slug: 'relaxed' },
  { text: 'bunched', slug: 'bunched' },
];

/**
 * A sandworm, a grave-borer, a giant earthworm: a head over a chain of segments that crawl by
 * stretching and bunching in turn rather than by bending, which is what sets it apart from the serpent.
 */
const BURROWING_WORM: CreatureBody = {
  trunk: [{ name: 'head', slug: 'head', plural: 'Heads' }],
  limbs: [
    {
      label: 'body',
      stem: 'body',
      heading: 'Body',
      segments: [
        bodySegment('fore segment', 'fore-segment', PERISTALSIS),
        bodySegment('mid segment', 'mid-segment', PERISTALSIS),
        bodySegment('hind segment', 'hind-segment', PERISTALSIS),
        bodySegment('tail end', 'tail-end', PERISTALSIS),
      ],
    },
  ],
  limbNoun: 'body segments',
  motionNoun: 'movement',
  motions:
    'a resting sprawl; a crawl in which the segments bunch and stretch in turn; a burrowing dive, head first and downward; an emergence with the front of the body rising; a rearing strike; and a recoil into a tight curl',
  termination: `Each of these is a severed, isolated piece of one animal — never the whole animal with the other
parts faded or hidden. The animal has **no limbs** at all. A head ends at the join to the fore
segment, with no body behind it. Each body segment ends at the join to the segment before it and the
join to the segment after it, and the tail end ends at the join to the hind segment and closes the
body. Each join is a clean, capped socket, never a stump trailing into the next piece. Every segment
is a component counted in its own right, on this sheet or on another of this series, so a piece that
arrives joined to the next has merged two components into one and breaks the count in section
[SEC:CONTRACT].`,
  landmark: 'a head’s front is the mouth, maw or rasping snout and its rear the join to the fore segment.',
  scale: {
    pieces: 'a head drawn beside the fore segment it joins is in proportion to it',
    trunk: 'one view of the head and the view beside it are the same head drawn at the same scale',
    limbs: 'a tail end drawn beside a fore segment is in proportion to it',
  },
};

/**
 * A kraken, a void squid, a cave octopus: a head and a mantle over eight tentacles.
 *
 * **The tentacle is drawn once, not eight times.** Eight arms of one design are one set of pieces
 * fitted to eight sockets, and drawing each apart would order 72 variants of one shape on a pose library
 * and 24 near-identical pieces on a rig. The termination says so, because a sheet that lists one
 * tentacle without saying why reads as an octopus with one arm.
 */
const OCTOPUS: CreatureBody = {
  trunk: [
    { name: 'head', slug: 'head', plural: 'Heads' },
    { name: 'mantle', slug: 'mantle', plural: 'Mantles' },
  ],
  limbs: [
    {
      label: 'tentacle',
      stem: 'tentacle',
      heading: 'Tentacle',
      intro: 'The pieces every one of the eight tentacles is assembled from, each drawn once per position:',
      segments: [
        bodySegment('root segment', 'root-segment', CURVES),
        bodySegment('middle segment', 'middle-segment', CURVES),
        bodySegment('tip', 'tip', CURVES),
      ],
    },
  ],
  limbNoun: 'tentacles',
  motionNoun: 'movement',
  motions:
    'a resting sprawl with the tentacles spread; a crawl across the tentacle tips; a jetting dart with the tentacles trailing together; a rearing threat with the tentacles raised; a grasping lunge; and a defensive curl with the tentacles drawn in',
  termination: `Each of these is a severed, isolated piece of one animal — never the whole animal with the other
parts faded or hidden. A mantle ends at the join to the head, with nothing else on it. A head ends at
the mantle join and at a ring of eight tentacle sockets beneath it, and carries **no tentacles**: each
socket is a clean, capped join, never a stump trailing into a tentacle. The tentacle pieces serve all
eight tentacles — every tentacle is assembled from the same root segments, middle segments and tips,
fitted to each socket in turn — so this series draws them once rather than once per tentacle. Every
tentacle piece is a component counted in its own right, on this sheet or on another of this series,
so a head that arrives wearing one has merged two components into one and breaks the count in section
[SEC:CONTRACT].`,
  landmark:
    'a head’s front is the side its eyes look out of, above the beak and the ring of tentacle sockets, and its rear the join to the mantle; a mantle’s front is the join to the head and its rear the rounded end of the sac.',
  scale: {
    pieces: 'a tip drawn beside the head it belongs to is in proportion to it',
    trunk: 'a head drawn beside the mantle it joins is in proportion to it',
    limbs: 'a tip drawn beside a root segment is in proportion to it',
  },
};

/** A pectoral fin's positions, which the right fin shares because it is the same fin redrawn. */
const PECTORAL_FIN: readonly [LimbSegment] = [
  bodySegment('pectoral fin', 'fin', [
    { text: 'folded', slug: 'folded' },
    { text: 'spread', slug: 'spread' },
    { text: 'sculling', slug: 'sculling' },
  ]),
];

/** A shark, a leviathan, an angler: a head and a body that swim on two pectoral fins, a dorsal fin and a tail. */
const FINNED_AQUATIC: CreatureBody = {
  trunk: [
    { name: 'head', slug: 'head', plural: 'Heads' },
    { name: 'body', slug: 'body', plural: 'Bodies' },
  ],
  limbs: [
    {
      label: 'left-pectoral-fin',
      stem: 'left-pectoral',
      heading: 'Left pectoral fin',
      segments: PECTORAL_FIN,
    },
    {
      label: 'right-pectoral-fin',
      stem: 'right-pectoral',
      heading: 'Right pectoral fin',
      segments: PECTORAL_FIN,
      mirrors: 'the left pectoral fin',
    },
    {
      label: 'dorsal-fin',
      stem: 'dorsal',
      heading: 'Dorsal fin',
      segments: [
        bodySegment('dorsal fin', 'fin', [
          { text: 'lowered', slug: 'lowered' },
          { text: 'raised', slug: 'raised' },
        ]),
      ],
    },
    {
      label: 'tail',
      stem: 'tail',
      heading: 'Tail',
      segments: [
        bodySegment('tail stock', 'stock', [
          { text: 'straight', slug: 'straight' },
          { text: 'swept', slug: 'swept' },
          { text: 'sharply swept', slug: 'sharply-swept' },
        ]),
        bodySegment('tail fin', 'fin', [
          { text: 'closed', slug: 'closed' },
          { text: 'fanned', slug: 'fanned' },
        ]),
      ],
    },
  ],
  limbNoun: 'fins and tail',
  motionNoun: 'movement',
  motions:
    'a level cruising glide; a slow hover with the pectoral fins sculling; a tail-beat sweep to either side; a banking turn; a darting burst of speed; and a lunge with the jaws forward',
  termination: `Each of these is a severed, isolated piece of one animal — never the whole animal with the other
parts faded or hidden. The animal has **no legs** at all. A head ends at the gill line, with no body
behind it. A body ends at the gill line, the two pectoral fin roots, the dorsal fin root and the tail
join, and carries **no fins and no tail**: each join is a clean, capped socket, never a stump
trailing into a fin. A tail stock ends at the body join and the tail fin join, and carries no tail
fin. Every fin and tail piece is a component counted in its own right, on this sheet or on another of
this series, so a body that arrives wearing one has merged two components into one and breaks the
count in section [SEC:CONTRACT].`,
  landmark:
    'a head’s front is the snout and jaws and its rear the gill line; a body’s front is the gill line and its rear the join to the tail.',
  scale: {
    pieces: 'a tail fin drawn beside the body it belongs to is in proportion to it',
    trunk: 'a head drawn beside the body it joins is in proportion to it',
    limbs: 'a pectoral fin drawn beside a tail fin is in proportion to it',
  },
};

/**
 * How a stalk section is drawn: once for each lean it has to sit in as the growth sways and strikes —
 * named for the lean it suits and never drawn bent, for the reason {@link CURVES} gives.
 */
const SWAYS: readonly [PartDrawing, ...PartDrawing[]] = [
  { text: 'upright-compatible', slug: 'upright' },
  { text: 'moderate-sway-compatible', slug: 'moderate-sway' },
  { text: 'strong-sway-compatible', slug: 'strong-sway' },
];

/**
 * A carnivorous bloom, a strangling vine, a spore-stalk: a crown on a stalk that bends over roots that
 * do not move. **The roots are one piece**, because a growth that is stationary has nothing to swing
 * them about, and the stalk is the chain because it is what sways, recoils and strikes.
 */
const ROOTED_GROWTH: CreatureBody = {
  trunk: [
    { name: 'crown', slug: 'crown', plural: 'Crowns' },
    { name: 'root mass', slug: 'root-mass', plural: 'Root masses' },
  ],
  limbs: [
    {
      label: 'stalk',
      stem: 'stalk',
      heading: 'Stalk',
      segments: [
        bodySegment('lower section', 'lower-section', SWAYS),
        bodySegment('middle section', 'middle-section', SWAYS),
        bodySegment('upper section', 'upper-section', SWAYS),
      ],
    },
  ],
  limbNoun: 'stalk',
  motionNoun: 'movement',
  motions:
    'a still, upright rest; a slow sway; a recoil away from a threat; a lunging strike bent hard from the base; a lashing sweep to either side; and a wilted droop',
  termination: `Each of these is a severed, isolated piece of one growth — never the whole growth with the other
parts faded or hidden. The growth has **no limbs** and stands where it is rooted. A crown ends at the
join to the upper section of the stalk, with no stalk below it. A root mass ends at the join to the
lower section of the stalk, with its roots spread below it and no stalk above it. Each stalk section
ends at the join below it and the join above it. Each join is a clean, capped socket, never a stump
trailing into the next piece. Every stalk section is a component counted in its own right, on this
sheet or on another of this series, so a crown or a root mass that arrives wearing one has merged two
components into one and breaks the count in section [SEC:CONTRACT].`,
  // A growth faces what it strikes at, which is the one front a rooted thing has.
  landmark:
    'a crown’s front is the face of its maw, bloom or cap, turned towards what it strikes at, and its rear the side turned away; a root mass’s front is the side under the crown’s face and its rear the side behind it.',
  scale: {
    pieces: 'a crown drawn beside the root mass it grows from is in proportion to it',
    trunk: 'a crown drawn beside the root mass it grows from is in proportion to it',
    limbs: 'a lower section drawn beside an upper section is in proportion to it',
  },
};

export const CREATURE_SERPENTINE_PLANS: ModePlans = creaturePlansFor(SERPENTINE);
export const CREATURE_WORM_PLANS: ModePlans = creaturePlansFor(BURROWING_WORM);
export const CREATURE_OCTOPUS_PLANS: ModePlans = creaturePlansFor(OCTOPUS);
export const CREATURE_FINNED_PLANS: ModePlans = creaturePlansFor(FINNED_AQUATIC);
export const CREATURE_ROOTED_PLANS: ModePlans = creaturePlansFor(ROOTED_GROWTH);
