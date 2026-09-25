import type { CharacterBody, TrunkPiece } from './characterBody.ts';
import { characterPlansFor } from './characterBody.ts';
import { ARM, LEG } from './characterLimbs.ts';
import type { ModePlans } from './modePlans.ts';

/**
 * The standard humanoid: one head, one torso, one pelvis, two arms and two legs, and the sheets that
 * draw it.
 *
 * These are CHARACTER's standard plans — what every *Anatomy Base* its category does not declare is
 * drawn from, and what a base typed in words the pool does not offer falls back to. The bodies that
 * differ, a winged, tailed, four-armed, taur, serpent or digitigrade one, are in `characterBodies.ts`
 * and take this one's head, pelvis and poses wherever theirs are the same (issue #284).
 */

export const HEAD: TrunkPiece = {
  name: 'head',
  plural: 'Heads',
  ends: 'A head ends at the neck, with no torso below it.',
};

export const PELVIS: TrunkPiece = {
  name: 'pelvis',
  plural: 'Pelvises',
  ends: `A pelvis ends at the
waist and the two hip openings, and carries **no legs**.`,
};

export const TORSO: TrunkPiece = {
  name: 'torso',
  plural: 'Torsos',
  ends: `A torso ends at the neck
opening, the two shoulder openings and the waist, and carries **no head, no arms and no legs**: each
opening is a clean, capped joint socket, never a stump trailing into a limb.`,
};

export const STANDARD_HUMANOID: CharacterBody = {
  trunk: [HEAD, TORSO, PELVIS],
  poses: [
    'a neutral standing pose',
    'a relaxed stance',
    'a forward reach',
    'a walking stride with opposing limbs',
    'a running stride with elbow and knee flexion',
    'both a shallow and a deep crouch',
  ],
  chains: [ARM, LEG],
};

export const CHARACTER_STANDARD_PLANS: ModePlans = characterPlansFor(STANDARD_HUMANOID);
