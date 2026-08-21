import type { SpriteBox, SpriteDuplicateGroup } from '../types/quantiser.ts';
import { CHANNELS_PER_PIXEL, FULLY_TRANSPARENT, packedColorAt, pixelOffset } from './imageData.ts';
import type { MutableOklab } from './oklab.ts';
import { srgbToOklabInto } from './oklab.ts';
import { pixelDistance } from './pixelDistance.ts';

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
  const parent = boxes.map((_, index) => index);
  const find = (index: number): number => {
    let root = index;
    while ((parent[root] ?? root) !== root) root = parent[root] ?? root;
    let walk = index;
    while (walk !== root) {
      const above = parent[walk] ?? walk;
      parent[walk] = root;
      walk = above;
    }
    return root;
  };
  const union = (left: number, right: number): void => {
    const rootLeft = find(left);
    const rootRight = find(right);
    // The lower index wins, so a group's root is the earliest of its sprites in the list and the
    // canonical below needs no second pass to find. That is reading order in the only way this is
    // ever called — `spriteSegments` returns its boxes topmost-first — and it is a property of the
    // list rather than one re-derived from coordinates here, so the two cannot disagree about which
    // sprite a group is named after.
    if (rootLeft < rootRight) parent[rootRight] = rootLeft;
    else if (rootRight < rootLeft) parent[rootLeft] = rootRight;
  };

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
  // lowest index, by the way `union` above points the higher at the lower — is the first of them.
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

/**
 * A cell's packed colour, with everything invisible packed the same way.
 *
 * `ImageData` carries whatever bytes happened to sit under a cleared pixel, so two cells that both
 * show nothing can hold different rubbish — and comparing those bytes would report a difference
 * between two things nobody can see. Collapsing them to {@link CLEAR} is the same rule
 * {@link spriteHash} applies, stated for one cell instead of a whole sprite, and it is what lets one
 * equality test in {@link withinTolerance} dispose of a cell neither sprite covers, a cell both
 * cleared, and two cells of one colour.
 */
function visibleColorAt(data: Uint8ClampedArray, offset: number): number {
  const packed = packedColorAt(data, offset);
  return (packed & 0xff) === FULLY_TRANSPARENT ? CLEAR : packed;
}

/**
 * The packed colour of a cell no sprite covers, and of a cleared one: four zero bytes.
 *
 * What `packedColorAt` returns for a fully transparent pixel whose colour bytes are zero, and the
 * value {@link withinTolerance} substitutes for a cell outside a sprite's box. Both are the same
 * thing — nothing there — and packing them the same way is what lets one comparison dispose of a
 * cell neither sprite covers, a cell both cleared, and two cells of one colour.
 */
const CLEAR = 0;

/** The FNV-1a offset basis and prime, 32-bit — the standard constants, not tunable numbers. */
const HASH_BASIS = 0x811c9dc5;
const HASH_PRIME = 0x01000193;

/**
 * A sprite's pixels as one 32-bit number, so identical artwork lands in one bucket.
 *
 * FNV-1a, which is a hash for *bucketing* rather than for identity: every match it produces is
 * confirmed against the bytes by {@link sameSprite} before anything acts on it, so a collision costs
 * one wasted comparison and can never claim a duplicate. It is here rather than a cryptographic
 * digest because that is all it is asked to do, and because it is a few arithmetic operations per
 * pixel with nothing to import.
 *
 * **A fully transparent pixel hashes as one value whatever bytes it carries**, and it has to. Nothing
 * clears the colour under a pixel the keying removed, so two sprites that look identical can hold
 * different rubbish beneath their empty margins — hashing that would split a bucket over pixels
 * nobody can see. It is the same rule {@link pixelDistance} applies to the same pixels, stated in
 * bytes instead of in distance.
 */
function spriteHash(image: ImageData, box: SpriteBox): number {
  let hash = HASH_BASIS;
  const mix = (byte: number): void => {
    hash = Math.imul(hash ^ byte, HASH_PRIME);
  };
  // The extent is hashed too, so two sprites of different shapes cannot share a bucket by holding
  // the same bytes in a different arrangement.
  mix(box.width & 0xff);
  mix((box.width >> 8) & 0xff);
  mix(box.height & 0xff);
  mix((box.height >> 8) & 0xff);

  const { data } = image;
  for (let row = 0; row < box.height; row += 1) {
    let offset = pixelOffset(image.width, box.left, box.top + row);
    for (let column = 0; column < box.width; column += 1) {
      const alpha = data[offset + 3] ?? 0;
      if (alpha === FULLY_TRANSPARENT) {
        mix(0);
        mix(0);
        mix(0);
        mix(0);
      } else {
        mix(data[offset] ?? 0);
        mix(data[offset + 1] ?? 0);
        mix(data[offset + 2] ?? 0);
        mix(alpha);
      }
      offset += CHANNELS_PER_PIXEL;
    }
  }
  // Unsigned, so the map is keyed on one number per hash rather than on two spellings of it.
  return hash >>> 0;
}

/**
 * Whether two sprites hold the same visible pixels, byte for byte.
 *
 * What a hash bucket's members are checked against, and what the `exact` flag on a group's member
 * reports. Transparent pixels match each other whatever lies under them, for the reason
 * {@link spriteHash} gives.
 */
function sameSprite(image: ImageData, left: SpriteBox | undefined, right: SpriteBox): boolean {
  if (left === undefined || left.width !== right.width || left.height !== right.height) return false;

  const { data } = image;
  for (let row = 0; row < right.height; row += 1) {
    let from = pixelOffset(image.width, left.left, left.top + row);
    let to = pixelOffset(image.width, right.left, right.top + row);
    for (let column = 0; column < right.width; column += 1) {
      const leftAlpha = data[from + 3] ?? 0;
      const rightAlpha = data[to + 3] ?? 0;
      if (leftAlpha !== rightAlpha) return false;
      if (leftAlpha !== FULLY_TRANSPARENT) {
        if (data[from] !== data[to] || data[from + 1] !== data[to + 1] || data[from + 2] !== data[to + 2]) {
          return false;
        }
      }
      from += CHANNELS_PER_PIXEL;
      to += CHANNELS_PER_PIXEL;
    }
  }
  return true;
}

/**
 * Whether the mean per-cell distance between two sprites comes in under `tolerance`.
 *
 * The two are laid over one another by their top-left corners and read across the box that covers
 * both — see the module docblock for why the bounding box is the registration, and why the cells
 * only one of them covers count as a loss rather than being left out.
 *
 * Mean rather than worst, for the reason `differenceMap` takes the mean over a cell's source pixels:
 * the question is how well one sprite *stands for* the other, and a single stray pixel — a rivet the
 * palette rounded the other way — should not disqualify a frame that is otherwise the same drawing.
 * Worst-case would make the dial a maximum-difference threshold, which no sheet passes above zero.
 *
 * **Cells transparent on both sides are left out**, exactly as they are left out of a difference
 * map's sheet figure: they were not drawn differently, they were not drawn at all, and averaging
 * them in would make the answer a measure of how much empty space the sprites' boxes hold — so a
 * sprawling figure with a lot of margin would pass a threshold a compact one failed.
 *
 * **The early exit is exact, not a heuristic, and it is what makes the walk above affordable.** The
 * running sum only grows, and the divisor — the cells at least one of the two sprites covers — can
 * never exceed either the union box's cell count or the two sprites' own opaque-cell counts added
 * together, since every counted cell is opaque on at least one side. So a sum already past
 * `tolerance × that smaller bound` means the final mean is past `tolerance` whatever the rest of the
 * sprites hold. Taking the tighter of the two bounds matters on real artwork, where a silhouette
 * fills perhaps half its bounding box: it halves the work a pair costs before it is rejected.
 *
 * A pair that is not a duplicate is usually rejected within the first few rows, and at a tolerance
 * of `0` it is rejected at the first cell that differs.
 *
 * Returns `false` for a pair with no visible cell between them — two sprites both entirely
 * transparent, which the speck floor makes unreachable from a real segmentation and which is a
 * comparison with nothing in it either way.
 */
function withinTolerance(
  image: ImageData,
  left: SpriteBox | undefined,
  right: SpriteBox | undefined,
  tolerance: number,
): boolean {
  if (left === undefined || right === undefined) return false;

  const { data } = image;
  const width = Math.max(left.width, right.width);
  const height = Math.max(left.height, right.height);
  const budget = tolerance * Math.min(width * height, left.pixels + right.pixels);
  const leftColor: MutableOklab = { L: 0, a: 0, b: 0 };
  const rightColor: MutableOklab = { L: 0, a: 0, b: 0 };
  let sum = 0;
  let counted = 0;
  // The pair cache: pixel art runs one colour along a scanline, so a contour compared against a
  // clear margin asks the same question of cell after cell — and answering it means two OKLab
  // conversions and a square root. `-1` is no pair, which no packed value can be. It is the same
  // device `differenceMap` uses on its source, for the same reason.
  let cachedLeft = -1;
  let cachedRight = -1;
  let cachedDistance = 0;

  for (let row = 0; row < height; row += 1) {
    const leftRow = row < left.height;
    const rightRow = row < right.height;
    for (let column = 0; column < width; column += 1) {
      // `-1` is off the end of one sprite, which is transparent on that side — the cells the union
      // box adds. Never an out-of-bounds read: every offset built here is inside the sprite that
      // owns it, and the sprite is inside the sheet.
      const from =
        leftRow && column < left.width ? pixelOffset(image.width, left.left + column, left.top + row) : -1;
      const to =
        rightRow && column < right.width
          ? pixelOffset(image.width, right.left + column, right.top + row)
          : -1;

      // A cell no sprite covers is fully transparent on that side, and `CLEAR` is the packed value
      // that says so — which is what lets the cache below key on colour alone.
      const leftPacked = from < 0 ? CLEAR : visibleColorAt(data, from);
      const rightPacked = to < 0 ? CLEAR : visibleColorAt(data, to);
      // The equal-colour shortcut, which is the case that dominates a genuine duplicate — and which
      // also disposes of every cell neither sprite covers, since both read `CLEAR`.
      if (leftPacked === rightPacked) {
        if (leftPacked !== CLEAR) counted += 1;
        continue;
      }
      counted += 1;

      if (leftPacked !== cachedLeft || rightPacked !== cachedRight) {
        const leftAlpha = leftPacked & 0xff;
        const rightAlpha = rightPacked & 0xff;
        if (from >= 0) srgbToOklabInto(leftColor, data[from] ?? 0, data[from + 1] ?? 0, data[from + 2] ?? 0);
        if (to >= 0) srgbToOklabInto(rightColor, data[to] ?? 0, data[to + 1] ?? 0, data[to + 2] ?? 0);
        cachedDistance = pixelDistance(leftColor, leftAlpha, rightColor, rightAlpha);
        cachedLeft = leftPacked;
        cachedRight = rightPacked;
      }
      sum += cachedDistance;
      if (sum > budget) return false;
    }
  }

  return counted > 0 && sum / counted <= tolerance;
}
