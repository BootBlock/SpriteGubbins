import { CHANNELS_PER_PIXEL, FULLY_OPAQUE, FULLY_TRANSPARENT, createImage } from './imageData.ts';

/**
 * Taking the soft edge off a silhouette the sheet arrived with: every partly-covered pixel is either
 * cleared outright or made solid, by where its own coverage falls against a threshold.
 *
 * **The pass exists for the sheet that is already at its own pixel scale**, where nothing else in the
 * pipeline reaches a soft edge. The pipeline's usual answer to a generator's blur is the mesh
 * reading — `alignToGrid` resolves each cell to one colour, which collapses the resampler's ramp —
 * and at a grid of 1 that reading is a no-op, because every cell is one pixel. So a sheet this app
 * downloaded earlier, or a hand-drawn PNG with an anti-aliased outline, keeps every soft pixel it
 * arrived with and there was no control that hardened it.
 *
 * **It is a statement about what counts as background**, which is why it belongs with the keying
 * panel rather than with the anti-aliasing one, and why it is the exact opposite operation to
 * `antiAlias`'s `SILHOUETTE` position. Keying answers that question by *colour*; this answers it by
 * coverage. A reader may reasonably ask for both this and a silhouette softening afterwards — harden
 * what the generator left, then write the coverage back deliberately, palette-aware and at the
 * strength asked for — and the pipeline's order is what makes that read as one intent rather than
 * two passes fighting.
 *
 * **Only alpha is read and only alpha is written.** A pixel that arrived fully transparent is left
 * fully transparent, a pixel that arrived fully opaque is left exactly as it was, and a partly
 * covered pixel keeps its own RGB when it is kept. That is what makes the pass *silhouette* rather
 * than interior: an interior soft boundary is a colour ramp at full alpha, and hardening one of those
 * is what a colour reduction already does. There is nothing here for a second control to do.
 *
 * A cleared pixel is written `{0, 0, 0, 0}` rather than its own RGB at zero alpha, for the reason
 * `keyBackground` gives at length: `alignToGrid` votes on the packed RGBA, so transparent pixels that
 * kept different RGB values are still different colours to that vote.
 *
 * **Hands back its argument by reference wherever nothing moved**, which is the contract
 * `snapSymmetric`, `snapFrames` and `antiAlias` all keep and for the same reason — the copy alone is
 * 67MB at the ceiling this app admits, and a sheet with no partial alpha in it has nothing for this
 * pass to change. The scan that decides is one linear read of the alpha channel, which is what makes
 * asking cheaper than copying.
 *
 * Pure: one `ImageData` in, one out, no store and no canvas.
 */
export function hardenSilhouette(image: ImageData, threshold: number): ImageData {
  if (threshold <= 0) return image;

  const { width, height, data } = image;
  // Compared as `alpha × 100` against `threshold × 255` below, so the percentage on the dial never
  // becomes a fraction and no rung lands a half-pixel either side of where it reads.
  const floor = threshold * FULLY_OPAQUE;

  // Asked before anything is allocated. A sheet whose every pixel is fully clear or fully solid is
  // already hardened however the dial stands, and that is the ordinary state of a sheet the passes
  // above produced — so the reader who leaves this on across a whole session pays a linear read
  // rather than a copy of the sheet.
  let partial = false;
  for (let offset = 3; offset < data.length; offset += CHANNELS_PER_PIXEL) {
    const alpha = data[offset] ?? 0;
    if (alpha !== FULLY_TRANSPARENT && alpha !== FULLY_OPAQUE) {
      partial = true;
      break;
    }
  }
  if (!partial) return image;

  const output = createImage(width, height);

  for (let offset = 0; offset < data.length; offset += CHANNELS_PER_PIXEL) {
    const alpha = data[offset + 3] ?? 0;
    // A pixel that was already clear stays clear rather than being measured: it carries no coverage
    // to compare, and `createImage` has already written the canonical zero for it.
    if (alpha === FULLY_TRANSPARENT) continue;
    // Below the threshold the pixel is not artwork, and the same zero stands.
    if (alpha * 100 < floor) continue;

    output.data[offset] = data[offset] ?? 0;
    output.data[offset + 1] = data[offset + 1] ?? 0;
    output.data[offset + 2] = data[offset + 2] ?? 0;
    output.data[offset + 3] = FULLY_OPAQUE;
  }

  return output;
}
