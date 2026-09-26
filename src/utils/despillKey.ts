import { DESPILL_DEPTH } from '../constants/quantiser.ts';
import { alphaAt, CHANNELS_PER_PIXEL, FULLY_TRANSPARENT } from './imageData.ts';
import { carriesKeyTint, type KeyBasis } from './keyDistance.ts';
import { type MutableOklab, oklabToSrgb, srgbToOklabInto } from './oklab.ts';
import { touchesField } from './touchesField.ts';

/**
 * Taking the key's tint back out of the drawn pixels just inside a keyed silhouette.
 *
 * `keyBackground`'s fringe pass removes the one pixel of blend touching the field, and stops there on
 * purpose: its answer is deletion, and a deletion repeated inward is a flood fill. But an
 * anti-aliased, resampled edge carries the key further than one pixel. Measured on the reference
 * sheet after keying at the default tolerance, `carriesKeyTint` reports 23% of the opaque pixels one
 * pixel in from the transparent field, 8.4% two in, 1.9% three in and 0.2% four in, against about
 * 0.01% further in — see `DESPILL_DEPTH` for the other sheets. That ring reaches the output whole at
 * a grid of 1, and the cell reading carries part of it into edge cells at every other grid.
 *
 * **Despill rather than erosion, because no pixel here is background.** These pixels are the
 * sprite with some of the key mixed into them, so the correction keeps each one and removes only
 * what the key added: its OKLab lightness is kept, the part of its chroma lying along the key's hue
 * is removed, and whatever chroma stands off that hue is kept. That is the colour correction a
 * compositor applies to spill beside its matte, taken in the space every gate here measures in,
 * rather than a matte itself: Smith and Blinn ("Blue Screen Matting", 1996) would read such a pixel
 * as partly transparent, and this app's keyed output is opaque or empty. It deletes nothing, so it
 * cannot thin a silhouette.
 *
 * Pure apart from the one image it is handed, which the caller owns: `keyBackground` passes its own
 * freshly built output, so nothing outside that call is written.
 */

/** Scratch for the pixel being corrected, for the reason `keyDistance.ts` gives its own one. */
const PIXEL: MutableOklab = { L: 0, a: 0, b: 0 };

/** A pixel's four orthogonal neighbours, bounds-checked so a row never wraps onto the next. */
function forEachNeighbour(width: number, height: number, index: number, visit: (at: number) => void): void {
  const x = index % width;
  if (x > 0) visit(index - 1);
  if (x < width - 1) visit(index + 1);
  if (index >= width) visit(index - width);
  if (index < (height - 1) * width) visit(index + width);
}

/**
 * Removes the key's hue from the tinted pixels within {@link DESPILL_DEPTH} of the transparent field,
 * except where the tint runs deeper than that band.
 *
 * Three steps:
 *
 * 1. **The band.** A breadth-first walk out of every fully transparent pixel, over 4-adjacency, gives
 *    each drawn pixel its distance from the field, up to one ring past the band. The walk's queue is
 *    in distance order, so each ring is a slice of it.
 * 2. **The guard.** Artwork drawn in the key's own hue against the field reads exactly as spill does
 *    to a colour test — see `KEY_TINT_OFF_HUE`. What tells the two apart is depth: spill fades within
 *    the band, while a painted region carries on past it. So a tinted pixel one ring past the band
 *    marks the region it belongs to as artwork, and that mark walks outward ring by ring through
 *    tinted pixels, each taking it from any of its eight neighbours one ring deeper. A tinted pixel reached that way
 *    is left alone. Walking only outward is what stops the mark running round a silhouette's whole
 *    spill ring from the one deep pixel it touches.
 * 3. **The correction.** Every other tinted pixel in the band loses the chroma it carries along the
 *    key's hue. Alpha is not touched.
 *
 * An achromatic key has no hue to remove — `carriesKeyTint` answers `false` for every pixel of one —
 * so it returns before the walk.
 */
export function despillKey(image: ImageData, basis: KeyBasis): void {
  if (basis.chroma === 0) return;

  const { width, height, data } = image;
  const pixels = width * height;
  const outermost = DESPILL_DEPTH + 1;

  const field = new Uint8Array(pixels);
  for (let index = 0; index < pixels; index += 1) {
    if (alphaAt(data, index * CHANNELS_PER_PIXEL) === FULLY_TRANSPARENT) field[index] = 1;
  }

  // 0 for the field and for every pixel deeper than the walk goes; otherwise the ring it sits in.
  const depth = new Uint8Array(pixels);
  const queue = new Int32Array(pixels);
  // Where each ring begins in `queue`; the entry after the last ring is where that ring ends.
  const ringStart = new Int32Array(outermost + 2);
  let tail = 0;
  for (let index = 0; index < pixels; index += 1) {
    if (field[index] === 1) continue;
    if (touchesField(field, width, height, index)) {
      depth[index] = 1;
      queue[tail++] = index;
    }
  }
  for (let ring = 1; ring < outermost; ring += 1) {
    ringStart[ring + 1] = tail;
    for (let at = ringStart[ring] ?? 0; at < (ringStart[ring + 1] ?? 0); at += 1) {
      forEachNeighbour(width, height, queue[at] ?? 0, (next) => {
        if (field[next] === 0 && depth[next] === 0) {
          depth[next] = ring + 1;
          queue[tail++] = next;
        }
      });
    }
  }
  ringStart[outermost + 1] = tail;

  // 1 for a tinted pixel, 2 once the guard has claimed it as artwork. Deepest ring first, so each
  // ring reads a finished answer from the one beneath it.
  const tint = new Uint8Array(pixels);
  for (let ring = outermost; ring >= 1; ring -= 1) {
    for (let at = ringStart[ring] ?? 0; at < (ringStart[ring + 1] ?? 0); at += 1) {
      const index = queue[at] ?? 0;
      if (!carriesKeyTint(data, index * CHANNELS_PER_PIXEL, basis)) continue;
      tint[index] = ring === outermost || deeperArtwork(tint, depth, width, height, index) ? 2 : 1;
    }
  }

  for (let at = 0; at < (ringStart[outermost] ?? 0); at += 1) {
    const index = queue[at] ?? 0;
    if (tint[index] === 1) removeKeyHue(data, index * CHANNELS_PER_PIXEL, basis);
  }
}

/**
 * Whether any of the eight neighbours one ring deeper has been claimed as artwork.
 *
 * Eight rather than the walk's four because of a region's corners. The rings are measured over
 * 4-adjacency, so where a region's corner points into the field its diagonal pixels sit one ring
 * apart and every orthogonal neighbour of each sits in its own ring or a shallower one. Asked of four
 * neighbours, the claim never reaches that diagonal, and a painted region lost its hue in a square
 * `DESPILL_DEPTH` across at every convex corner. Only a deeper neighbour can hand the claim on, so
 * it still walks outward and cannot run along a ring.
 */
function deeperArtwork(
  tint: Uint8Array,
  depth: Uint8Array,
  width: number,
  height: number,
  index: number,
): boolean {
  const deeper = (depth[index] ?? 0) + 1;
  const x = index % width;
  const y = (index - x) / width;
  for (let row = Math.max(0, y - 1); row <= Math.min(height - 1, y + 1); row += 1) {
    for (let column = Math.max(0, x - 1); column <= Math.min(width - 1, x + 1); column += 1) {
      const at = row * width + column;
      if (depth[at] === deeper && tint[at] === 2) return true;
    }
  }
  return false;
}

/**
 * The pixel at `offset` with the chroma it carries along the key's hue removed, lightness and the
 * off-hue chroma kept. Only reached for a pixel `carriesKeyTint` passed, whose on-axis chroma is
 * positive by that test's floor.
 */
function removeKeyHue(data: Uint8ClampedArray, offset: number, basis: KeyBasis): void {
  srgbToOklabInto(PIXEL, data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0);
  const onAxis = PIXEL.a * basis.hueA + PIXEL.b * basis.hueB;
  const { r, g, b } = oklabToSrgb({
    L: PIXEL.L,
    a: PIXEL.a - onAxis * basis.hueA,
    b: PIXEL.b - onAxis * basis.hueB,
  });
  data[offset] = r;
  data[offset + 1] = g;
  data[offset + 2] = b;
}
