import { HEAD_LANDMARK, TORSO_LANDMARK } from '../promptText/landmarks.ts';
import { HEAD, PELVIS, STANDARD_HUMANOID, TORSO } from './character.ts';
import { characterPlansFor } from './characterBody.ts';
import {
  ARM,
  DIGITIGRADE_LEG,
  FORELEG,
  HIND_LEG,
  LEG,
  SECOND_ARM,
  SERPENT_BODY,
  TAIL,
  WING,
} from './characterLimbs.ts';
import type { ModePlans } from './modePlans.ts';

/**
 * The CHARACTER *Anatomy Base* values whose body is not the standard humanoid's, and the sheets each
 * of them draws (issue #284).
 *
 * **Each one is a base whose own name contradicted the standard sheets.** A winged or tailed humanoid
 * was drawn with no wing and no tail, a four-armed one with two arms, a taur, a centaur and a naga on a
 * pelvis and two legs, and a digitigrade one was told to strike with a heel it does not have. Section 1
 * carries the base verbatim, so each of those was a sheet stating one body above an inventory drawing
 * another.
 *
 * **Written as bodies rather than as sheets**, so what a reader compares between two bases is the
 * trunk, the limbs, the ends and the poses that differ. `characterBody.ts` builds every sheet from
 * them, and splits a series where a body is too large for one generation.
 *
 * `Chibi Super-Deformed`, `Humanoid With Prosthetic Limb` and `Hybrid Half-Beast Form` are not here,
 * because the standard sheets draw each of them: a chibi figure is the standard pieces at other
 * proportions, a prosthetic limb is one of the four limbs made of something else, and a half-beast form
 * is a head, a torso, a pelvis and four limbs with a beast's surface and features.
 */

/** Wings on the back, drawn and rigged as a pair of their own; the poses add the one they are for. */
export const CHARACTER_WINGED_PLANS: ModePlans = characterPlansFor({
  trunk: [
    HEAD,
    {
      ...TORSO,
      ends: `A torso ends at the neck
opening, the two shoulder openings, the two wing roots on its back and the waist, and carries
**no head, no arms, no wings and no legs**: each opening is a clean, capped joint socket, never a stump
trailing into a limb or a wing.`,
    },
    PELVIS,
  ],
  poses: [...STANDARD_HUMANOID.poses, 'a hovering pose with the wings fully spread'],
  chains: [ARM, WING, LEG],
});

/** A tail at the base of the spine, which the pelvis ends at as it ends at the hips. */
export const CHARACTER_TAILED_PLANS: ModePlans = characterPlansFor({
  ...STANDARD_HUMANOID,
  trunk: [
    HEAD,
    TORSO,
    {
      ...PELVIS,
      ends: `A pelvis ends at the
waist, the two hip openings and the tail root at the base of the spine, and carries
**no legs and no tail**.`,
    },
  ],
  chains: [ARM, TAIL, LEG],
});

/**
 * A second pair of arms below the first. Four arms' and two legs' posed variants are past one
 * generation, so the pose library and the articulation run each take two sheets: the four arms on one,
 * the legs on the other.
 */
export const CHARACTER_FOUR_ARMED_PLANS: ModePlans = characterPlansFor({
  ...STANDARD_HUMANOID,
  trunk: [
    HEAD,
    {
      ...TORSO,
      ends: `A torso ends at the neck
opening, the two shoulder openings, the two second-arm shoulder openings below them and the waist, and
carries **no head, no arms and no legs**: each opening is a clean, capped joint socket, never a stump
trailing into a limb.`,
    },
    PELVIS,
  ],
  chains: [ARM, SECOND_ARM, LEG],
});

/**
 * A humanoid torso rising from a four-legged lower body, with the tail such a body has. `Quadruped
 * Taur` and `Centaur Lower Body` both draw it, so they share this table: a centaur's lower body is a
 * horse's, and the entries say hooves or paws so one list is true of both.
 */
export const CHARACTER_TAUR_PLANS: ModePlans = characterPlansFor({
  trunk: [
    HEAD,
    {
      ...TORSO,
      ends: `A torso ends at the neck
opening, the two shoulder openings and the waist, and carries **no head, no arms and no lower body**:
each opening is a clean, capped joint socket, never a stump trailing into a limb.`,
    },
    {
      name: 'lower body',
      plural: 'Lower bodies',
      ends: `A lower body is the
four-legged body the torso rises from: it ends at the waist join at its front, the two foreleg
shoulder joins, the two hind-leg hip joins and the tail root, and carries
**no torso, no legs and no tail**.`,
    },
  ],
  poses: [
    'a neutral standing pose',
    'a relaxed stance',
    'a forward reach',
    'a walking gait with the legs moving in diagonal pairs',
    'a galloping stride with the legs fully extended and gathered',
    'a rearing pose on the hind legs',
  ],
  chains: [ARM, FORELEG, HIND_LEG, TAIL],
  landmark: `${HEAD_LANDMARK}; ${TORSO_LANDMARK}; a lower body’s front is the breast between the forelegs, below the waist join, and its rear the hindquarters and the tail root.`,
});

/** A naga's or lamia's serpent body, which the torso rises from at the waist in place of a pelvis. */
export const CHARACTER_SERPENT_PLANS: ModePlans = characterPlansFor({
  trunk: [
    HEAD,
    {
      ...TORSO,
      ends: `A torso ends at the neck
opening, the two shoulder openings and the waist, where the serpent body begins, and carries
**no head, no arms and no serpent body**: each opening is a clean, capped joint socket, never a stump
trailing into a limb or the serpent body.`,
    },
  ],
  poses: [
    'a neutral upright pose raised on the serpent body',
    'a relaxed pose with the serpent body gathered beneath it',
    'a forward reach',
    'a slithering glide with the serpent body curved into an S',
    'a raised strike with the torso lifted high',
    'a low crouch with the rising section leaning forward',
  ],
  chains: [ARM, SERPENT_BODY],
  landmark: `${HEAD_LANDMARK}; ${TORSO_LANDMARK}.`,
});

/** The standard humanoid standing on its toes, with the heel raised as a hock. */
export const CHARACTER_DIGITIGRADE_PLANS: ModePlans = characterPlansFor({
  ...STANDARD_HUMANOID,
  chains: [ARM, DIGITIGRADE_LEG],
});
