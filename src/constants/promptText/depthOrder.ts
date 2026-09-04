import type { Direction } from '../../types/rendering.ts';
import { isPlanView } from './elevation.ts';

/**
 * Which of the subject's sides sits in front of its body, per facing.
 *
 * Keyed by direction rather than by mode because it is a property of *facing*: south-facing puts the
 * front in front, north-facing puts it behind, and the diagonals split. Without it, the near-side
 * pieces render behind the body the moment the subject turns.
 *
 * **It says "pieces", not "arms".** These lines reach section 5 of every cut-out-rig sheet the app
 * composes, and only two categories have arms, a torso and a pelvis to order — a tank rig was told
 * which of its arms rendered in front of its torso. The geometry is the same for every one of them
 * and it is the whole content of the line: whatever the subject carries on the side facing the
 * camera draws over the body, and whatever it carries on the far side draws under it.
 *
 * **Which diagonal puts which side in front is not a choice.** Facing north your right hand points
 * east, so facing south-west it points north-west — away from a camera sitting south of the subject,
 * which makes the *left* side the near one. Derive it rather than picking whichever reads better: a
 * near side that disagrees with the side `rotation.ts` says the same facing presents is a
 * contradiction inside one prompt, and the generator resolves it however it likes.
 *
 * **Every line here assumes the camera has somewhere to stand behind the subject**, which is what
 * {@link PLAN_DEPTH_ORDER_TEXT} exists for.
 */
export const DEPTH_ORDER_TEXT: Readonly<Record<Direction, string>> = {
  front:
    'Facing the camera: every piece carried on the front or the sides of the body renders in front of it.',
  'front-three-quarter':
    'Angled towards the camera: pieces on the near (right) side render in front of the body, pieces on the far side behind it.',
  'right side':
    'In profile with the right side towards the camera: pieces on the right render in front of the body, pieces on the left behind it.',
  'back-three-quarter':
    'Angled away from the camera: pieces on the near (right) side render in front of the body, pieces on the far side behind it, and the rear of the body faces the viewer.',
  back: 'Facing away from the camera: every piece carried on the front or the sides of the body renders behind it, and its rear faces the viewer.',
  south:
    'Facing the camera: every piece carried on the front or the sides of the body renders in front of it.',
  'south-west':
    'Angled towards the camera: pieces on the near (left) side render in front of the body, pieces on the far side behind it.',
  'south-east':
    'Angled towards the camera: pieces on the near (right) side render in front of the body, pieces on the far side behind it.',
  west: 'In profile with the left side towards the camera: pieces on the left render in front of the body, pieces on the right behind it.',
  east: 'In profile with the right side towards the camera: pieces on the right render in front of the body, pieces on the left behind it.',
  north:
    'Facing away from the camera: every piece carried on the front or the sides of the body renders behind it, and its rear faces the viewer.',
  'north-west':
    'Angled away from the camera: pieces on the near (left) side render in front of the body, pieces on the far side behind it.',
  'north-east':
    'Angled away from the camera: pieces on the near (right) side render in front of the body, pieces on the far side behind it.',
};

/**
 * The same question answered from directly overhead, where the facing has stopped deciding it.
 *
 * One line rather than thirteen, because that is the geometry: a camera on the vertical has no near
 * side and no far one, so which piece draws over which is settled by how high each sits above the
 * ground and settled identically at every yaw. The record above would say a south-facing subject's
 * chest piece renders in front of its torso, which from the vertical is a statement about nothing —
 * the two are side by side in plan, and what actually decides the order is that the head is higher
 * than the shoulder and the shoulder higher than the hand.
 */
export const PLAN_DEPTH_ORDER_TEXT =
  'Directly overhead there is no near side and no far one: pieces render in order of how high they sit above the ground, so the highest draws over everything beneath it and the order is the same at every facing this sheet covers. A piece carried on the front or the side of the body is beside it in plan rather than in front of it, and draws over the body only where it is genuinely higher.';

/** One facing's answer, for a camera that has a near side to answer with. */
export interface DepthOrderFacing {
  readonly facing: Direction;
  readonly text: string;
}

/**
 * What section 5 has to say about depth order on one sheet, in the shape that sheet's own camera and
 * coverage decide.
 *
 * A discriminated pair rather than a string, because two readers state the same answer in two
 * notations — the prompt writes markdown and the split drawer writes JSX — and each has to know
 * whether it is presenting one statement or a line per facing. Deriving that from a string's shape at
 * the call site is how the two would come to disagree about a sheet they are both describing.
 *
 * `perFacing: false` covers the two cameras that settle the question once for the whole sheet: a plan
 * view, where {@link PLAN_DEPTH_ORDER_TEXT} answers at every yaw at once, and a sheet that draws a
 * single facing, where there is only one answer to give.
 */
export type DepthOrder =
  | { readonly perFacing: false; readonly text: string }
  | {
      readonly perFacing: true;
      readonly facings: readonly [DepthOrderFacing, DepthOrderFacing, ...DepthOrderFacing[]];
    };

/**
 * The depth order this camera actually produces, for every facing this sheet covers.
 *
 * **Asked of the coverage, never of the assembly facing alone.** A cut-out rig was once always a
 * single-facing run sheet, so section 5 stated one facing's depth order and that was the whole sheet;
 * `resolveRigMode` later let the rig reach a multi-view directional core, where section 3 lists five
 * object yaws and section 4 draws every piece at each of them. Stating the first facing's answer
 * there is a claim the sheet contradicts four times over — "renders in front of it" for a piece the
 * same prompt has turned to the rear — and the vocabulary above already holds the right answer for
 * each of them.
 */
export function depthOrder(
  covered: readonly [Direction, ...Direction[]],
  cameraElevation: number,
): DepthOrder {
  if (isPlanView(cameraElevation)) return { perFacing: false, text: PLAN_DEPTH_ORDER_TEXT };

  const [first, second, ...rest] = covered;
  if (second === undefined) return { perFacing: false, text: DEPTH_ORDER_TEXT[first] };

  return {
    perFacing: true,
    facings: [
      { facing: first, text: DEPTH_ORDER_TEXT[first] },
      { facing: second, text: DEPTH_ORDER_TEXT[second] },
      ...rest.map((facing) => ({ facing, text: DEPTH_ORDER_TEXT[facing] })),
    ],
  };
}

/**
 * The same answer as the prompt's own text, one line per facing in the order section 3 lists them.
 *
 * The bullet form is `leadingSideLedger`'s, for the same facings and the same reason: a reader and a
 * generator both take a list of one-line facts as a set of separate requirements, where a paragraph
 * covering five views reads as one. Each line carries its facing's sentence **verbatim** from
 * {@link DEPTH_ORDER_TEXT}, so the sheet's vocabulary is stated once and quoted here rather than
 * rewritten per sheet.
 */
export function depthOrderDescription(
  covered: readonly [Direction, ...Direction[]],
  cameraElevation: number,
): string {
  const order = depthOrder(covered, cameraElevation);
  if (!order.perFacing) return order.text;
  return order.facings.map(({ facing, text }) => `- **${facing}** — ${text}`).join('\n');
}
