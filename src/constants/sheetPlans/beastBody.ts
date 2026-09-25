import { bodySegment } from './bodySegment.ts';
import type { LimbSegment, TrunkPiece } from './creatureBody.ts';
import type { PartDrawing } from './partDrawing.ts';

/**
 * A beast's trunk and its forelimb and hindlimb, as the bodies built on them are fitted with them
 * (issue #285).
 *
 * A leaf of its own because three bodies share them: the quadruped stands on both pairs, the hydra
 * carries the same trunk and four limbs under its necks, and the bipedal beast rises onto its
 * hindlimbs while its forelimb ends in a hand of its own. The quadruped and the bipedal beast also share
 * where each trunk piece ends, because standing upright moves no join. Which end of each piece leads
 * does change, so the bipedal beast states its own landmark.
 */

/** A head, a body and a hindquarters — the creature spelling of a head, a torso and a pelvis. */
export const BEAST_TRUNK: readonly [TrunkPiece, ...TrunkPiece[]] = [
  { name: 'head', slug: 'head', plural: 'Heads' },
  { name: 'body', slug: 'body', plural: 'Bodies' },
  { name: 'hindquarters', slug: 'hindquarters', plural: 'Hindquarters' },
];

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
export const BEAST_TERMINATION = `Each of these is a severed, isolated piece of one animal — never the whole animal with the other
parts faded or hidden. A head ends at the neck, with no body behind it. A body ends at the neck
join, the two forelimb shoulder joins and the join to the hindquarters, and carries **no head and no
limbs**: each join is a clean, capped socket, never a stump trailing into a limb. A hindquarters
ends at the body join and the two hindlimb hip joins, and carries **no limbs** — and no tail, unless
the inventory lists a tail as its own component. Every limb is a component counted in its own right,
on this sheet or on another of this series, so a trunk piece that arrives wearing one has merged two
components into one and breaks the count in section [SEC:CONTRACT].`;

/**
 * How far the lower limb bends: named for the flexion each drawing suits, never drawn bent, for the
 * reason `CURVES` in `bodySegment.ts` gives. Every beast limb shares it, and so does an arthropod's
 * lower leg.
 */
export const FLEXIONS: readonly [PartDrawing, ...PartDrawing[]] = [
  { text: 'extension-compatible', slug: 'extension' },
  { text: 'moderate-flexion-compatible', slug: 'moderate-flexion' },
  { text: 'strong-flexion-compatible', slug: 'strong-flexion' },
];

const LOWER_LIMB = bodySegment('lower limb', 'lower-limb', FLEXIONS);

/** A forelimb above whatever it ends in: a foot on the quadruped, a hand on the bipedal beast. */
export const FORELIMB_ABOVE_THE_END: readonly [LimbSegment, LimbSegment] = [
  bodySegment('upper limb', 'upper-limb', [
    { text: 'neutral lowered', slug: 'neutral' },
    { text: 'forward-diagonal', slug: 'forward-diagonal' },
    { text: 'raised', slug: 'raised' },
  ]),
  LOWER_LIMB,
];

/** A hindlimb above whatever it ends in: a foot on a beast, a talon on a bird. */
export const HINDLIMB_ABOVE_THE_END: readonly [LimbSegment, LimbSegment] = [
  bodySegment('upper limb', 'upper-limb', [
    { text: 'neutral vertical', slug: 'neutral' },
    { text: 'forward', slug: 'forward' },
    { text: 'backward', slug: 'backward' },
  ]),
  LOWER_LIMB,
];

/** A forelimb's segments, which the right forelimb shares because it is the same limb redrawn. */
export const FORELIMB: readonly [LimbSegment, ...LimbSegment[]] = [
  ...FORELIMB_ABOVE_THE_END,
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
export const HINDLIMB: readonly [LimbSegment, ...LimbSegment[]] = [
  ...HINDLIMB_ABOVE_THE_END,
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
