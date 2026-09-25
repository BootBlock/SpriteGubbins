import type { LimbChain, LimbSegment } from './characterBody.ts';

/**
 * The limb chains CHARACTER bodies are built from, each written once however many bodies hang it.
 *
 * **Each segment's variants are the orientations the posed sheets draw it at**, and they are chosen
 * against the poses the bodies promise: an upper arm lowered, forward and raised is what a reach, a
 * stride and a crouch need between them, and a serpent's sections fitted to lie straight, to bend and
 * to bend sharply are what a glide, a strike and a gathered coil need. Every segment is rigid, as
 * section 5 requires, so a bend is two segments drawn at an angle and never one drawn bent. The rig
 * draws every segment once, unposed.
 *
 * **A segment's slug and group are unique within a body**, because they name components in the sprite
 * manifest. A four-armed body's second pair is the first pair's segments under a `second-` stem, and a
 * taur's forelegs and hind legs are one leg's segments under stems of their own, so no two components
 * of one sheet share a name.
 */

const UPPER_ARM: LimbSegment = {
  name: 'upper arm',
  plural: 'Upper arms',
  slug: 'upper-arm',
  group: 'upper-arms',
  variants: [
    { text: 'neutral lowered', slug: 'neutral' },
    { text: 'forward-diagonal', slug: 'forward-diagonal' },
    { text: 'raised', slug: 'raised' },
  ],
};

/** The three flexions every lower limb segment is drawn in, so the joint above it can bend. */
const FLEXIONS: LimbSegment['variants'] = [
  { text: 'extension-compatible', slug: 'extension' },
  { text: 'moderate-flexion-compatible', slug: 'moderate-flexion' },
  { text: 'strong-flexion-compatible', slug: 'strong-flexion' },
];

const LOWER_ARM: LimbSegment = {
  name: 'lower arm',
  plural: 'Lower arms',
  slug: 'lower-arm',
  group: 'lower-arms',
  variants: FLEXIONS,
};

const HAND: LimbSegment = {
  name: 'hand',
  plural: 'Hands',
  slug: 'hand',
  group: 'hands',
  variants: [
    { text: 'relaxed empty', slug: 'relaxed' },
    { text: 'closed/grip-ready empty', slug: 'closed' },
  ],
};

/** The three orientations of every upper leg segment: under the hip, stepping forward, pushing back. */
const LEG_SWINGS: LimbSegment['variants'] = [
  { text: 'neutral vertical', slug: 'neutral' },
  { text: 'forward', slug: 'forward' },
  { text: 'backward', slug: 'backward' },
];

const UPPER_LEG: LimbSegment = {
  name: 'upper leg',
  plural: 'Upper legs',
  slug: 'upper-leg',
  group: 'upper-legs',
  variants: LEG_SWINGS,
};

const LOWER_LEG: LimbSegment = {
  name: 'lower leg',
  plural: 'Lower legs',
  slug: 'lower-leg',
  group: 'lower-legs',
  variants: FLEXIONS,
};

export const ARM: LimbChain = {
  noun: 'arm',
  plural: 'arms',
  sort: 'limb',
  sides: 'PAIRED',
  smallest: 'a hand',
  largest: 'an upper arm',
  segments: [UPPER_ARM, LOWER_ARM, HAND],
};

/** A segment under another stem, so a second chain drawn from it names its components apart. */
function restemmed(segment: LimbSegment, stem: string): LimbSegment {
  return { ...segment, slug: `${stem}-${segment.slug}`, group: `${stem}-${segment.group}` };
}

/**
 * A four-armed body's second pair, set below the first: the same segments, drawn in the same variants,
 * under a stem of their own.
 */
export const SECOND_ARM: LimbChain = {
  ...ARM,
  noun: 'second arm',
  plural: 'second arms',
  segments: [restemmed(UPPER_ARM, 'second'), restemmed(LOWER_ARM, 'second'), restemmed(HAND, 'second')],
};

export const LEG: LimbChain = {
  noun: 'leg',
  plural: 'legs',
  sort: 'limb',
  sides: 'PAIRED',
  // The lower leg rather than the foot, because the articulation run writes `Feet` and a sheet of legs
  // alone gives the singular nothing to point at.
  smallest: 'a lower leg',
  largest: 'an upper leg',
  segments: [
    UPPER_LEG,
    LOWER_LEG,
    {
      name: 'foot',
      plural: 'Feet',
      slug: 'foot',
      group: 'feet',
      variants: [
        { text: 'flat planted', slug: 'planted' },
        { text: 'forward-step/heel-strike', slug: 'heel-strike' },
        { text: 'rear-step/toe-off', slug: 'toe-off' },
      ],
    },
  ],
};

/**
 * A digitigrade leg: the standard one, standing on its toes with the heel raised as a hock.
 *
 * The foot is the raised span from the hock to the toes, which is what bends at the ankle, so the rig
 * keeps three pieces. Its variants replace the heel strike a digitigrade foot does not have with the
 * toe strike it does.
 */
export const DIGITIGRADE_LEG: LimbChain = {
  ...LEG,
  segments: [
    UPPER_LEG,
    LOWER_LEG,
    {
      name: 'raised foot',
      plural: 'Raised feet',
      slug: 'foot',
      group: 'feet',
      variants: [
        { text: 'planted on the toes with the heel raised', slug: 'planted' },
        { text: 'forward-step/toe-strike', slug: 'toe-strike' },
        { text: 'rear-step/push-off', slug: 'push-off' },
      ],
    },
  ],
};

/**
 * A wing drawn whole in each state it opens to, as a hand is drawn relaxed and closed: how far a wing
 * opens is its shape rather than a bend between two rigid segments. The rig swings it at the wing root.
 */
export const WING: LimbChain = {
  noun: 'wing',
  plural: 'wings',
  sort: 'wing',
  sides: 'PAIRED',
  smallest: 'a folded wing',
  largest: 'a fully spread wing',
  segments: [
    {
      name: 'wing',
      plural: 'Wings',
      slug: 'wing',
      group: 'wings',
      variants: [
        { text: 'folded against the back', slug: 'folded' },
        { text: 'half-spread', slug: 'half-spread' },
        { text: 'fully spread', slug: 'spread' },
      ],
    },
  ],
};

/** The three swings a chain's root segment is drawn at, from the joint the trunk carries. */
const ROOT_SWINGS: LimbSegment['variants'] = [
  { text: 'lowered', slug: 'lowered' },
  { text: 'level', slug: 'level' },
  { text: 'raised', slug: 'raised' },
];

/**
 * A tail on the centreline, as two rigid segments: a base swung from the tail root, and a tip fitted
 * to bend against it. Section 5 forbids a pre-bent segment, so a curled tail is the two drawn at an
 * angle to each other rather than one piece drawn curled.
 */
export const TAIL: LimbChain = {
  noun: 'tail',
  plural: 'tail',
  sort: 'tail',
  sides: 'SINGLE',
  smallest: 'a tail tip',
  largest: 'a tail base',
  segments: [
    {
      name: 'tail base',
      plural: 'Tail bases',
      slug: 'tail-base',
      group: 'tail-bases',
      variants: ROOT_SWINGS,
    },
    { name: 'tail tip', plural: 'Tail tips', slug: 'tail-tip', group: 'tail-tips', variants: FLEXIONS },
  ],
};

/** The hooves or paws of a four-legged lower body, planted and stepping as a leg's feet are. */
const HOOF_STEPS: LimbSegment['variants'] = [
  { text: 'flat planted', slug: 'planted' },
  { text: 'forward-step', slug: 'forward-step' },
  { text: 'rear-step/push-off', slug: 'push-off' },
];

/** One leg of a four-legged lower body, under the stem that keeps its components apart from the others. */
function quadrupedLeg(noun: string, stem: string, smallest: string, largest: string): LimbChain {
  return {
    noun,
    plural: `${noun}s`,
    sort: 'limb',
    sides: 'PAIRED',
    smallest,
    largest,
    segments: [
      { ...UPPER_LEG, slug: `upper-${stem}`, group: `upper-${stem}s` },
      { ...LOWER_LEG, slug: `lower-${stem}`, group: `lower-${stem}s` },
      {
        name: 'hoof or paw',
        plural: 'Hooves or paws',
        slug: `${stem}-hoof`,
        group: `${stem}-hooves`,
        variants: HOOF_STEPS,
      },
    ],
  };
}

// The smallest piece is the lower leg rather than the hoof or paw, because the articulation run writes
// `Hooves or paws` and the singular `hoof` appears nowhere on it for a scale example to point at.
export const FORELEG: LimbChain = quadrupedLeg('foreleg', 'foreleg', 'a lower foreleg', 'an upper foreleg');
export const HIND_LEG: LimbChain = quadrupedLeg(
  'hind leg',
  'hind-leg',
  'a lower hind leg',
  'an upper hind leg',
);

/**
 * The serpent's body a naga or lamia stands on in place of a pelvis and legs, as four rigid segments:
 * the section that rises from the ground to the waist, two that lie along the ground, and the tip.
 * Section 5 forbids a pre-bent segment, so a glide's curve or a gathered coil is the segments drawn at
 * angles to each other, each fitted at its root to the bend it makes there.
 */
export const SERPENT_BODY: LimbChain = {
  noun: 'serpent body',
  plural: 'serpent body',
  sort: 'tail',
  sides: 'SINGLE',
  smallest: 'a tail tip',
  largest: 'a rising section',
  segments: [
    {
      name: 'rising section',
      plural: 'Rising sections',
      slug: 'rising-section',
      group: 'rising-sections',
      variants: [
        { text: 'upright', slug: 'upright' },
        { text: 'leaning forward', slug: 'forward' },
        { text: 'leaning back', slug: 'back' },
      ],
    },
    {
      name: 'middle section',
      plural: 'Middle sections',
      slug: 'middle-section',
      group: 'middle-sections',
      variants: FLEXIONS,
    },
    {
      name: 'rear section',
      plural: 'Rear sections',
      slug: 'rear-section',
      group: 'rear-sections',
      variants: FLEXIONS,
    },
    { name: 'tail tip', plural: 'Tail tips', slug: 'tail-tip', group: 'tail-tips', variants: FLEXIONS },
  ],
};
