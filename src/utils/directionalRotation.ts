import { describeDirections, facingText, isPlanView, OBJECT_YAW } from '../constants/promptText/index.ts';
import type { Direction } from '../types/rendering.ts';

/**
 * Section 3's object-yaw list: one line per facing the sheet covers, each naming the rotation and
 * what it puts in front of the camera.
 *
 * Computed rather than a fixed block of template text because the facings are not fixed — a sheet
 * covers the five classic views, or one of eight compass runs — and a list that named views the
 * sheet does not draw would be worse than none. It is also the *only* place the yaw figures are
 * stated: the inventory names the views and points here, so the two cannot drift apart.
 *
 * **The camera's elevation is the block's second input, and it decides what a yaw can be said to
 * do.** Every line below is written for a camera with somewhere to stand behind the subject; from
 * directly overhead a yaw hides nothing, so both the per-facing clauses and the paragraph closing
 * the block state the in-plane turn instead.
 *
 * Pure, like everything in `utils/`: a function of the covered facings and the elevation, and
 * nothing else.
 */
export function directionalRotation(
  covered: readonly [Direction, ...Direction[]],
  cameraElevation: number,
): string {
  const lines = covered.map((direction) => describeYaw(direction, cameraElevation)).join('\n');
  const plan = isPlanView(cameraElevation);

  // Where yaw is measured from. A plan view has nothing facing it, so the zero is stated in the
  // frame the views are actually drawn in — which is the same zero, said in the terms left to it.
  // The line breaks are the template's own wrapping, carried into the fragments so the paragraphs
  // they build come out wrapped rather than as one long line in the middle of a wrapped section.
  const datum = plan
    ? `Yaw is measured from the component’s front axis pointing
towards the bottom of the frame`
    : 'Yaw is measured from the component facing the camera';

  // One facing is not a directional set, so the rules about *disagreeing* views do not apply — but
  // the sheet is still one run of a series that shares an identity lock, and the next run differs
  // from it by object yaw alone. Saying so is what stops run two being run one, mirrored.
  if (covered.length === 1) {
    return `This sheet covers one object yaw, and every component on it is drawn at that same orientation:

${lines}

${datum}. Another sheet in this series is the same
subject at a *different* object yaw beneath this same unmoved camera — never this sheet mirrored,
and never a redesign.`;
  }

  // What the figures are *not*: a screen angle to measure off the finished image. Under a plan view
  // they are exactly that, which is worth saying rather than leaving the reader to notice — an
  // overhead camera turns a yaw into the whole of the visible rotation and into nothing else.
  const measurement = plan
    ? `This camera is
directly overhead, so a yaw *is* the turn you see: the component rotates within the image plane,
presenting the same top surface at every one of them.`
    : `These
figures fix the *physical* rotation, not a screen angle to measure off the finished image — the
projection decides how much apparent turn a given yaw produces.`;

  return `This sheet covers ${String(covered.length)} object yaws. Every component the inventory names a direction for is drawn
at each of them, in the order below; every other component is drawn at the primary assembly
direction.

${lines}

${datum}, and the whole sheet turns the same way. ${measurement}`;
}

/**
 * `- **Right side — object yaw 90°.** Turned until …`
 *
 * The name comes from {@link describeDirections} — the same function section 3's "directions
 * required" line uses — so a facing is spelled identically in the two places one prompt names it.
 */
function describeYaw(direction: Direction, cameraElevation: number): string {
  const name = describeDirections([direction]);
  return `- **${name} — object yaw ${String(OBJECT_YAW[direction])}°.** ${facingText(direction, cameraElevation)}`;
}
