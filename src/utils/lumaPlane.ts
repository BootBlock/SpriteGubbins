import { lumaOfChannels } from './lineVote.ts';

/**
 * The image as one number per pixel: how light it reads, scaled by how opaque it is.
 *
 * **Alpha multiplies rather than being ignored**, and on this app's sheets that is the difference
 * between a reading and a fiction. A keyed sheet is mostly transparent, and a transparent pixel's
 * colour channels are whatever happened to be under the key — the browser does not clear them — so
 * luma alone would report a field of structure that nothing on screen has. Weighting by alpha makes
 * a cleared pixel read as nothing, which is what it is.
 *
 * `Float64Array` rather than an integer plane, because both readers built on it accumulate squares
 * over the whole image: 255² times a pixel count this app admits 16.8 million of is past where a
 * 32-bit float still counts exactly.
 *
 * Its own file rather than a private helper inside either reader, because both of them want exactly
 * this plane — `ssim.ts` compares two of them and `proxyCrops.ts` differences one — and two
 * definitions of "how light is this pixel" is where the two quietly stop agreeing.
 */
export function lumaPlane(image: ImageData): Float64Array {
  const plane = new Float64Array(image.width * image.height);
  for (let index = 0; index < plane.length; index += 1) {
    const at = index * 4;
    const alpha = image.data[at + 3] ?? 0;
    plane[index] =
      (lumaOfChannels(image.data[at] ?? 0, image.data[at + 1] ?? 0, image.data[at + 2] ?? 0) * alpha) / 255;
  }
  return plane;
}
