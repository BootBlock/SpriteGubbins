import type { PixelShift, SpriteBox } from '../types/quantiser.ts';
import { CHANNELS_PER_PIXEL, FULLY_TRANSPARENT, packedColorAt, pixelOffset } from './imageData.ts';
import type { MutableOklab } from './oklab.ts';
import { srgbToOklabInto } from './oklab.ts';
import { pixelDistance } from './pixelDistance.ts';

/**
 * When two sprites on a sheet are the same sprite: the bucketing hash, the exact test and the
 * distance the tolerance is stated in.
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
 * equality test in {@link spriteDistance} dispose of a cell neither sprite covers, a cell both
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
 * value {@link spriteDistance} substitutes for a cell outside a sprite's box. Both are the same
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
 * The mean per-cell distance between two sprites laid over one another at `shift`, or `Infinity`
 * once it is known to pass `limit`.
 *
 * `shift` is where `right`'s top-left corner sits relative to `left`'s, and the two are read across
 * the box that covers both at that offset. Which offset to ask for is `registerSprites`'s question,
 * not this one's: the corners are only where the search starts, because keying moves them. The
 * cells only one sprite covers count as a loss rather than being left out — see `duplicateSprites`.
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
 * **The early exit is exact, not a heuristic, and it is what makes the grouping walk affordable.**
 * The running sum only grows and the divisor can never exceed the union box's cell count, so a sum
 * already past `limit × those cells` means the final mean is past `limit` whatever the rest of the
 * sprites hold. A pair that is not a duplicate is usually rejected within the first few rows, and at
 * a limit of `0` it is rejected at the first cell that differs. The registration search leans on it
 * too, handing each candidate after the first the best mean so far as its limit.
 *
 * **The box's cell count is the only sound bound available here**, and the tempting tighter one is
 * wrong: `SpriteBox.pixels` counts the opaque pixels of the *connected region*, not of the box that
 * bounds it, so a speck sitting in a sprite's notch is inside the box and absent from the figure.
 * Bounding the divisor by the two sprites' `pixels` added together therefore under-counts on exactly
 * those sheets, which would make this reject a pair whose true mean is under the limit — an early
 * exit that changes the answer, which is the one thing it may not do.
 *
 * `Infinity` too for a pair with no visible cell between them — two sprites both entirely
 * transparent, which the speck floor makes unreachable from a real segmentation and which is a
 * comparison with nothing in it either way.
 */
export function spriteDistance(
  image: ImageData,
  left: SpriteBox,
  right: SpriteBox,
  shift: PixelShift,
  limit = Infinity,
): number {
  const { data } = image;
  // The union box, in a frame whose origin is `left`'s top-left corner.
  const first = { x: Math.min(0, shift.x), y: Math.min(0, shift.y) };
  const width = Math.max(left.width, shift.x + right.width) - first.x;
  const height = Math.max(left.height, shift.y + right.height) - first.y;
  const budget = limit * width * height;
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

  for (const [top, bottom, start, end] of walkOrder(first, width, height, left, right, shift)) {
    for (let row = top; row < bottom; row += 1) {
      const leftRow = row >= 0 && row < left.height;
      const rightRow = row >= shift.y && row < shift.y + right.height;
      for (let column = start; column < end; column += 1) {
        // `-1` is off the edge of one sprite, which is transparent on that side — the cells the union
        // box adds. Never an out-of-bounds read: every offset built here is inside the sprite that
        // owns it, and the sprite is inside the sheet.
        const from =
          leftRow && column >= 0 && column < left.width
            ? pixelOffset(image.width, left.left + column, left.top + row)
            : -1;
        const to =
          rightRow && column >= shift.x && column < shift.x + right.width
            ? pixelOffset(image.width, right.left + column - shift.x, right.top + row - shift.y)
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
          if (from >= 0) {
            srgbToOklabInto(leftColor, data[from] ?? 0, data[from + 1] ?? 0, data[from + 2] ?? 0);
          }
          if (to >= 0) srgbToOklabInto(rightColor, data[to] ?? 0, data[to + 1] ?? 0, data[to + 2] ?? 0);
          cachedDistance = pixelDistance(leftColor, leftAlpha, rightColor, rightAlpha);
          cachedLeft = leftPacked;
          cachedRight = rightPacked;
        }
        sum += cachedDistance;
        if (sum > budget) return Infinity;
      }
    }
  }

  if (counted === 0) return Infinity;
  const mean = sum / counted;
  return mean > limit ? Infinity : mean;
}

/**
 * The union box as the rectangles {@link spriteDistance} walks, the cells only one sprite covers
 * first: the rows above and below where the two overlap, then the columns either side of it, then
 * the overlap itself. Each is `[top, bottom, start, end]`, half-open, in the frame whose origin is
 * `left`'s top-left corner.
 *
 * **The order is the early exit's, and it changes nothing but rounding.** A cell only one sprite covers is
 * transparent on the other side, so wherever it is drawn it scores its whole alpha — and those cells
 * are what separate an offset that does not match from one that does. Walked first, they carry the
 * running sum past the budget within a row or two on an offset that cannot win, where walked in
 * reading order they are spread one or two to a row and the sum reaches the budget halfway down the
 * sprite. The cells summed are the same in any order, so the mean returned differs by rounding in
 * its last bits at most, and the exit stays exact for the reason `spriteDistance` gives.
 */
function walkOrder(
  first: PixelShift,
  width: number,
  height: number,
  left: SpriteBox,
  right: SpriteBox,
  shift: PixelShift,
): readonly (readonly [number, number, number, number])[] {
  const top = first.y;
  const bottom = first.y + height;
  const start = first.x;
  const end = first.x + width;
  const overlapTop = Math.max(0, shift.y);
  const overlapBottom = Math.min(left.height, shift.y + right.height);
  const overlapStart = Math.max(0, shift.x);
  const overlapEnd = Math.min(left.width, shift.x + right.width);
  // Two sprites laid clear of one another share no cell, so the whole box is one side's alone.
  if (overlapTop >= overlapBottom || overlapStart >= overlapEnd) return [[top, bottom, start, end]];
  return [
    [top, overlapTop, start, end],
    [overlapBottom, bottom, start, end],
    [overlapTop, overlapBottom, start, overlapStart],
    [overlapTop, overlapBottom, overlapEnd, end],
    [overlapTop, overlapBottom, overlapStart, overlapEnd],
  ];
}
