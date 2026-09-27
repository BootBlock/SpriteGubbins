import { DUPLICATE_REGISTRATION_REACH } from '../constants/quantiser.ts';
import type { PixelShift, ProfiledSprite, SpriteRegistration } from '../types/quantiser.ts';
import { profileGap } from './alphaProfile.ts';
import { spriteDistance } from './spriteEquality.ts';

/** The steps along one axis the search takes, from `-reach` to `reach`. */
const CANDIDATE_STEPS: readonly number[] = Array.from(
  { length: 2 * DUPLICATE_REGISTRATION_REACH + 1 },
  (_, index) => index - DUPLICATE_REGISTRATION_REACH,
);

/**
 * Every offset the search tries, nearest the corners first and then in reading order.
 *
 * Built once, because it depends on nothing but the reach. The order is the tie-break: a candidate
 * has to be strictly closer than everything before it to win, so two offsets that match equally
 * well — a solid block, which matches itself one column over as well as it does in place — come
 * back at the one nearer the corners, and two runs at the same settings agree.
 */
const CANDIDATES: readonly PixelShift[] = (() => {
  const shifts = CANDIDATE_STEPS.flatMap((y) => CANDIDATE_STEPS.map((x) => ({ x, y })));
  // `sort` is stable, so offsets at one distance keep the reading order they were built in.
  return shifts.sort((left, right) => left.x ** 2 + left.y ** 2 - (right.x ** 2 + right.y ** 2));
})();

/**
 * Two sprites laid over one another where they match best, searched within
 * {@link DUPLICATE_REGISTRATION_REACH} of their top-left corners.
 *
 * **The corners are the seed, not the answer.** A bounding box is tight, so it follows the artwork —
 * but keying adds or removes an edge pixel, and on the left or top edge the corner moves with it.
 * Two copies of one drawing laid corner to corner are then compared a column off, and every cell is
 * scored against its neighbour. Registering first is what makes an extra pixel on the left cost the
 * same as one on the right: the column only one sprite covers, and nothing else.
 *
 * **Registered by the distance itself, not by coverage** as `registerFrame` registers a strip. A
 * duplicate is a claim about colour as well as shape, and a silhouette often says nothing about the
 * offset: a sprite with a flat left edge and a copy one column wider overlap completely at two
 * offsets, and only the colours inside say which of them is the drawing. The offset returned is
 * therefore the one the tolerance is judged at, and the one the snap writes the fold at.
 *
 * **Every candidate after the first is handed the best mean so far as its limit**, so it is abandoned
 * the moment it cannot win — see `spriteDistance`, whose early exit is exact. A genuine duplicate is
 * measured in full once, at or near its corners.
 *
 * **And a candidate its alpha profiles rule out is never walked at all**, which is what keeps the
 * search affordable on a real sheet. Two different sprites are rejected at the corners in the first
 * rows they share, but a real sprite's box is mostly transparent margin, so an offset's own walk
 * reaches no verdict until well into the drawing — and there are twenty-four of them. The profiles
 * (see `AlphaProfile`) bound each offset's sum from below in a few dozen additions, and dividing by
 * the most cells that could be counted — the two sprites' visible cells together, or the union box,
 * whichever is fewer — bounds its mean. An offset whose bound already passes the limit cannot come
 * under it, so skipping it changes no answer.
 *
 * Pure. `limit` bounds the search as it bounds `spriteDistance`: no offset whose mean passes it can
 * be returned, and a pair with none under it comes back at its corners with `Infinity`. Each sprite
 * arrives with its profile, so a caller comparing many pairs reads each profile once.
 */
export function registerSprites(
  image: ImageData,
  first: ProfiledSprite | undefined,
  second: ProfiledSprite | undefined,
  limit = Infinity,
): SpriteRegistration {
  let best: SpriteRegistration = { distance: Infinity, shift: { x: 0, y: 0 } };
  if (first === undefined || second === undefined) return best;

  const { box: left, profile: near } = first;
  const { box: right, profile: far } = second;
  const reach = DUPLICATE_REGISTRATION_REACH;
  // Each bound depends on one axis alone, so the reach's worth of each is all there is to compute.
  const byRow = CANDIDATE_STEPS.map((step) => profileGap(near.rows, far.rows, step));
  const byColumn = CANDIDATE_STEPS.map((step) => profileGap(near.columns, far.columns, step));

  for (const shift of CANDIDATES) {
    const bound = Math.max(byRow[shift.y + reach] ?? 0, byColumn[shift.x + reach] ?? 0);
    const cells =
      (Math.max(left.width, shift.x + right.width) - Math.min(0, shift.x)) *
      (Math.max(left.height, shift.y + right.height) - Math.min(0, shift.y));
    const ceiling = Math.min(limit, best.distance);
    if (bound > ceiling * Math.min(cells, near.visible + far.visible)) continue;
    const distance = spriteDistance(image, left, right, shift, ceiling);
    if (distance < best.distance) best = { distance, shift };
  }
  return best;
}
