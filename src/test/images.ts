import type { Rgba } from '../types/quantiser.ts';
import { createImage, pixelOffset, readPixel, writePixel } from '../utils/imageData.ts';

/**
 * Building `ImageData` for the quantiser's tests.
 *
 * Test-only, and here rather than in `src/utils/` because nothing in the app constructs an image
 * from a formula — the app's images come from a file the user dropped. Three test files need the
 * same three builders, which is one implementation rather than three subtly different ones.
 *
 * No canvas is involved: `ImageData` is a width, a height and a `Uint8ClampedArray`, all three of
 * which happy-dom provides, so the pure pipeline is testable without a rendering surface.
 */

/** An image whose every pixel is a function of its position. */
export function imageFrom(width: number, height: number, pixel: (x: number, y: number) => Rgba): ImageData {
  const image = createImage(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      writePixel(image.data, pixelOffset(width, x, y), pixel(x, y));
    }
  }
  return image;
}

/**
 * The image with each pixel drawn as a `scale × scale` block — what a model returns when it draws
 * pixel art at 16 × 16 and hands back a 128 × 128 sheet.
 */
export function upscale(image: ImageData, scale: number): ImageData {
  return imageFrom(image.width * scale, image.height * scale, (x, y) =>
    readPixel(image.data, pixelOffset(image.width, Math.floor(x / scale), Math.floor(y / scale))),
  );
}

/** Every channel as a plain array, so two images can be compared byte for byte by `toEqual`. */
export function channels(image: ImageData): number[] {
  return [...image.data];
}
