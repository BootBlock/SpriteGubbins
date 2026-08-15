import type { Direction } from '../../types/rendering.ts';
import { isPlanView } from './elevation.ts';

/**
 * What a *direction* means geometrically: how far the component turns, and what that turn puts in
 * front of the camera.
 *
 * The defect this exists to fix: section 3 used to say only "one camera, unchanged … elevation,
 * azimuth … identical across all of them", which a generator reads as *every component faces the
 * same way* — so a front-three-quarter, a right-side and a back-three-quarter head all came back at
 * the same three-quarter angle with only their details changed. Camera azimuth and object yaw are
 * two different quantities, and the prompt now names them separately: the camera is fixed, the
 * component turns beneath it.
 */

/**
 * Object yaw per facing, in degrees, measured from the component **facing the camera** at `0°`.
 *
 * A magnitude, not a signed angle. Which way the component turns is fixed by the facing's own name
 * and stated in {@link FACING_TEXT}, and the two direction sets genuinely turn opposite ways: at
 * `90°` the compass sets present the subject's *left* side (`west` faces screen-left) while the
 * classic set presents its *right* (`right side` means the right side faces the camera). Only one
 * set ever reaches a single sheet — `sheetDirections` resolves to one list — so the two senses never
 * appear together, and a signed axis would only have bought `315°, 270°, 225°` in place of the
 * classic sets' plain `45°, 90°, 135°`.
 *
 * The three-quarter facings are `45°` and `135°`, not `0°` and `180°`: `front-three-quarter` is a
 * *turned* pose — that is why `DEPTH_ORDER_TEXT` distinguishes a near side from a far one for it
 * and does not for `front`, where both sides are equally near.
 */
export const OBJECT_YAW: Readonly<Record<Direction, number>> = {
  front: 0,
  'front-three-quarter': 45,
  'right side': 90,
  'back-three-quarter': 135,
  back: 180,
  south: 0,
  'south-west': 45,
  west: 90,
  'north-west': 135,
  north: 180,
  'north-east': 225,
  east: 270,
  'south-east': 315,
};

/**
 * What each yaw presents to the camera, and what it hides.
 *
 * The occlusion half is the load-bearing half. A direction *name* can be satisfied by a flattering
 * three-quarter view with a few details moved; "front-facing features are mostly turned away" cannot.
 * Reads after "**Back-three-quarter — object yaw 135°.**", so each begins mid-thought.
 *
 * **Every line here is a claim about a camera that is not directly overhead**, and is true of all of
 * them: which vertical surfaces of a form a yaw hides is decided by the yaw alone at any elevation
 * below the vertical, however much the elevation foreshortens what is left on screen. At the vertical
 * it is decided by nothing — see {@link PLAN_FACING_TEXT}, which is what a plan view says instead.
 */
export const FACING_TEXT: Readonly<Record<Direction, string>> = {
  front:
    'Squarely towards the camera: the front is fully presented, both sides are edge-on, and no part of the rear is visible.',
  'front-three-quarter':
    'Turned so the front is angled towards the camera with the subject’s **right** side leading: front and right side both read, the left side is largely hidden, and the rear is not visible.',
  'right side':
    'Turned until the subject’s **right** side squarely faces the camera — it therefore faces screen-right. The front reads only as a profile edge, and the left side is completely hidden.',
  'back-three-quarter':
    'Turned until the rear is angled towards the camera, the **right** side still leading: rear surfaces dominate, and front-facing features are mostly turned away and heavily foreshortened.',
  back: 'Turned squarely away from the camera: the rear is fully presented, both sides are edge-on, and no front-facing feature is visible at all.',
  south:
    'Squarely towards the camera: the front is fully presented, both sides are edge-on, and no part of the rear is visible.',
  'south-west':
    'Turned so the front is angled towards the camera with the subject’s **left** side leading: front and left side both read, the right side is largely hidden, and the rear is not visible.',
  west: 'Turned until the subject’s **left** side squarely faces the camera — it therefore faces screen-left. The front reads only as a profile edge, and the right side is completely hidden.',
  'north-west':
    'Turned until the rear is angled towards the camera, the **left** side still leading: rear surfaces dominate, and front-facing features are mostly turned away and heavily foreshortened.',
  north:
    'Turned squarely away from the camera: the rear is fully presented, and no front-facing feature is visible at all.',
  'north-east':
    'Turned until the rear is angled towards the camera, the **right** side still leading: rear surfaces dominate, and front-facing features are mostly turned away and heavily foreshortened.',
  east: 'Turned until the subject’s **right** side squarely faces the camera — it therefore faces screen-right. The front reads only as a profile edge, and the left side is completely hidden.',
  'south-east':
    'Turned so the front is angled towards the camera with the subject’s **right** side leading: front and right side both read, the left side is largely hidden, and the rear is not visible.',
};

/**
 * The same yaws stated for a camera on the vertical, where the turn hides nothing.
 *
 * From directly overhead every yaw presents the same top surface, so there is no occlusion left to
 * describe and {@link FACING_TEXT}'s "the front is fully presented … no part of the rear is visible"
 * describes a difference the camera cannot produce — while section 9 goes on auditing for it, which
 * is a sheet that fails its own audit by construction. What a plan view actually varies is where the
 * form points **in the frame**, so that is what these state.
 *
 * The screen directions are not a new convention: {@link FACING_TEXT} already fixes them by saying
 * `west` faces screen-left and `east` screen-right, and the compass names carry the rest.
 *
 * **Each line ends with the subject's own handedness, which is the half that goes wrong.** Seen from
 * above, a form whose front points down the frame has its right side towards the frame's *left* —
 * the reversal anyone drawing a top-down sheet gets caught by — and with no occlusion to contradict
 * it, a mirrored copy is otherwise indistinguishable from the turn it counterfeits. So each side is
 * placed rather than left to be worked out, and `rotation.test.ts` re-derives all thirteen from the
 * yaw rather than trusting the prose.
 */
export const PLAN_FACING_TEXT: Readonly<Record<Direction, string>> = {
  front:
    'Its front axis points towards the bottom of the frame and its rear towards the top; the subject’s own **left** side faces the frame’s right and its **right** side the frame’s left.',
  'front-three-quarter':
    'Its front axis points towards the bottom-right of the frame and its rear towards the top-left; the subject’s own **left** side faces the top-right and its **right** side the bottom-left.',
  'right side':
    'Its front axis points towards the right of the frame and its rear towards the left; the subject’s own **left** side faces the top of the frame and its **right** side the bottom.',
  'back-three-quarter':
    'Its front axis points towards the top-right of the frame and its rear towards the bottom-left; the subject’s own **left** side faces the top-left and its **right** side the bottom-right.',
  back: 'Its front axis points towards the top of the frame and its rear towards the bottom; the subject’s own **left** side faces the frame’s left and its **right** side the frame’s right.',
  south:
    'Its front axis points towards the bottom of the frame and its rear towards the top; the subject’s own **left** side faces the frame’s right and its **right** side the frame’s left.',
  'south-west':
    'Its front axis points towards the bottom-left of the frame and its rear towards the top-right; the subject’s own **left** side faces the bottom-right and its **right** side the top-left.',
  west: 'Its front axis points towards the left of the frame and its rear towards the right; the subject’s own **left** side faces the bottom of the frame and its **right** side the top.',
  'north-west':
    'Its front axis points towards the top-left of the frame and its rear towards the bottom-right; the subject’s own **left** side faces the bottom-left and its **right** side the top-right.',
  north:
    'Its front axis points towards the top of the frame and its rear towards the bottom; the subject’s own **left** side faces the frame’s left and its **right** side the frame’s right.',
  'north-east':
    'Its front axis points towards the top-right of the frame and its rear towards the bottom-left; the subject’s own **left** side faces the top-left and its **right** side the bottom-right.',
  east: 'Its front axis points towards the right of the frame and its rear towards the left; the subject’s own **left** side faces the top of the frame and its **right** side the bottom.',
  'south-east':
    'Its front axis points towards the bottom-right of the frame and its rear towards the top-left; the subject’s own **left** side faces the top-right and its **right** side the bottom-left.',
};

/** What this yaw does in front of a camera standing at this elevation. */
export function facingText(direction: Direction, cameraElevation: number): string {
  return isPlanView(cameraElevation) ? PLAN_FACING_TEXT[direction] : FACING_TEXT[direction];
}
