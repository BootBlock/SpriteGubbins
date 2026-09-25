import { BEAST_TRUNK, FORELIMB, HINDLIMB } from './beastBody.ts';
import { bodySegment, CURVES } from './bodySegment.ts';
import { creaturePlansFor } from './creatureBody.ts';
import type { CreatureBody } from './creatureBody.ts';
import type { ModePlans } from './modePlans.ts';
import { severedPieceOpening } from './severedPieceOpening.ts';

/**
 * `Multi-Headed Hydra Stems`: a beast on four limbs, with necks rising from its shoulders (issue #285).
 *
 * **Every neck is one set of pieces**, as every tentacle is the octopus's: the heads of a hydra are one
 * design, so the neck is drawn once and the head once, and the termination says each is fitted to every
 * neck socket in turn. That leaves the number of heads to the design rather than to the inventory. A
 * serpent-bodied hydra is `Serpentine Tailless`, whose one head and body chain are the whole animal.
 *
 * **The pose library splits.** The quadruped's trunk and limbs are 37 components and the neck is nine
 * more, so `limbSheets` puts the hindlimbs on a second pose library sheet. The articulation sheet, which
 * draws no trunk, holds all 43.
 */
const HYDRA: CreatureBody = {
  trunk: BEAST_TRUNK,
  limbs: [
    {
      label: 'neck',
      stem: 'neck',
      heading: 'Neck',
      intro: 'The pieces every one of the necks is assembled from, each drawn once per position:',
      segments: [
        bodySegment('lower neck', 'lower-neck', CURVES),
        bodySegment('middle neck', 'middle-neck', CURVES),
        bodySegment('upper neck', 'upper-neck', CURVES),
      ],
      set: 'necks',
    },
    {
      label: 'left-forelimb',
      stem: 'left-fore',
      heading: 'Left forelimb',
      segments: FORELIMB,
      set: 'forelimbs',
    },
    {
      label: 'right-forelimb',
      stem: 'right-fore',
      heading: 'Right forelimb',
      segments: FORELIMB,
      mirrors: 'the left forelimb',
      set: 'forelimbs',
    },
    {
      label: 'left-hindlimb',
      stem: 'left-hind',
      heading: 'Left hindlimb',
      segments: HINDLIMB,
      set: 'hindlimbs',
    },
    {
      label: 'right-hindlimb',
      stem: 'right-hind',
      heading: 'Right hindlimb',
      segments: HINDLIMB,
      mirrors: 'the left hindlimb',
      set: 'hindlimbs',
    },
  ],
  limbNoun: 'necks and limbs',
  motionNoun: 'gait',
  motions:
    'a neutral standing stance with the necks raised; an alert stance with the heads spread to watch every side; a lowered stalking crouch; a walking gait with opposing limbs; a lunging strike with one neck thrown forward; and a rearing roar with every neck raised',
  termination: `${severedPieceOpening('animal')}A head ends at the join to the upper neck, with no neck behind it. The head and
neck pieces serve every head — each neck is assembled from the same pieces and carries the same head,
one to each neck socket — so this series draws one neck and one head rather than one per head. A body ends at
the row of neck sockets across its shoulders, the two forelimb shoulder joins and the join to the
hindquarters, and carries **no necks, no heads and no limbs**: each join is a clean, capped socket,
never a stump trailing into a neck or a limb. A hindquarters ends at the body join and the two
hindlimb hip joins, and carries **no limbs** — and no tail, unless the inventory lists a tail as its
own component. Every neck piece and every limb is a component counted in its own right, on this sheet
or on another of this series, so a body that arrives wearing one has merged two components into one
and breaks the count in section [SEC:CONTRACT].`,
  landmark:
    'a head’s front is the jaws and snout and its rear the join to the upper neck; a body’s front is the chest and the row of neck sockets and its rear the join to the hindquarters; a hindquarters’ front is the join to the body and its rear the hind or tail end.',
  scale: {
    pieces: 'a foot or claw drawn beside the body it belongs to is in proportion to it',
    trunk: 'a head drawn beside the body it belongs to is in proportion to it',
    limbs: 'a claw drawn beside an upper limb is in proportion to it',
  },
};

export const CREATURE_HYDRA_PLANS: ModePlans = creaturePlansFor(HYDRA);
