import { createImage, packedColorAt, pixelOffset, writePackedColor } from './imageData.ts';

/**
 * The image with each pixel drawn as a `scale × scale` block of itself — nearest neighbour, the one
 * magnification pixel art tolerates, because it invents no colour and moves no edge.
 *
 * Two callers, one on each side of the app's boundary. The download toolbar magnifies a quantised
 * result so a 16-pixel sprite can be *seen* in the file it ships in — the saved sheet stays exact,
 * since a block of identical pixels downsamples back to the pixel it came from. And the pixel-reader
 * tests build their fixtures with it, because "art drawn at `g`" *is* an image whose every pixel is
 * a `g × g` block — what a model returns when it draws pixel art at 16 × 16 and hands back a
 * 128 × 128 sheet.
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
