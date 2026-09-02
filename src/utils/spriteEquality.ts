import type { SpriteBox } from '../types/quantiser.ts';
import { CHANNELS_PER_PIXEL, FULLY_TRANSPARENT, packedColorAt, pixelOffset } from './imageData.ts';
import type { MutableOklab } from './oklab.ts';
import { srgbToOklabInto } from './oklab.ts';
import { pixelDistance } from './pixelDistance.ts';

/**
 * When two sprites on a sheet are the same sprite: the bucketing hash, the exact test and the
 * tolerated one.
 *
 * The relation `duplicateSprites` groups by, kept apart from the grouping itself. Nothing here knows
 * what a group is or which sprite names one — each function answers one question about a pair (or,
 * for the hash, about a single box) and answers it in pixels.
 *
 * **A transparent pixel compares equal to any other transparent pixel, in all three.** Nothing
 * clears the colour bytes under a pixel the keying removed, so two sprites that look identical can
 * hold different rubbish beneath their empty margins — and comparing those bytes would report a
 * difference between two things nobody can see. It is the same rule `pixelDistance` applies, stated
 * three ways for three different questions.
 */

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
export function spriteHash(image: ImageData, box: SpriteBox): number {
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
export function sameSprite(image: ImageData, left: SpriteBox | undefined, right: SpriteBox): boolean {
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
 * running sum only grows and the divisor can never exceed the union box's cell count, so a sum
 * already past `tolerance × those cells` means the final mean is past `tolerance` whatever the rest
 * of the sprites hold. A pair that is not a duplicate is usually rejected within the first few rows,
 * and at a tolerance of `0` it is rejected at the first cell that differs.
 *
 * **The box's cell count is the only sound bound available here**, and the tempting tighter one is
 * wrong: `SpriteBox.pixels` counts the opaque pixels of the *connected region*, not of the box that
 * bounds it, so a speck sitting in a sprite's notch is inside the box and absent from the figure.
 * Bounding the divisor by the two sprites' `pixels` added together therefore under-counts on exactly
 * those sheets, which would make this reject a pair whose true mean is under the tolerance — an
 * early exit that changes the answer, which is the one thing it may not do.
 *
 * Returns `false` for a pair with no visible cell between them — two sprites both entirely
 * transparent, which the speck floor makes unreachable from a real segmentation and which is a
 * comparison with nothing in it either way.
 */
export function withinTolerance(
  image: ImageData,
  left: SpriteBox | undefined,
  right: SpriteBox | undefined,
  tolerance: number,
): boolean {
  if (left === undefined || right === undefined) return false;

  const { data } = image;
  const width = Math.max(left.width, right.width);
  const height = Math.max(left.height, right.height);
  const budget = tolerance * width * height;
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
