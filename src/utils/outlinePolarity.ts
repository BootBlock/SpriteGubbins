import { alphaAt, FULLY_TRANSPARENT, pixelOffset } from './imageData.ts';
import { lumaOfChannels } from './lineVote.ts';

/**
 * Which way round the local detail sits: dark marks on a light ground, or light marks on a dark one.
 *
 * This is the *contrast-aware* half of the outline-expansion pass, and the half that stops it being
 * a blunt "make everything darker". A sprite sheet is not uniformly one polarity — a knight's black
 * contour against pale steel wants the dark side to grow, and the gold rim light two pixels away
 * wants the bright side to — so the decision has to be local, and it has to be made from something
 * more robust than a single pixel.
 *
 * Three local statistics of the lightness field answer it, two of them the reference's:
 *
 * - a **median** over a window twice the block wide, which is what the neighbourhood looks like once
 *   whatever is drawn on it is discounted. A mean would be dragged by the very contour being
 *   measured, which is the thing this must not do;
 * - the **minimum and maximum** over the block itself, which is how far the darkest and lightest
 *   marks in it stand from that ground.
 *
 * The score is the difference between those two reaches, `(median − min) − (max − median)`.
 * **Positive means the dark side grows**: the block's darkest mark stands further from its ground
 * than its lightest one does, so the dark mark is what is drawn on it. Nothing weights the two
 * reaches against each other, because there is nothing to weight — they are the same quantity
 * measured in opposite directions.
 *
 * **The reference's third statistic is deliberately absent, and dropping it is what makes the pass
 * work on this app's input.** PixelOE adds a term for the ground's own lightness —
 * `(median − ½) × 10` against the reaches' `× 3` — on the photographic prior that a light
 * neighbourhood is drawn on in dark and a dark one in light. It is three times the weight of the
 * measurement it is a prior for, and a sprite sheet routinely breaks it: dark armour outlined in
 * black is dark-on-dark, and the prior votes to grow the highlights and erase the contour. Measured
 * on the reference sheet at a grid of 6, the term put **96%** of the artwork on the bright side, and
 * the pass it was steering *lowered* thin-line survival from 29.5% to 10.9% — it was deleting the
 * linework it exists to rescue. Reweighting only moves the figure smoothly (10.9% at the reference's
 * own 10:3, 12.6% at its 9:4, 19.1% at 5:5, 40.5% at 2:8, 52.5% with the term gone), so the term is
 * removed outright rather than tuned to a number nobody could defend. What is left has no free
 * parameter at all.
 *
 * **Lightness here is the app's own Rec. 601 luma**, `lumaOfChannels`, and not OKLab. The two answer
 * different questions and the quantiser already keeps them apart: OKLab is where colour *distances*
 * are measured, because a tolerance has to mean one thing across the gamut, and luma is where the
 * tab asks *how light does this read* — it is what `LINE_INK_CEILING` is stated in, what the line
 * rescue judges a contour by, and what the ink-weighted reading blends toward. This pass is asking
 * the second question, so it uses the second answer rather than introducing a third.
 *
 * **Sampled on a lattice, one point per block, and interpolated between.** The reference oversamples
 * at half the block and folds the overlapping windows back together; the lattice here is one point
 * per block with the score bilinearly interpolated off it, which is the same smoothing at a quarter
 * of the cost — and the cost is not academic, since the median window is four blocks' worth of
 * pixels at every point and this runs on a sheet of up to 16.8 million of them inside a browser.
 * Interpolating also means the field is never materialised per pixel: at the ceiling a `Float32` per
 * pixel would be another sixty-seven megabytes, where the lattice is that divided by the block
 * squared.
 *
 * **Fully transparent pixels take no part in any of the three statistics.** They are the keyed
 * field: they carry whatever bytes sat under them, none of it visible, and a window that counted
 * them would report the artwork as sitting on a ground it does not sit on. A lattice point whose
 * whole window is empty scores `NaN` and is skipped by the interpolation — which can never leave a
 * pixel with no answer, because the window of the lattice point nearest any *opaque* pixel reaches
 * a block in each direction and therefore contains that pixel itself.
 *
 * Pure.
 */
export interface PolarityField {
  /**
   * One score per lattice point, row-major, or `NaN` where the point's window held nothing opaque.
   *
   * In whole luma steps, and positive where the dark side should grow. The magnitude carries no
   * meaning downstream — the pass thresholds it — and is carried as a number only because the sign
   * of an *interpolated* value depends on the values interpolated, not on their signs.
   */
  readonly scores: Float32Array;
  readonly columns: number;
  readonly rows: number;
  /** The lattice spacing in image pixels, which is the caller's block. */
  readonly block: number;
  /** Where the first lattice point's centre sits, in image pixels — the block's own middle. */
  readonly origin: number;
}

/**
 * Measure the field over `image`, one lattice point per `block × block` block.
 *
 * `block` is the pixel grid the reduction is about to apply. It is derived rather than dialled: it
 * is the size of the features this pass exists to protect, and a second number for it could
 * disagree with the one the mesh is walking.
 */
export function outlinePolarity(image: ImageData, block: number): PolarityField {
  const { width, height, data } = image;
  const columns = Math.ceil(width / block);
  const rows = Math.ceil(height / block);
  const scores = new Float32Array(columns * rows);
  const origin = (block - 1) >> 1;

  // The median is read out of a 256-bin tally rather than a sorted list: the window holds four
  // blocks' worth of pixels, and counting them is linear where sorting them is not. The occupied
  // span is tracked so the read-out walks only the tones the window actually holds, which on flat
  // art is a small fraction of the range.
  const tally = new Int32Array(256);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      scores[row * columns + column] = scoreBlock(data, width, height, block, origin, column, row, tally);
    }
  }

  return { scores, columns, rows, block, origin };
}

/**
 * The score at an image pixel, bilinearly interpolated from the four lattice points around it.
 *
 * Lattice points that scored `NaN` are dropped and the remaining weights renormalised, rather than
 * poisoning the result — a block of empty margin beside a sprite must not decide the sprite's
 * polarity. All four being absent would mean the pixel has no opaque lattice point within a block
 * in any direction, which an opaque pixel cannot be; the caller never asks about a transparent one.
 */
export function polarityAt(field: PolarityField, x: number, y: number): number {
  const { scores, columns, rows, block, origin } = field;

  const columnAt = (x - origin) / block;
  const rowAt = (y - origin) / block;
  const leftColumn = clamp(Math.floor(columnAt), 0, columns - 1);
  const topRow = clamp(Math.floor(rowAt), 0, rows - 1);
  const rightColumn = Math.min(leftColumn + 1, columns - 1);
  const bottomRow = Math.min(topRow + 1, rows - 1);
  const acrossWeight = clamp(columnAt - leftColumn, 0, 1);
  const downWeight = clamp(rowAt - topRow, 0, 1);

  let total = 0;
  let weight = 0;
  for (const [column, across] of [
    [leftColumn, 1 - acrossWeight],
    [rightColumn, acrossWeight],
  ] as const) {
    for (const [row, down] of [
      [topRow, 1 - downWeight],
      [bottomRow, downWeight],
    ] as const) {
      const corner = scores[row * columns + column];
      if (corner === undefined || Number.isNaN(corner)) continue;
      total += corner * across * down;
      weight += across * down;
    }
  }

  return weight === 0 ? 0 : total / weight;
}

/**
 * One lattice point: the median over the wide window, and the extremes over the block inside it.
 *
 * Both windows are walked together, because the wide one contains the narrow one and walking twice
 * would read every pixel of the block a second time to learn nothing new. Where the block itself
 * holds nothing opaque but the wide window does, the wide window's own extremes stand in — the
 * point still has a ground to measure against, and dropping it would punch a hole in the lattice
 * beside every sprite's edge.
 */
function scoreBlock(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  block: number,
  origin: number,
  column: number,
  row: number,
  tally: Int32Array,
): number {
  const centreX = column * block + origin;
  const centreY = row * block + origin;
  const fromX = Math.max(centreX - block, 0);
  const toX = Math.min(centreX + block, width - 1);
  const fromY = Math.max(centreY - block, 0);
  const toY = Math.min(centreY + block, height - 1);
  const blockFromX = column * block;
  const blockToX = Math.min(blockFromX + block - 1, width - 1);
  const blockFromY = row * block;
  const blockToY = Math.min(blockFromY + block - 1, height - 1);

  let counted = 0;
  let lowestSeen = 256;
  let highestSeen = -1;
  let blockLowest = 256;
  let blockHighest = -1;

  for (let y = fromY; y <= toY; y += 1) {
    const insideRows = y >= blockFromY && y <= blockToY;
    for (let x = fromX; x <= toX; x += 1) {
      const offset = pixelOffset(width, x, y);
      if (alphaAt(data, offset) === FULLY_TRANSPARENT) continue;
      const luma = lumaOfChannels(data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0);
      tally[luma] = (tally[luma] ?? 0) + 1;
      counted += 1;
      if (luma < lowestSeen) lowestSeen = luma;
      if (luma > highestSeen) highestSeen = luma;
      if (insideRows && x >= blockFromX && x <= blockToX) {
        if (luma < blockLowest) blockLowest = luma;
        if (luma > blockHighest) blockHighest = luma;
      }
    }
  }

  if (counted === 0) return Number.NaN;

  // The lower median: with an even count the earlier of the two middle samples, which is what the
  // reference's own median takes and is a value the window actually holds rather than an average
  // of two it does.
  const wanted = (counted - 1) >> 1;
  let seen = 0;
  let median = lowestSeen;
  for (let luma = lowestSeen; luma <= highestSeen; luma += 1) {
    seen += tally[luma] ?? 0;
    if (seen > wanted) {
      median = luma;
      break;
    }
  }
  tally.fill(0, lowestSeen, highestSeen + 1);

  const lowest = blockHighest < 0 ? lowestSeen : blockLowest;
  const highest = blockHighest < 0 ? highestSeen : blockHighest;

  // How far each side of the local contrast reaches away from the ground, in luma steps. Left
  // unnormalised: the only thing done with this is a comparison against zero and an interpolation
  // between neighbours, and dividing every term by 255 changes neither.
  return median - lowest - (highest - median);
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}
