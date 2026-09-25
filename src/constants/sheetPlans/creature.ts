import { BEAST_LANDMARK, BEAST_TERMINATION, BEAST_TRUNK, FORELIMB, HINDLIMB } from './beastBody.ts';
import { creaturePlansFor } from './creatureBody.ts';
import type { CreatureBody } from './creatureBody.ts';
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
 * the category (issues #285 and #286). Every other *Anatomy Base* declares its own body — the limbless
 * ones in `creatureBodies.ts` and `creatureAmorphous.ts`, the jointed-legged ones in
 * `creatureArthropods.ts`, the two bipeds in `creatureBipeds.ts` and the hydra in `creatureHydra.ts` —
 * and `creatureBody.ts` builds every jointed body's sheets, this one's included. So these are the
 * category's fallback for a base the pool no longer offers, and `Quadruped Beast`'s own.
 */

/** The gaits a full set of a quadruped's components has to reach, shared by the sheets that promise them. */
const CREATURE_GAITS =
  'a neutral standing stance; an alert stance; a lowered stalking crouch; a walking gait with opposing limbs; a running gait with full limb extension; and a rearing or lunging pose';

/** A four-limbed animal: a head, a body and hindquarters, and a forelimb and a hindlimb a side. */
const QUADRUPED: CreatureBody = {
  trunk: BEAST_TRUNK,
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
  termination: BEAST_TERMINATION,
  landmark: BEAST_LANDMARK,
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
