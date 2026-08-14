import { OBJECT_YAW } from '../constants/promptText/index.ts';
import type { Direction } from '../types/rendering.ts';

/** Two covered facings that are each other's reflection, in the order the sheet lists them. */
export type MirrorPair = readonly [Direction, Direction];

/**
 * The pairs of covered facings a mirrored copy could counterfeit.
 *
 * Reflecting a view drawn at yaw θ produces the view at 360° − θ with its handedness flipped — a
 * `west` component mirrored is a counterfeit `east` — so a generator can only substitute a
 * reflection for a rotation where the sheet asks for **both** members of such a pair. That
 * substitution passes every check about *where* a view faces: the front axis points the opposite
 * way, a side still reads as a side, and the rear stays hidden. What it breaks is which side the
 * subject's one-sided features sit on, which is why the template's anti-mirroring rules cite the
 * pairs this function finds rather than restating the yaws.
 *
 * The classic sets can never produce one — they run 0° to 180°, every view right-leading — and 0°
 * and 180° are their own reflections in any set (a mirrored front is still a front), so `front`
 * and `back` never pair. Only the compass sets put a yaw and its reflection on one sheet, and the
 * compiler emits the rules only where this answer is non-empty.
 */
export function mirrorPairs(covered: readonly Direction[]): readonly MirrorPair[] {
  return covered.flatMap((direction, index) => {
    const yaw = OBJECT_YAW[direction];
    const reflectedYaw = (360 - yaw) % 360;
    if (reflectedYaw === yaw) return [];
    const counterpart = covered.slice(index + 1).find((other) => OBJECT_YAW[other] === reflectedYaw);
    return counterpart === undefined ? [] : [[direction, counterpart] as const];
  });
}

/**
 * The pairs as the prompt names them: `west and east`, or `south-west and south-east; north-west
 * and north-east`. Spelled from the facings themselves, like {@link describeDirections}, so a pair
 * is named exactly as section 3's yaw list names its members.
 */
export function describeMirrorPairs(pairs: readonly MirrorPair[]): string {
  return pairs.map(([first, second]) => `${first} and ${second}`).join('; ');
}
