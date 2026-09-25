import { createImage, packedColorAt, pixelOffset, writePackedColor } from './imageData.ts';

/**
 * The image with each pixel drawn as a `scale × scale` block of itself — nearest neighbour, the one
 * magnification pixel art tolerates, because it invents no colour and moves no edge.
 *
 * One caller in the app, and the tests. The encoder's worker magnifies a quantised result so a
 * 16-pixel sprite can be *seen* in the file it ships in — the saved sheet stays exact, since a block
 * of identical pixels downsamples back to the pixel it came from, and it happens there rather than
 * at the button because this loop is over the *output* and so is the expensive half of a magnified
 * download. And the pixel-reader tests build their fixtures with it, because "art drawn at `g`"
 * *is* an image whose every pixel is a `g × g` block — what a model returns when it draws pixel art
 * at 16 × 16 and hands back a 128 × 128 sheet.
 *
 * **It inverts the quantiser's reduction only over a lattice from the corner.** Block `i` lands at
 * `i × scale`, which is where a mesh cell begins only on a lattice that starts at the sheet's corner
 * and never drifts — the mesh the download's round trip uses, and not one `boundaryMesh` promises.
 * Putting a result back over the source it was read from is `upscaleOverMesh` in `gridAlignment.ts`,
 * which walks the mesh the reduction walked.
 *
 * `scale` is a whole number of 1 or more — the callers' ladders offer nothing else, and a fractional
 * scale is a resample, which is the thing this exists to not be. Always a new image, as every
 * transform in `src/utils/` returns: at 1 it is a copy, which costs nothing worth a second contract.
 */
export function upscaleNearest(image: ImageData, scale: number): ImageData {
  const width = image.width * scale;
  const height = image.height * scale;
  const output = createImage(width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = packedColorAt(
        image.data,
        pixelOffset(image.width, Math.floor(x / scale), Math.floor(y / scale)),
      );
      writePackedColor(output.data, pixelOffset(width, x, y), color);
    }
  }

  return output;
}
