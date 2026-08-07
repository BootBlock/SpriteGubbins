import { describeDirections, FACING_TEXT, OBJECT_YAW } from '../constants/promptText/index.ts';
import type { Direction } from '../types/rendering.ts';

/**
 * Section 3's object-yaw list: one line per facing the sheet covers, each naming the rotation and
 * what it puts in front of the camera.
 *
 * Computed rather than a fixed block of template text because the facings are not fixed — a sheet
 * covers the three classic views, or one of eight compass runs — and a list that named views the
 * sheet does not draw would be worse than none. It is also the *only* place the yaw figures are
 * stated: the inventory names the views and points here, so the two cannot drift apart.
 *
 * Pure, like everything in `utils/`: a function of the covered facings and nothing else.
 */
export function directionalRotation(covered: readonly [Direction, ...Direction[]]): string {
  const lines = covered.map(describeYaw).join('\n');

  // One facing is not a directional set, so the rules about *disagreeing* views do not apply — but
  // the sheet is still one run of a series that shares an identity lock, and the next run differs
  // from it by object yaw alone. Saying so is what stops run two being run one, mirrored.
  if (covered.length === 1) {
    return `This sheet covers one object yaw, and every component on it is drawn at that same orientation:

${lines}

Yaw is measured from the component facing the camera. Another sheet in this series is the same
subject at a *different* object yaw beneath this same unmoved camera — never this sheet mirrored,
and never a redesign.`;
  }

  return `This sheet covers ${String(covered.length)} object yaws. Every component the inventory names a direction for is drawn
at each of them, in the order below; every other component is drawn at the primary assembly
direction.

${lines}

Yaw is measured from the component facing the camera, and the whole sheet turns the same way. These
figures fix the *physical* rotation, not a screen angle to measure off the finished image — the
projection decides how much apparent turn a given yaw produces.`;
}

/**
 * `- **Right side — object yaw 90°.** Turned until …`
 *
 * The name comes from {@link describeDirections} — the same function section 3's "directions
 * required" line uses — so a facing is spelled identically in the two places one prompt names it.
 */
function describeYaw(direction: Direction): string {
  const name = describeDirections([direction]);
  return `- **${name} — object yaw ${String(OBJECT_YAW[direction])}°.** ${FACING_TEXT[direction]}`;
}
