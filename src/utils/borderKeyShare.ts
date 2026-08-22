import type { Rgba } from '../types/quantiser.ts';
import { alphaAt, FULLY_TRANSPARENT, pixelOffset } from './imageData.ts';
import { keyBasis, keyDistanceSquared } from './keyDistance.ts';

/**
 * How much of the sheet's outer border is the key colour — the one cheap question that says whether
 * a sheet arrived with a field still on it.
 *
 * **Every reading on the Quantise tab is inert until the background comes out**, and that is the
 * gap this closes. Sprites are found in what is transparent, and the duplicate, symmetry and frame
 * readings are all readings *of* the sprites — so a sheet dropped with keying switched off reports
 * "nothing transparent to separate" four panels down, and the reader has to know that a checkbox
 * three panels up is why. Every prompt this app writes states a background key, so on the sheets it
 * is for the answer is nearly always yes.
 *
 * **The border, not the whole image**, and the reason is what a false positive would cost. A sheet
 * drawn *on* a magenta field has magenta at every edge; a sheet that merely uses magenta has it
 * inside the artwork, where a whole-image share would count it. The border is also the cheapest
 * possible pass — a few thousand pixels against sixteen million — so it can be answered on the main
 * thread as a sheet arrives, which is where the offer has to appear.
 *
 * **A sheet already carrying alpha reads zero**, whatever colour its border is. Transparent pixels
 * are excluded from the count entirely rather than treated as unmatched: a sheet this app wrote
 * earlier has an empty border, and offering to key a sheet that is already keyed is the offer a
 * reader would rightly ignore.
 *
 * The distance is the keying pass's own — `keyDistance.ts`, which measures against the plane the
 * key's variation actually lies in — so the share is measured the same way the pass that would act
 * on it measures. A second notion of "near the key" here would offer keying on sheets keying then
 * did nothing to.
 *
 * Pure, as everything in this directory is.
 */
export function borderKeyShare(image: ImageData, color: Rgba, tolerance: number): number {
  const { width, height, data } = image;
  if (width === 0 || height === 0) return 0;

  const basis = keyBasis(color);
  const radius = tolerance * tolerance;
  let counted = 0;
  let matched = 0;

  const read = (x: number, y: number): void => {
    const offset = pixelOffset(width, x, y);
    if (alphaAt(data, offset) === FULLY_TRANSPARENT) return;
    counted += 1;
    if (keyDistanceSquared(data, offset, basis) <= radius) matched += 1;
  };

  for (let x = 0; x < width; x += 1) {
    read(x, 0);
    // Guarded rather than assumed: a one-pixel-high sheet has one row, and reading it twice would
    // report a share of a border that is half imaginary.
    if (height > 1) read(x, height - 1);
  }
  // The corners belong to the rows above, so the columns run between them.
  for (let y = 1; y < height - 1; y += 1) {
    read(0, y);
    if (width > 1) read(width - 1, y);
  }

  return counted === 0 ? 0 : matched / counted;
}
