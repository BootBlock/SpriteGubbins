import { cropImage } from './cropImage.ts';
import { CHANNELS_PER_PIXEL, createImage, pixelOffset } from './imageData.ts';

/** Where one image of an {@link ImageStack} sits: always at the left edge, from `top` down. */
export interface StackedRegion {
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Several images as one, and where each of them went — see {@link stackImages}. */
export interface ImageStack {
  readonly image: ImageData;
  readonly regions: readonly StackedRegion[];
}

/**
 * Several images laid one above the next as a single image, so a pass that reads an image as a
 * whole reads all of them at once.
 *
 * **What it is for is the passes whose answer depends on everything they are shown**: a budget's
 * palette is chosen from every colour in its input, and the colour merge ranks colours by how often
 * they occur across it. Run over each image alone, each gets its own answer; run over the stack, all
 * of them share one, the way the regions of one sheet do. See `quantiseRegions`.
 *
 * **Every image starts at the first multiple of `pitch` past the one above it**, so at least one
 * fully transparent row always separates two of them, and the right of a narrower one is transparent
 * too. The passes this feeds treat a transparent neighbour exactly as they treat the edge of an
 * image — the palette's blend weighting, the colour merge and the fill cleanup all skip one — so
 * none of them can tell a region of the stack from the image it was. The pitch is for a dither: its
 * pattern is fixed to pixel position, so a region that starts on a multiple of the pattern's size is
 * dithered exactly as it would be on its own.
 *
 * One image comes back as itself, unpadded, so a caller with a single region pays nothing for the
 * stack and gets its result byte for byte.
 */
export function stackImages(images: readonly ImageData[], pitch: number): ImageStack {
  const only = images.length === 1 ? images[0] : undefined;
  if (only !== undefined) {
    return { image: only, regions: [{ top: 0, width: only.width, height: only.height }] };
  }
  if (images.length === 0) throw new Error('A stack needs at least one image to hold');

  const regions: StackedRegion[] = [];
  let width = 0;
  let height = 0;
  for (const image of images) {
    const top = regions.length === 0 ? 0 : (Math.floor(height / pitch) + 1) * pitch;
    regions.push({ top, width: image.width, height: image.height });
    width = Math.max(width, image.width);
    height = top + image.height;
  }

  const output = createImage(width, height);
  images.forEach((image, index) => {
    const top = regions[index]?.top ?? 0;
    for (let y = 0; y < image.height; y += 1) {
      const from = pixelOffset(image.width, 0, y);
      output.data.set(
        image.data.subarray(from, from + image.width * CHANNELS_PER_PIXEL),
        pixelOffset(width, 0, top + y),
      );
    }
  });
  return { image: output, regions };
}

/**
 * Each region of `image` cut back out, in the order they were stacked.
 *
 * `image` is the stack's own image or one a pass made from it, which is the same size — none of the
 * passes a stack is built for moves a pixel. A region that is the whole image comes back as the image
 * itself, which is the single-region case {@link stackImages} promised costs nothing.
 */
export function unstackImage(image: ImageData, stack: ImageStack): readonly ImageData[] {
  return stack.regions.map((region) =>
    region.top === 0 && region.width === image.width && region.height === image.height
      ? image
      : cropImage(image, 0, region.top, region.width, region.height),
  );
}
