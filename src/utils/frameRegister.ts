import type { CoverageMask, PixelShift } from '../types/quantiser.ts';
import { bitCount } from './bitCount.ts';

/**
 * How far one frame's artwork sits from another's, measured by laying their coverage over one
 * another rather than by comparing their bounding boxes.
 *
 * **The bounding box is exactly what cannot be trusted here, and that is the whole reason this pass
 * exists.** A box is tight, so it tracks the silhouette: a frame of a walk cycle whose arm swings
 * forward has a box whose left edge moved with the arm, and reading the corner difference as a
 * position would report the swing as drift and then "correct" it — straightening the animation into
 * a slide. Coverage does not move with a pose the same way. The body, the head and the planted foot
 * are most of a frame's opaque pixels and they sit where the frame sits, so the shift that puts the
 * most of one frame's coverage over the other's is the shift that says where the frame *is*.
 *
 * **Overlap alone is the score, and it is the whole of the score.** The usual statement of this is
 * the count of positions the two masks disagree about, which is `|A| + |B| − 2 |A ∩ B|` — and the
 * two extents are fixed while the shift moves, so minimising it and maximising the intersection are
 * the same search with fewer reads per candidate. Nothing is normalised: a normalised score is a
 * ratio whose denominator changes with the shift, which rewards a candidate for hanging the frame
 * off the reference until only a corner of each is being compared.
 *
 * **A candidate only ever reads pixels inside the frame's own box**, which is what keeps a
 * neighbouring sprite out of the answer. A shift toward the sprite next door would otherwise start
 * collecting *its* coverage as evidence, and on a tight sheet the best-scoring shift would be
 * whichever one buried the frame in its neighbour. The frame's mask covers its box and nothing else,
 * so the bound is the mask's own extent.
 *
 * The search opens on the two boxes' corner difference and reaches `reach` either side of it. That
 * is a seed rather than a claim: it is within a pixel or two of the answer wherever the two frames
 * hold similar silhouettes, and the reach is what covers the case where they do not. See
 * {@link FRAME_DRIFT_SEARCH} for why eight drawn pixels is the figure, and `affordableDriftReach`
 * for how a sheet of very large frames narrows it.
 *
 * Ties fall to the candidate nearest that seed, and the seed itself beats everything at its own
 * distance — so a frame whose coverage genuinely says nothing (a solid block, which every shift
 * overlaps equally) comes back at its corner difference rather than at whichever corner of the
 * sweep was visited first. Two runs at the same settings give the same answer.
 *
 * Pure, and exact: every candidate's score is the same overlap count a pixel-by-pixel comparison
 * gives. **The cost is stated in mask words, not in time.** Each of the `(2 × reach + 1)²`
 * candidates reads at most `frame.height × frame.stride` words, so one word compares thirty-two
 * pixels. The reference is shifted once per column of candidates, which adds one pass over at most
 * `frame.height + reach` of its rows for every `2 × reach + 1` candidates. `registrationWords`
 * states the two together, and it is what the frame budget is spent in.
 */
export function registerFrame(reference: CoverageMask, frame: CoverageMask, reach: number): PixelShift {
  const side = 2 * reach + 1;
  const scores = new Int32Array(side * side);
  // Only the reference rows some candidate can lay over the frame: row `j` meets frame row
  // `j + stepY`, and `stepY` is never more than the reach.
  const rows = Math.min(reference.height, frame.height + reach);
  const shifted = new Uint32Array(rows * frame.stride);

  for (let stepX = -reach; stepX <= reach; stepX += 1) {
    shiftColumns(reference, stepX, rows, frame.stride, shifted);
    for (let stepY = -reach; stepY <= reach; stepY += 1) {
      scores[(stepY + reach) * side + stepX + reach] = overlapAt(shifted, rows, frame, stepY);
    }
  }

  return bestShift(scores, reach, frame.left - reference.left, frame.top - reference.top);
}

/**
 * The winning candidate: the highest overlap, then the nearest the seed, then the first in reading
 * order. Chosen from the finished table, so the order the scores were computed in cannot move it.
 */
function bestShift(scores: Int32Array, reach: number, seedX: number, seedY: number): PixelShift {
  const side = 2 * reach + 1;
  let best: PixelShift = { x: seedX, y: seedY };
  let bestScore = -1;
  let bestReach = 0;

  for (let stepY = -reach; stepY <= reach; stepY += 1) {
    for (let stepX = -reach; stepX <= reach; stepX += 1) {
      const score = scores[(stepY + reach) * side + stepX + reach] ?? 0;
      const distance = stepX * stepX + stepY * stepY;
      if (score < bestScore || (score === bestScore && distance >= bestReach)) continue;
      best = { x: seedX + stepX, y: seedY + stepY };
      bestScore = score;
      bestReach = distance;
    }
  }

  return best;
}

/**
 * The reference's first `rows` rows moved `stepX` columns right, re-packed at the frame's stride.
 *
 * Target column `t` reads source column `t − stepX`, which is bit `bit` onward of source word
 * `word`, running into the word after it. A source column off either end of the reference reads as
 * empty. Columns past the frame's width may come out set, and that is harmless: the frame's own
 * bits there are clear, so the AND in {@link overlapAt} discards them.
 */
function shiftColumns(
  reference: CoverageMask,
  stepX: number,
  rows: number,
  stride: number,
  into: Uint32Array,
): void {
  const offset = -stepX;
  const words = offset >> 5;
  const bit = offset & 31;

  for (let row = 0; row < rows; row += 1) {
    const base = row * reference.stride;
    const wordAt = (index: number): number =>
      index < 0 || index >= reference.stride ? 0 : (reference.bits[base + index] ?? 0);
    for (let word = 0; word < stride; word += 1) {
      const low = wordAt(word + words) >>> bit;
      // A shift by 32 is a shift by 0 in JavaScript, so a whole-word move takes no high part.
      const high = bit === 0 ? 0 : wordAt(word + words + 1) << (32 - bit);
      into[row * stride + word] = low | high;
    }
  }
}

/** How many of the shifted reference's covered pixels land on the frame's under a vertical step. */
function overlapAt(shifted: Uint32Array, rows: number, frame: CoverageMask, stepY: number): number {
  const stride = frame.stride;
  const first = Math.max(0, -stepY);
  const last = Math.min(rows, frame.height - stepY);
  let score = 0;

  for (let row = first; row < last; row += 1) {
    const from = row * stride;
    const onto = (row + stepY) * stride;
    for (let word = 0; word < stride; word += 1) {
      score += bitCount((shifted[from + word] ?? 0) & (frame.bits[onto + word] ?? 0));
    }
  }

  return score;
}
