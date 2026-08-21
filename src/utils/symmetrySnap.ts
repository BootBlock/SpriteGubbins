import type { Rgba, SpriteBox, SpriteSymmetry } from '../types/quantiser.ts';
import { FULLY_TRANSPARENT, createImage, pixelOffset, writePixel } from './imageData.ts';

/**
 * The sheet with each qualifying sprite's mirrored pairs settled — the snap half of the symmetry
 * pass.
 *
 * A generator that was asked for a symmetric front facing returns one that is *nearly* symmetric:
 * the two halves agree on the silhouette and disagree over a few dozen pixels — a buckle, a
 * highlight, a break in a contour on one side only. Reading those out one at a time is not work
 * anybody will do, so this settles them: for each pair of columns the sprite's axis puts opposite
 * one another, both pixels are written with one colour.
 *
 * **Which colour is a local majority, and it is local on purpose.** The two candidates are the
 * pair's own two colours, and the winner is whichever of them agrees with more of its own
 * *orthogonal* neighbours inside the sprite — the pixel that continues what it is part of, against
 * the pixel that breaks it. That is the same reading `despeckle` takes of a lone odd pixel, and it
 * is what the obvious rule gets wrong: deciding by which colour the sprite holds more of settles
 * every disagreement in favour of the surface, so a contour pixel missing on one side is answered
 * by punching the matching hole in the other. This rule keeps the contour instead, because the
 * intact side's pixel has the rest of that contour above and below it and the broken side's does
 * not.
 *
 * **Orthogonal rather than eight-connected**, although the segmentation around it counts diagonals:
 * a contour is drawn as an orthogonal run, and a diagonal-inclusive count is dominated by the
 * surface the contour sits against — which is the fill-wins-everything answer this rule exists to
 * avoid.
 *
 * Where both members are equally consistent with their own surroundings — a corner, or two flat
 * surfaces a shade apart — nothing local separates them, and the sprite's own colour tally decides:
 * the commoner colour wins, then the side of the axis carrying more coverage, then the left-hand
 * member, so the answer is the same on two runs at the same settings.
 *
 * **A pixel whose partner falls outside the box is left exactly as it is.** Under an off-centre axis
 * part of the sprite has no counterpart to be settled against, and the only two things this could do
 * there are delete it or invent a mirror of it — both of which are the pass altering artwork it has
 * no reading about. Leaving it means a snapped sprite is symmetric across the span its axis pairs
 * up and unchanged outside it, which is a smaller claim and a true one.
 *
 * **Nothing is snapped that {@link SpriteSymmetry.snapped} does not name**, and that flag is where
 * the confidence floor was already applied. This function has no opinion about which sprites deserve
 * settling — the whole reason the pass ships off by default is that a held sword, a single pauldron
 * and a shoulder bag are asymmetric on purpose, and the floor is what keeps them intact.
 *
 * Returns the image it was given, by reference, where no reading is marked — so `CHECK`, and a
 * `SNAP` no sprite qualified for, cost nothing at all and the caller can tell nothing happened.
 *
 * Pure, and one copy of a result that is `grid²` times smaller than the sheet. **Every reading is
 * taken from the original and every write lands on the copy**, so no pair is decided against pixels
 * an earlier pair has already moved — which would make the answer depend on the order rows are
 * walked in.
 */
export function snapSymmetric(image: ImageData, readings: readonly SpriteSymmetry[]): ImageData {
  const snapping = readings.filter((reading) => reading.snapped);
  if (snapping.length === 0) return image;

  const snapped = createImage(image.width, image.height);
  snapped.data.set(image.data);

  for (const reading of snapping) {
    settle(image, snapped, reading.box, 2 * reading.axis);
  }

  return snapped;
}

/**
 * One sprite's pairs settled about `doubled`, the axis in the doubled coordinates the search states
 * it in.
 *
 * The tally and the coverage are taken over the whole box before any pair is decided, which costs
 * one extra walk of the sprite and is what makes the two sheet-wide tie-breaks mean what they say.
 */
function settle(source: ImageData, target: ImageData, box: SpriteBox, doubled: number): void {
  const { left, top, width, height } = box;
  const counts = new Map<number, number>();
  // Which half the generator drew more of, as the last-but-one tie-break. Measured in coverage
  // rather than in distinct colours: what a tie needs settling by is which side is more *there*, and
  // a side drawn in one flat colour is no less present for it.
  let leftward = 0;
  let rightward = 0;

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const here = left + column;
      const key = packed(source, here, top + row);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (key === CLEAR) continue;
      if (2 * here < doubled) leftward += 1;
      else if (2 * here > doubled) rightward += 1;
    }
  }
  const leftWinsTies = leftward >= rightward;

  for (let row = 0; row < height; row += 1) {
    const y = top + row;
    for (let column = 0; column < width; column += 1) {
      const here = left + column;
      const partner = doubled - here;
      // Each unordered pair once, and only where both members are inside the box — the pixels with
      // no counterpart are the ones the docblock leaves alone.
      if (partner <= here || partner >= left + width) continue;

      const key = packed(source, here, y);
      const otherKey = packed(source, partner, y);
      if (key === otherKey) continue;

      const support = neighbourSupport(source, box, here, y, key);
      const otherSupport = neighbourSupport(source, box, partner, y, otherKey);
      const votes = counts.get(key) ?? 0;
      const otherVotes = counts.get(otherKey) ?? 0;
      const takeLeft =
        support !== otherSupport
          ? support > otherSupport
          : votes !== otherVotes
            ? votes > otherVotes
            : leftWinsTies;

      const winner = unpack(takeLeft ? key : otherKey);
      writePixel(target.data, pixelOffset(target.width, here, y), winner);
      writePixel(target.data, pixelOffset(target.width, partner, y), winner);
    }
  }
}

/** The four orthogonal offsets a contour is drawn along — see the docblock on why not eight. */
const ORTHOGONAL: readonly (readonly [number, number])[] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

/**
 * How many of a pixel's orthogonal neighbours inside the sprite carry its own colour.
 *
 * Clipped to the box rather than to the image: what the vote is asking is whether this pixel
 * continues something *this sprite* is made of, and a neighbour belonging to the sheet outside the
 * box belongs to the gutter or to another subject.
 */
function neighbourSupport(image: ImageData, box: SpriteBox, x: number, y: number, key: number): number {
  let support = 0;
  for (const [across, down] of ORTHOGONAL) {
    const nx = x + across;
    const ny = y + down;
    if (nx < box.left || nx >= box.left + box.width) continue;
    if (ny < box.top || ny >= box.top + box.height) continue;
    if (packed(image, nx, ny) === key) support += 1;
  }
  return support;
}

/** What a cleared pixel counts as — one value, whatever bytes happen to sit under it. */
const CLEAR = -1;

/**
 * One pixel as a single number, for the tally, the support count and the equality test above.
 *
 * **Every fully transparent pixel packs to {@link CLEAR}**, because `ImageData` keeps whatever
 * colour a pixel had before it was cleared and none of it is visible. Left as themselves, two
 * indistinguishable empty pixels would be two candidates splitting the empty vote — and a pair of
 * them would be found to *disagree*, and settled by writing one invisible colour over another.
 */
function packed(image: ImageData, x: number, y: number): number {
  const at = pixelOffset(image.width, x, y);
  const alpha = image.data[at + 3] ?? 0;
  if (alpha === FULLY_TRANSPARENT) return CLEAR;
  return (
    (((image.data[at] ?? 0) * 256 + (image.data[at + 1] ?? 0)) * 256 + (image.data[at + 2] ?? 0)) * 256 +
    alpha
  );
}

/** The inverse of {@link packed} — {@link CLEAR} comes back as the transparent black it stands for. */
function unpack(key: number): Rgba {
  if (key === CLEAR) return { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };
  return {
    r: Math.floor(key / (256 * 256 * 256)) % 256,
    g: Math.floor(key / (256 * 256)) % 256,
    b: Math.floor(key / 256) % 256,
    a: key % 256,
  };
}
