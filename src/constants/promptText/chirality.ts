import type { Direction } from '../../types/rendering.ts';
import { DIRECTION_LISTS } from './camera.ts';
import { OBJECT_YAW } from './rotation.ts';

/**
 * Which of the subject's own two sides a yaw brings towards the camera.
 *
 * The defect this exists to answer: a sheet asking for both members of an opposite-turn pair came
 * back with the subject's asymmetries *reflected* between them — an undercut fully exposed in the
 * south-west view and fully exposed again in the south-east one, having crossed to the other side of
 * the head. Every check the prompt made passed. Each view faced the right way, each hid the rear it
 * was supposed to hide, and the pair was not a pixel-for-pixel flip of one another. What nothing
 * stated was the consequence a turn has for a *one-sided* feature: the side it sits on is either
 * coming towards the camera or going away from it, and the feature's visibility has to follow.
 *
 * So the prompt now names the leading side per facing, and this is where that answer comes from.
 */

/** One of the subject's own two sides — never the image's. */
export type SubjectSide = 'left' | 'right';

/**
 * The facing's object yaw as a **signed** angle: positive turns the subject's left side towards the
 * camera, negative its right.
 *
 * {@link OBJECT_YAW} is deliberately a magnitude, because the two direction sets turn opposite ways
 * and only one of them ever reaches a single sheet — `west` at 90° presents the subject's left where
 * the classic `right side` at 90° presents its right. That is fine for *printing* a yaw and useless
 * for computing anything from one, so the sense is recovered here rather than in each reader: a
 * facing name belongs to exactly one of the two sets, which makes this a total function of the
 * facing alone.
 *
 * `FIVE_CLASSIC` is the whole classic set — `THREE_CLASSIC` is a subset of it — so membership of that
 * one list is the test.
 */
export function signedObjectYaw(direction: Direction): number {
  const classic = (DIRECTION_LISTS.FIVE_CLASSIC as readonly Direction[]).includes(direction);
  return OBJECT_YAW[direction] * (classic ? -1 : 1);
}

/**
 * The side this yaw turns towards the camera, or `null` where it turns neither.
 *
 * Integer arithmetic on the signed yaw rather than a trigonometric test, so the two square-on
 * facings answer exactly: at 0° and 180° both flanks are edge-on and equally far, and a
 * `Math.sin(Math.PI)` of 1.2e-16 would have made one of them "left" by a rounding error.
 *
 * **The answer is about which side is nearer, not about how much of it shows.** How much a yaw
 * leaves visible of the far side is what `FACING_TEXT` states per facing — "largely hidden" at 45°,
 * "completely hidden" at 90° — and this is the fact those sentences are all built on.
 * `chirality.test.ts` holds them to it.
 */
export function leadingSide(direction: Direction): SubjectSide | null {
  const yaw = ((signedObjectYaw(direction) % 360) + 360) % 360;
  if (yaw === 0 || yaw === 180) return null;
  return yaw < 180 ? 'left' : 'right';
}
