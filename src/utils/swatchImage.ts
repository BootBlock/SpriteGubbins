import type { Rgba } from '../types/quantiser.ts';
import { createImage, FULLY_OPAQUE, pixelOffset, writePixel } from './imageData.ts';

/**
 * A palette drawn as a picture: one square block per colour, in the palette’s own order.
 *
 * This is the form an engine importer reads. A pipeline that maps artwork onto a fixed set of
 * colours wants that set as a texture rather than as text, and the alternative was for a reader to
 * paint the colours into a small image by hand — which is how a green one step off the green in the
 * prompt gets into a whole character’s worth of pieces.
 *
 * **One row, left to right, never a grid.** The order is the palette’s and a reader of the file has
 * to be able to recover it: a row is a sequence and needs no rule about where it wraps. It also
 * makes the arithmetic an importer does trivial — the nth colour is at `n × block` across, whatever
 * the block size is.
 *
 * **Every block is fully opaque.** A palette says which colours exist; how much of one a pixel gets
 * is a statement about a silhouette, which belongs to the artwork. The entries arrive opaque from
 * `paletteEntriesFrom` in any case, and a swatch drawn with a partial alpha would come back from a
 * sampler as a colour nobody chose.
 *
 * **How wide it may get is the caller’s to decide**, and `PaletteDownload` decides it: the swatch is
 * offered only up to `MAX_PALETTE_ENTRIES` colours, which is what keeps this a 4,096-pixel strip at
 * worst rather than the 160,000-pixel one an unreduced sheet would produce.
 *
 * **A palette with no entries is not this function’s to handle**, and no guard is written for one.
 * A browser’s `ImageData` refuses a zero width outright, so the only thing a guard could return is a
 * picture of nothing under a name that says it is a palette. `PaletteDownload` renders no button
 * without colours to write, exactly as the lock button is held shut on a sheet with no colours in it.
 *
 * Pure, as everything in this directory is.
 */
export function swatchImage(entries: readonly Rgba[], blockPixels: number): ImageData {
  const image = createImage(entries.length * blockPixels, blockPixels);

  entries.forEach((entry, at) => {
    const opaque: Rgba = { ...entry, a: FULLY_OPAQUE };
    for (let y = 0; y < blockPixels; y += 1) {
      for (let x = 0; x < blockPixels; x += 1) {
        writePixel(image.data, pixelOffset(image.width, at * blockPixels + x, y), opaque);
      }
    }
  });

  return image;
}
