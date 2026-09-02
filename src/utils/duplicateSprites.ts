import type { SpriteBox, SpriteDuplicateGroup } from '../types/quantiser.ts';
import { sameSprite, spriteHash, withinTolerance } from './spriteEquality.ts';
import { disjointSet } from './unionFind.ts';

/**
 * Which sprites on this sheet are the same sprite drawn more than once.
 *
 * A returned sheet carries the same artwork twice more often than anyone expects. A generator asked
 * for eight facings answers with two that hold the same pose, an animation strip repeats a frame it
 * was meant to move, and a splitter's per-direction runs come back with a pair that never diverged.
 * Nothing before this said so: the sprite panel counts twelve pieces whether or not three of them
 * are one piece drawn three times, and the redundancy is found later, in an atlas with a cell in it
 * that did not need to be there.
 *
 * **A "tile" here is a segmented sprite, not a grid-aligned block of cells, and the roadmap permits
 * either.** The choice is about what the app already knows. `boundaryMesh` measures the pitch of one
 * *drawn pixel*; it knows nothing about tiles, so a grid-aligned tile mode would have to be handed a
 * tile size the app has nowhere measured and cannot check — a number the reader types, against which
 * every finding would then be reported, with a wrong number producing a confident answer about
 * blocks that are not the artwork's own. `spriteSegments` needs nothing typed: it already returns the
 * separate pieces of artwork on the finished sheet, in drawn pixels, on every result. And this app
 * composes *sprite sheets* rather than tilesets, so the repeated thing a reader is looking for is a
 * repeated frame — which is exactly what a segmented piece is.
 *
 * **Per-cell distance, deliberately not a perceptual hash.** A DCT hash summarises a photograph's
 * low frequencies, and these are neither: a sprite here is a few dozen drawn pixels across and has
 * already been through a palette reduction, so the coefficients it has are few and coarse and the
 * hash's own quantisation lands on top of the pipeline's. Comparing the pixels is affordable at this
 * size — the extent buckets and the early exit below are what make it so — and it answers in the
 * units every other colour tolerance on this tab is stated in.
 *
 * **Two sprites are compared over the box that covers both of them, anchored at their top-left
 * corners.** A bounding box is tight, so anchoring by it costs nothing to compute and takes the
 * sprites' own positions out of the comparison — which is the whole point, since two frames of one
 * pose sit in different places on the sheet. Where one sprite reaches further than the other, the
 * cells only it covers are read as transparent on the short side and score the full 255 that any
 * vanished cell scores. That is the honest reading: a drawing with an extra row of artwork genuinely
 * holds artwork the other does not.
 *
 * **Requiring equal extents instead would have been much simpler, and it was measured and
 * rejected.** It makes the comparison a straight per-cell reading with nothing invented, and it
 * makes the snap a plain block copy. But on the reference sheet, quantised at a grid of 6 and keyed
 * at tolerance 24, perturbing the artwork by four parts in 255 per channel left only 4 of its 15
 * sprites with the drawn extent they had before. A sprite thirty drawn pixels across loses or gains
 * one the moment a single contour pixel crosses the keying threshold — so a rule turning on exact
 * extents would fire on repeats that came back byte-identical and on almost nothing else, which is a
 * dial that appears not to work. The union box costs an extra row about one unit of the mean on a
 * sprite that size, which is inside the dial's range rather than past it.
 *
 * **Two readings of "the same", and the panel shows both.** Byte equality is what the hash buckets
 * find, and it is free — an identical frame is the commonest case and it needs no distance measured
 * at all. The tolerance is what catches the pair that came back a shade apart. A group carries both:
 * every member says whether it is byte-identical to the sprite the group is named after.
 *
 * **The order the boxes arrive in is the order everything here answers in.** A group is named after
 * its earliest member and the groups come back in the order those members appear, which is reading
 * order in the only way this is called — the sprite panel, the group list and the preview then agree
 * about which sprite is which without any of them sorting anything a second time.
 *
 * Pure. `tolerance` is the mean per-cell distance under which two sprites are one, in the scaled
 * OKLab units every colour dial on this tab uses; `0` admits only sprites whose visible pixels
 * match outright, which is the exact grouping in all but the invisible bytes.
 */
export function duplicateSprites(
  image: ImageData,
  /** As `spriteSegments` returns them — the order decides which sprite each group is named after. */
  boxes: readonly SpriteBox[],
  tolerance: number,
): readonly SpriteDuplicateGroup[] {
  // Rooted at the lowest index, so a group's root is the earliest of its sprites in the list and
  // the canonical below needs no second pass to find. That is reading order in the only way this is
  // ever called — `spriteSegments` returns its boxes topmost-first — and it is a property of the
  // list rather than one re-derived from coordinates here, so the two cannot disagree about which
  // sprite a group is named after. See `disjointSet`.
  const { find, union } = disjointSet(boxes.length);

  // Which byte-identical class each sprite belongs to, as the index of that class's first member.
  // Its own index where it is the first, which is also the state a sprite in a class of one is left
  // in — so `identical[a] === identical[b]` is the whole test the group's `exact` flag needs.
  const identical = boxes.map((_, index) => index);

  // The hash pass, and the only reason it exists: it collapses a run of genuinely identical frames
  // into one representative apiece before the quadratic walk below sees them, so a strip of twenty
  // repeats of one frame costs nineteen equality checks rather than a hundred and ninety distance
  // measurements. Confirmed by comparing the bytes, never by the hash alone — a hash collision
  // claiming a duplicate would be the snap overwriting one sprite with another.
  //
  // **The extent is part of the key**, and here it genuinely is a shortcut rather than a rule: two
  // sprites of different sizes cannot hold identical pixels, so bucketing them apart costs nothing
  // and saves the equality check. The *tolerance* below places no such demand — see the docblock.
  const byHash = new Map<string, number[]>();
  const representatives: number[] = [];
  for (const [index, box] of boxes.entries()) {
    const key = `${String(box.width)}x${String(box.height)}:${String(spriteHash(image, box))}`;
    const matches = byHash.get(key);
    if (matches === undefined) {
      byHash.set(key, [index]);
      representatives.push(index);
      continue;
    }
    const twin = matches.find((other) => sameSprite(image, boxes[other], box));
    if (twin === undefined) {
      matches.push(index);
      representatives.push(index);
      continue;
    }
    identical[index] = identical[twin] ?? twin;
    union(twin, index);
  }

  // Every remaining pair, which is what `SCATTERED_SPRITE_CEILING` bounds: it caps a segmentation at
  // 512 boxes, so this walk is at most a hundred and thirty thousand comparisons, and each of them
  // abandons as soon as the running sum can no longer come under the tolerance.
  //
  // Measured at that ceiling — 512 sprites of 20 × 20 drawn pixels, none of them exact, so every
  // pair has to be measured until it is rejected — the whole pass costs a fraction of a second at
  // the top of the dial's range and an order of magnitude less at the bottom, where a pair is
  // rejected at its first differing cell. It runs on a worker behind the tab's own debounce, so that
  // is comfortably inside one dial movement. The figures are a shape rather than a budget: this
  // machine's wall-clock moved several-fold between runs of the same code, and what matters is that
  // the cost is quadratic in a count something else already bounds.
  for (const [position, left] of representatives.entries()) {
    for (let step = position + 1; step < representatives.length; step += 1) {
      const right = representatives[step];
      if (right === undefined) continue;
      // Already one group by way of a third sprite, so the measurement would change nothing. The
      // relation is not transitive — a chain of three each within the tolerance of the next can span
      // twice it — and union–find is what settles that, exactly as it settles the gap merge in
      // `spriteSegments`: a chain is one group. The tolerance is small enough that a chain long
      // enough to matter is a sheet whose sprites are all one sprite anyway.
      if (find(left) === find(right)) continue;
      if (withinTolerance(image, boxes[left], boxes[right], tolerance)) union(left, right);
    }
  }

  // Grouped in index order, so each group's members arrive in reading order and its root — the
  // lowest index, which is the guarantee `disjointSet` is written to give — is the first of them.
  const groups = new Map<number, number[]>();
  for (let index = 0; index < boxes.length; index += 1) {
    const root = find(index);
    const members = groups.get(root);
    if (members === undefined) groups.set(root, [index]);
    else members.push(index);
  }

  // Walked in root order rather than in the map's own, which is whichever sprite happened to open
  // each group. Roots are list positions, so ascending roots is the order the boxes arrived in — the
  // same ordering the canonical is chosen by, stated once.
  const found: SpriteDuplicateGroup[] = [];
  for (const [root, members] of [...groups].sort(([left], [right]) => left - right)) {
    if (members.length < 2) continue;
    const canonical = boxes[root];
    if (canonical === undefined) continue;
    const canonicalClass = identical[root] ?? root;
    found.push({
      canonical,
      duplicates: members
        .filter((index) => index !== root)
        .flatMap((index) => {
          const box = boxes[index];
          return box === undefined ? [] : [{ box, exact: (identical[index] ?? index) === canonicalClass }];
        }),
    });
  }

  return found;
}
