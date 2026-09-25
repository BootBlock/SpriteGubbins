import { OBJECT_YAW } from '../constants/promptText/index.ts';
import type { Direction } from '../types/rendering.ts';

/**
 * Which kinds of view a sheet's own facings give it, read off their yaws.
 *
 * The directional audit and section 3's list of failed rotations compare one view with another —
 * the side view against the front, the rear view against the front view — and those comparisons
 * were gated on the sheet having more than one view, never on its having *those* views. The
 * `EIGHT_COMPASS` diagonal sheet covers 45°, 135°, 225° and 315° and nothing else, so it was told
 * to confirm a side view it does not have was "not a second three-quarter view", and to fail itself
 * when it could not; a generator that obeyed redrew a view towards 90° and broke the yaw section 3
 * gives it (issue #325). `THREE_CLASSIC` has a side view but neither a front nor a rear one.
 *
 * Asked of the yaw rather than the name, because `front` and `south` are two names for 0°.
 */
export interface ViewCoverage {
  /** A yaw of 90° or 270°, which is what the side-view check compares against the front. */
  readonly sideView: boolean;
  /** Both 0° and 180°, the pair the rear-view check compares. */
  readonly frontAndRearViews: boolean;
  /**
   * No front and rear pair, but views on both sides of the side line — some turned towards the
   * camera and some turned away — so the occlusion check is stated between those instead.
   */
  readonly turnedAwayViews: boolean;
  /** Every yaw on a diagonal, so every view is a three-quarter view and none is square-on. */
  readonly diagonalViewsOnly: boolean;
}

/** Whether a yaw turns the subject's front towards the camera, as 315°, 0° and 45° do. */
const facesCamera = (yaw: number) => yaw < 90 || yaw > 270;

/** Whether a yaw turns the subject's front away from the camera, as 135°, 180° and 225° do. */
const facesAway = (yaw: number) => yaw > 90 && yaw < 270;

export function viewCoverage(directions: readonly Direction[]): ViewCoverage {
  const yaws = directions.map((direction) => OBJECT_YAW[direction]);
  const frontAndRearViews = yaws.includes(0) && yaws.includes(180);

  return {
    sideView: yaws.some((yaw) => yaw === 90 || yaw === 270),
    frontAndRearViews,
    turnedAwayViews: !frontAndRearViews && yaws.some(facesCamera) && yaws.some(facesAway),
    diagonalViewsOnly: yaws.every((yaw) => yaw % 90 === 45),
  };
}
