import type { PixelShift, SpriteBox } from '../types/quantiser.ts';
import { FULLY_TRANSPARENT, pixelOffset } from './imageData.ts';

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
 * whichever one buried the frame in its neighbour.
 *
 * The search opens on the two boxes' corner difference and reaches `reach` either side of it. That
 * is a seed rather than a claim: it is within a pixel or two of the answer wherever the two frames
 * hold similar silhouettes, and the reach is what covers the case where they do not. See
 * {@link FRAME_DRIFT_SEARCH} for why eight drawn pixels is the figure.
 *
 * Ties fall to the candidate nearest that seed, and the seed itself beats everything at its own
 * distance — so a frame whose coverage genuinely says nothing (a solid block, which every shift
 * overlaps equally) comes back at its corner difference rather than at whichever corner of the
 * sweep was visited first. Two runs at the same settings give the same answer.
 *
 * Pure. The reference's opaque pixels are listed once and the sweep then costs
 * `(2 × reach + 1)²` reads of that list — bounded, per {@link FRAME_DRIFT_SEARCH}, by a constant
 * rather than by the sheet.
 */
export function registerFrame(
  image: ImageData,
  reference: SpriteBox,
  frame: SpriteBox,
  reach: number,
): PixelShift {
  const covered = coveredPixels(image, reference);
  const seedX = frame.left - reference.left;
  const seedY = frame.top - reference.top;

  let best: PixelShift = { x: seedX, y: seedY };
  let bestScore = -1;
  let bestReach = 0;

  for (let stepY = -reach; stepY <= reach; stepY += 1) {
    for (let stepX = -reach; stepX <= reach; stepX += 1) {
      const score = overlapAt(image, covered, frame, seedX + stepX, seedY + stepY);
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
 * Every opaque pixel of the box, as `x, y` pairs in one flat array.
 *
 * Flat and typed rather than an array of points, because the sweep reads it `(2 × reach + 1)²`
 * times and an object per pixel would be that many pointer chases through the heap — the same
 * reasoning `imageData.ts` states for the passes that walk whole sheets, arriving at a box.
 *
 * The pairs are sheet coordinates rather than box-relative ones, so the sweep adds the shift and
 * reads, with no origin to add back on every candidate.
 */
function coveredPixels(image: ImageData, box: SpriteBox): Int32Array {
  const found: number[] = [];
  for (let row = 0; row < box.height; row += 1) {
    const y = box.top + row;
    for (let column = 0; column < box.width; column += 1) {
      const x = box.left + column;
      if (image.data[pixelOffset(image.width, x, y) + 3] === FULLY_TRANSPARENT) continue;
      found.push(x, y);
    }
  }
  return Int32Array.from(found);
}

/**
 * How many of the reference's opaque pixels land on an opaque pixel of the frame under this shift.
 *
 * Bounded by the frame's own box rather than by the image, for the reason the docblock above gives:
 * a pixel outside that box belongs to some other sprite, and counting it would let a shift score
 * itself on the neighbour it is sliding into.
 */
function overlapAt(
  image: ImageData,
  covered: Int32Array,
  frame: SpriteBox,
  shiftX: number,
  shiftY: number,
): number {
  const right = frame.left + frame.width;
  const bottom = frame.top + frame.height;
  let score = 0;

  for (let at = 0; at < covered.length; at += 2) {
    const x = (covered[at] ?? 0) + shiftX;
    if (x < frame.left || x >= right) continue;
    const y = (covered[at + 1] ?? 0) + shiftY;
    if (y < frame.top || y >= bottom) continue;
    if (image.data[pixelOffset(image.width, x, y) + 3] !== FULLY_TRANSPARENT) score += 1;
  }

  return score;
}
