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
 * makes the snap a plain block copy. But on the reference sheet — `test_sprites/armour.png`,
 * quantised at a grid of 6, keyed on `#FF00FF` at tolerance 24, with no palette step — adding four
 * to every colour channel of every pixel left only **3 of its 15** sprites with the drawn extent
 * they had before, and subtracting four left **6**. A sprite thirty drawn pixels across loses or
 * gains one the moment a single contour pixel crosses the keying threshold — so a rule turning on
 * exact extents would fire on repeats that came back byte-identical and on almost nothing else,
 * which is a dial that appears not to work. The union box costs an extra row about one unit of the
 * mean on a sprite that size, which is inside the dial's range rather than past it.
 *
 * **Both directions are stated because the sign of the perturbation moves the answer, and the
 * figure recorded here before named neither.** "Four parts in 255 per channel" says how far and
 * neither which way nor with what distribution, and the readings a maintainer might take from it
 * disagree: nine of them — the two flat shifts, per-pixel random of that magnitude at three seeds,
 * alternating by channel, and uniform over that interval at three seeds — run from **1 to 6** of the
 * 15 sprites keeping their extent, and none of them is 4. The conclusion above survives every one,
 * which is why the design was never in question; but a figure offered as evidence has to be
 * reproducible from what it states, and the number this paragraph carried was reproducible from
 * none of them. `tests/quantiser-docblock-figures.test.ts` pins both directions against the
 * construction named above.
 *
 * **A sprite is identified across the perturbation by its centre, not by its position in the list.**
 * A shifted sheet meshes differently, the bottom row's tops move by different amounts, and that row
 * re-sorts — so the nth box either side is not the same piece of artwork. Measured by list position
 * the two flat readings still come to 3 and 6, but by cancelling errors rather than by measuring
 * what they claim to.
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
  // **At that ceiling the pass costs seconds, and the top of the dial is not where it is worst.**
  // Built to the ceiling — 512 sprites of 20 × 20 drawn pixels filled with per-channel noise, so no
  // pair is byte-identical and the hash pass collapses none of them — the cost climbs steadily with
  // the dial and then falls off its last rung. Against the dial's floor, where a pair is rejected at
  // its first differing cell, it is roughly **60× at tolerance 6, 130× at 12, and 230× at its peak
  // around 21** — then about **100× at the top rung**, which is well under half the peak.
  //
  // **The top rung is cheaper than the peak, and the reason is this walk's own machinery.** The
  // expensive case is a pair close enough to be walked a long way before its running sum passes the
  // budget and not close enough to group. Nothing at all groups from the floor to tolerance 22; at
  // 23 the noise's spread starts bringing pairs under the threshold, in seven small groups holding
  // 15 sprites between them; and at 24 those chain into a single group of 488, after which
  // `find(left) === find(right)` disposes of most of the remaining pairs without measuring them. So
  // grouping is what makes the top rung affordable rather than the absence of it, and a sheet whose
  // sprites sat astride the threshold *at* the top rung would cost there what this one costs at 22.
  //
  // **The figures are ratios because absolute wall-clock does not reproduce, and this fixture is
  // where that was measured rather than assumed.** The same rung on the same fixture on this machine
  // differed by three to four times between a cold single sweep and a warmed one, and adjacent warm
  // runs of one rung differed by two — so a millisecond figure written here would be a claim that
  // fails on re-measurement, which is the defect this paragraph was rewritten to correct. The order
  // of magnitude is what survives: seconds at the ceiling, not a fraction of one.
  //
  // **No sheet this project has comes near it.** All eight in `test_sprites/`, quantised at a grid of
  // 6 and keyed on `#FF00FF` at tolerance 24 with no palette step, segment into between 15 and 42
  // sprites, and the pass costs single-digit to low-tens of milliseconds on each — two to three
  // orders of magnitude under the fixture, because the pair count is quadratic in a figure an order
  // of magnitude smaller and because a real sprite's margins are transparent on both sides and cost
  // nothing to compare. `SCATTERED_SPRITE_CEILING` says the same of its own number: 512 is far above
  // every real sheet, and what sits between is pathology rather than artwork.
  //
  // So the pass is inside one dial movement on every sheet measured, and it is nowhere near it at
  // the ceiling — and **neither the worker nor the debounce changes that**, which is what the note
  // here used to claim. The worker keeps the tab painting and answering while the work runs, and the
  // debounce drops the intermediate values of a drag; neither makes the work itself shorter. What
  // the ceiling buys is that the pathological case is *bounded*, not that it is fast.
  //
  // `tests/quantiser-docblock-figures.test.ts` holds the deterministic half of all of this: the
  // corpus's own sprite counts, and this fixture's grouping at four rungs — nothing at the floor,
  // nothing at the peak, the seven small groups at 23, the 488 at 24 — which is what says the
  // expensive rungs really are walking every pair rather than skipping them.
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
