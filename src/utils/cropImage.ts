import { createImage, pixelOffset } from './imageData.ts';

/**
 * A rectangle of the image, as an image of its own.
 *
 * The rectangle is taken as given and clipped to nothing: a caller asking for pixels outside the
 * image has computed a rectangle wrongly, and silently returning a smaller picture than was asked
 * for would hand that mistake on to whatever compares the result against something else. The
 * auto-tune sweep does exactly such a comparison, and a crop one row short would fail it as a
 * difference in the artwork.
 *
 * Beside `upscaleNearest` rather than inside either caller, because it is the same kind of thing:
 * a plain rearrangement of pixels that invents no colour, wanted by the crop chooser and by the
 * sweep that trims two images to a common rectangle.
 */
export function cropImage(
  image: ImageData,
  left: number,
  top: number,
  width: number,
  height: number,
): ImageData {
  if (
    width <= 0 ||
    height <= 0 ||
    left < 0 ||
    top < 0 ||
    left + width > image.width ||
    top + height > image.height
  ) {
    throw new Error('A crop must be a rectangle of at least one pixel, lying inside the image');
  }

  const output = createImage(width, height);
  // A row at a time rather than a pixel at a time: a row of the source is contiguous and so is a row
  // of the crop, so each one is a single `set` rather than four reads and four writes per pixel.
  for (let y = 0; y < height; y += 1) {
    const from = pixelOffset(image.width, left, top + y);
    output.data.set(image.data.subarray(from, from + width * 4), pixelOffset(width, 0, y));
  }
  return output;
}
