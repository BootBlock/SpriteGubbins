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
 * it is light it **dilates**, which rescues the rim light or the gold trim the same way. A contour
 * that was one pixel wide is then `2 × thickness + 1` wide, and a cell that straddles it is holding
 * enough ink to win the vote it was losing.
 *
 * **Measured on the reference sheet** (`test_sprites/armour.png`, grid 6, the standard vote, a
 * budget of 64, no keying, every other dial at its opening position), across the 43,681 cells its
 * mesh lays down. **Ink** here is a pixel whose luma is below `LINE_INK_CEILING`, the darkest
 * quarter, and every share a cell is sorted by is read off the sheet **as it arrived** — before the
 * pass runs, because the whole question is what the pass does to cells the artist drew a contour
 * through. A cell "resolves to ink" when the one pixel it became is ink by that same test. Two
 * figures, because either alone picks the wrong setting:
 *
 * - **survival** — of the 6,433 cells holding ink as a *minority* of their own pixels, which is
 *   every cell a one-pixel contour crosses, the share that resolve to ink. It runs **29.6% with the
 *   pass off, then 42.7%, 54.1%, 61.4% and 65.4%** across thicknesses 1 to 4;
 * - **surface loss** — of the 33,575 cells the source says are under a fifth ink, which is a stray
 *   fringe rather than a contour crossing, the share that come out ink anyway. It runs **0.39%, then
 *   2.70%, 5.12%, 7.81% and 10.51%**. Against it, the sheet's own ink share is 14.2% of its opaque
 *   pixels and the result's runs 16.5, 17.2, 18.9, 20.8 and 22.9%.
 *
 * The first step buys 13.1 points of survival for 2.3 of surface, and every step after it buys less
 * for the same: 11.4 for 2.4, then 7.3 for 2.7, then 4.0 for 2.7. So the knee is at **1**, and the
 * range runs to 4 because a sheet whose contours are thinner or whose scale is coarser will want
 * more. **The ink-weighted reading climbs the same ladder from far lower down**, and that is the
 * argument for the pass rather than against it: 8.4% survival with the pass off, then 18.0%, 32.5%,
 * 40.5% and 48.5%, against 0.00%, 0.47%, 2.32%, 3.97% and 6.08% surface, and a result ink share of
 * 10.2, 9.8, 12.8, 14.3 and 16.1%. A vote that exists to keep outlines still loses nine cells in ten
 * of them until this pass runs, because it can only *darken* a cell ink is losing rather than hand
 * it the cell — and each of its steps buys survival more cheaply than the standard vote's does, 20
 * points per point of surface at the first step against the standard vote's 6.
 *
 * **The second figure is here because the first one on its own chose wrongly.** The obvious cheap
 * reading of surface loss is to count only the 31,268 cells with *no* source ink at all, and that
 * one puts the cost of a thickness of 2 at 1.73% where the under-a-fifth set puts it at 5.12% —
 * three times smaller, and small enough to look like a free step. Driving the tab in a browser at 2
 * showed helmets whose interiors had gone blotchy, the gold and green masses broken up by dark that
 * had grown along every seam between them. Almost every cell on a sheet like this holds a pixel or
 * two of dark, so "no ink at all" was blind to exactly the failure that matters. Any recalibration
 * of this dial needs both numbers and a look at the preview.
 *
 * Every ladder in the three paragraphs above is re-derived by
 * `tests/quantiser-docblock-figures.test.ts`, the no-ink reading included, and the per-step figures
 * are subtractions of them. It fails when a pass upstream of this one moves one — so a
 * recalibration is told to come back here rather than leaving the ladder stale. Point 5 below is
 * the exception, and cannot be covered: its *carried* half is a variant this app does not ship, so
 * it says how that half was reconstructed instead. (Its other half is this ladder's own t1, t2 and
 * t3.)
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
 * than a translation of its source, and it departs from the reference in five ways — the first three
 * by argument, the last two because they were measured and the reference's choice lost. All five
 * follow from one difference of setting: PixelOE feeds a photograph to a contrast-based resampler,
 * and this feeds a keyed sprite sheet to a vote.
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
 * 5. **There is no opening and closing afterwards.** The reference finishes with `erode`, `dilate`,
 *    `dilate`, `erode` — an opening then a closing, which clears the stray pixels left along the
 *    seam between the two regimes, and which collapses into three passes because the two dilations
 *    run as one at twice the radius. Measured here — the tail reconstructed as `erode(t)`,
 *    `dilate(2t)`, `erode(t)` over this pass's own output, on the two populations the docblock above
 *    defines — it does not earn them. Carried, the pass scores 40.6% / 44.7% / 52.5% survival at
 *    2.34% / 4.21% / 6.92% surface loss for thicknesses 1, 2 and 3, against 42.7% / 54.1% / 61.4% at
 *    2.70% / 5.12% / 7.81% without it. It is buying a little less surface for rather less survival.
 *    **At a thickness of 1 that is an even trade** — interpolated to the same surface loss, dropping
 *    it is worth a tenth of a point. From 2 upwards it is not close: at the carried pass's own 4.21%
 *    of surface, dropping it buys 49.8% survival against 44.7%, and at 6.92% it buys 59.0% against
 *    52.5%. What settles the low end, where the trade is even, is the other column: those three
 *    extra passes measured **two thirds again** on the pass's own running time, and at the low
 *    thicknesses anyone will actually use they buy nothing. The tab already offers a speckle cleanup
 *    after the vote, where the reader can judge it against the preview and turn it off; one welded
 *    in here can only be paid for.
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
