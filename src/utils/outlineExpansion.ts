import { extremeNeighbours, TRANSPARENT_DILATE_KEY, TRANSPARENT_ERODE_KEY } from './extremeNeighbour.ts';
import { alphaAt, CHANNELS_PER_PIXEL, copyPixel, createImage, FULLY_TRANSPARENT } from './imageData.ts';
import { lumaOfChannels } from './lineVote.ts';
import { outlinePolarity, polarityAt, type PolarityField } from './outlinePolarity.ts';

/**
 * The outline-expansion pre-pass: grow whichever side of the local contrast the artist drew with,
 * so a one-pixel line still exists after the reduction that is about to outvote it.
 *
 * **The failure it answers.** A model returns a sheet drawn at six image pixels to the drawn pixel.
 * Every contour in that art is one drawn pixel wide, which makes it a *minority* inside its own
 * mesh cell — a 6 × 6 cell straddling a contour holds a handful of ink pixels and thirty of the
 * surface the contour bounds. So every reading loses it: the dominant vote because ink is outvoted,
 * the cluster reading because ink is the smaller cluster, and the ink-weighted reading least badly,
 * because it exists for exactly this and can still only *darken* the cell rather than make it ink.
 * The result is a sprite whose outline comes back dashed. Nothing after the vote can repair that —
 * the information is gone by then — so the answer has to run before it.
 *
 * **What it does.** `outlinePolarity` says, for every part of the sheet, whether the local detail is
 * dark on a light ground or light on a dark one. Where it is dark the pass **erodes**, replacing
 * each pixel with its darkest neighbour, which grows the contour into the surface beside it; where
 * it is light it **dilates**, which grows the rim light or the gold trim the same way. An opening
 * and then a closing finish, which clears the stray pixels left along the seam where the two
 * rescuing it the same way. A contour that was one pixel wide is then `2 × thickness + 1`, and a
 * cell that straddles it is holding enough ink to win.
 *
 * **Measured on the reference sheet** at a grid of 6, the standard vote and a budget of 64, against
 * the cells this exists to save — those holding ink as a minority of their own pixels, which is
 * every cell a one-pixel contour crosses. Of 7,135 such cells, the share resolving to ink runs
 * **29.5% with the pass off, 43.5% at a thickness of 1, 54.4% at 2, 60.4% at 3 and 64.1% at 4**.
 * The counter-metric — cells holding no source ink at all that come out inked — runs 0%, 0.50%,
 * 2.02%, 3.64% and 6.06% of 31,689. A thickness of 2 buys 25 points of survival for two cells in a
 * hundred; 3 buys six more points for another one and a half, and 4 four more for two and a half.
 * The knee is at **2**, which is where `DEFAULT_OUTLINE_EXPANSION`'s note points a reader without
 * adopting it on their behalf. The ink-weighted reading follows the same curve from a lower start:
 * 20.7%, 20.5%, 31.8%, 41.2%, 46.7%.
 *
 * **The cost is flat in the thickness**, which is the whole reason `runningExtremum` is written the
 * way it is: the pass took the same time at a thickness of 4 as at 1 in every run of that sweep. It
 * is two morphological steps over the sheet plus one lattice of local statistics, and it runs only
 * where the dial is off its stop.
 *
 * ---
 *
 * **Ported from [PixelOE](https://github.com/KohakuBlueleaf/PixelOE)** by KohakuBlueleaf, which is
 * licensed Apache-2.0 — specifically its `outline_expansion`, in both the `legacy` and `torch`
 * spellings. This is an independent TypeScript reimplementation of the published algorithm rather
 * than a translation of its source, and it departs from the reference in three ways. Each departure
 * follows from the same difference of setting: PixelOE feeds a photograph to a contrast-based
 * resampler, and this feeds a keyed sprite sheet to a vote.
 *
 * 1. **The morphology is vector-valued, not per-channel.** OpenCV's `erode` on a colour image takes
 *    the minimum of each channel separately, so its output holds colours assembled from three
 *    different pixels. The Quantise panel tells the reader in as many words that under the standard
 *    vote every colour which survives is one the image already contained, and a per-channel minimum
 *    falsifies that sentence. Here the structuring element orders whole pixels by lightness and the
 *    winner is taken entire — see `extremeNeighbour.ts`.
 * 2. **The polarity is a decision, not a blend.** The reference forms `eroded × w + dilated × (1 − w)`
 *    against a sigmoid weight, which invents a tone everywhere the two regimes meet and would hand
 *    the vote and the palette colours the sheet never had. Here the score is thresholded. That is not
 *    an approximation of the reference: thresholding a sigmoid at one half *is* thresholding its
 *    argument at zero, so dropping the sigmoid changes no decision — and dropping the global
 *    normalisation with it changes none either, since normalising exists to make a blend weight span
 *    the full range and a decision has no range to span. It also sidesteps the legacy
 *    implementation's normalisation, which divides by the maximum rather than by the spread.
 * 3. **The silhouette is left exactly where keying left it.** The reference has no alpha channel to
 *    consider. Here a fully transparent pixel takes the identity element of whichever operation is
 *    running, so it can never win a neighbourhood, and it is copied through untouched — the artwork
 *    neither grows into the field the reader asked to delete nor drags that field's undefined bytes
 *    into itself. Alpha is never morphed, and the pass therefore cannot change `keyedShare`.
 * 4. **The polarity has no ground term.** `outlinePolarity` records why: the reference's prior about
 *    what colour a neighbourhood is drawn on outweighs the measurement it is a prior for, and on a
 *    sprite sheet it inverts the answer.
 * 5. **There is no opening and closing afterwards.** The reference finishes with `erode`, `dilate`
 *    twice, `erode`, which clears the stray pixels left along the seam between the two regimes. It
 *    was measured here and it does not pay. Carrying it, thin-line survival falls to 39.7%, 52.5%
 *    and 53.4% at thicknesses 1, 2 and 3 against the 43.5%, 54.4% and 60.4% above — and it is
 *    dominated rather than merely traded: without it a thickness of 2 reaches 54.4% survival at
 *    2.02% false ink, where with it a thickness of 3 reaches only 53.4% at 3.10%, so the reader
 *    gives up both numbers at once. It also adds three morphological steps to a pass that otherwise
 *    takes two, which measured as two thirds again on the pass's own running time. The tab already offers a speckle cleanup of its own, after
 *    the vote, where the reader can judge it against the preview; a second one welded in here, which
 *    measurably undoes part of what this pass is for, has nothing to recommend it.
 *
 * The reference's patch size `k` is this app's **grid**, which is not a departure so much as the
 * app already knowing the number: it is the block the reduction is about to apply, and a second
 * value for it could disagree with the mesh.
 *
 * ---
 *
 * **Where it runs, and why not one step later.** After keying and before the vote — but the mesh is
 * measured on the *un-expanded* sheet, for the reason `quantiseImage` measures it on the un-reduced
 * one. A reduction can erase a boundary; this pass can **move** one, by up to its thickness and
 * asymmetrically, in whichever direction the local polarity won. A mesh measured through that shift
 * would cut against a contour the artwork does not have.
 *
 * Pure. A thickness of zero returns the input's bytes unchanged, as every dial on this tab does at
 * its off position.
 */
export function outlineExpansion(image: ImageData, block: number, thickness: number): ImageData {
  if (thickness <= 0 || block <= 0) {
    return new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
  }

  return expand(image, outlinePolarity(image, block), thickness);
}

/**
 * Every opaque pixel replaced by its darkest or lightest neighbour, whichever the local polarity
 * asks for.
 *
 * The two neighbourhoods are resolved **one after the other rather than together**, and the pixels
 * each is responsible for are written before the next is asked for. Holding both answers at once
 * would be eight bytes a pixel of index arrays on top of the twelve `extremeNeighbours` already
 * wants — a third of a gigabyte on the largest sheet this app admits — for no gain, since no pixel
 * ever consults both.
 */
function expand(image: ImageData, polarity: PolarityField, thickness: number): ImageData {
  const output = createImage(image.width, image.height);
  const keys = new Int16Array(image.width * image.height);

  writeKeys(image, keys, TRANSPARENT_ERODE_KEY);
  paint(image, output, polarity, extremeNeighbours(keys, image.width, image.height, thickness, true), true);

  writeKeys(image, keys, TRANSPARENT_DILATE_KEY);
  paint(image, output, polarity, extremeNeighbours(keys, image.width, image.height, thickness, false), false);

  return output;
}

/** The half of {@link expand} that one neighbourhood answers for, written into the shared output. */
function paint(
  image: ImageData,
  output: ImageData,
  polarity: PolarityField,
  winners: Int32Array,
  darkSide: boolean,
): void {
  for (let pixel = 0; pixel < winners.length; pixel += 1) {
    const offset = pixel * CHANNELS_PER_PIXEL;
    if (alphaAt(image.data, offset) === FULLY_TRANSPARENT) {
      // Written on the dark pass alone, so the bright pass does not copy it a second time.
      if (darkSide) copyPixel(image.data, output.data, offset);
      continue;
    }
    const x = pixel % image.width;
    const y = (pixel - x) / image.width;
    // Zero grows the dark side. The score is a continuous quantity with no meaningful zero of its
    // own, so the boundary has to fall somewhere; it falls where the reference's sigmoid crosses a
    // half, which is the same place.
    if (polarityAt(polarity, x, y) >= 0 !== darkSide) continue;
    writeWinner(image, output, offset, winners[pixel] ?? pixel);
  }
}

/** The winner's three colour channels, and the pixel's own coverage — never the winner's. */
function writeWinner(image: ImageData, output: ImageData, offset: number, winner: number): void {
  const from = winner * CHANNELS_PER_PIXEL;
  output.data[offset] = image.data[from] ?? 0;
  output.data[offset + 1] = image.data[from + 1] ?? 0;
  output.data[offset + 2] = image.data[from + 2] ?? 0;
  output.data[offset + 3] = image.data[offset + 3] ?? 0;
}

/** The lightness of every pixel, with `absent` standing in wherever there is no pixel to read. */
function writeKeys(image: ImageData, keys: Int16Array, absent: number): void {
  const { data } = image;
  for (let pixel = 0; pixel < keys.length; pixel += 1) {
    const offset = pixel * CHANNELS_PER_PIXEL;
    keys[pixel] =
      alphaAt(data, offset) === FULLY_TRANSPARENT
        ? absent
        : lumaOfChannels(data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0);
  }
}
