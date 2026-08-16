import { CHANNELS_PER_PIXEL } from './imageData.ts';

/**
 * How much an image changes at each column and row, as summed magnitude.
 *
 * The one measurement every soft-edged reading is answered from, which is why it has a module of
 * its own: `estimatePixelGrid` reads it for the *period* the change repeats at, `boundaryClusters`
 * for *which positions* are boundaries — feeding `boundaryMesh` and `estimateMeshPeriod` — and
 * `bestPhase` for where a regular lattice best sits when no boundaries anchor a mesh. All of them
 * walk the same totals, and a second implementation of the walk would eventually disagree with the
 * first about the same sheet.
 *
 * It differs from `edgeLattice` next to the exact detector in the one way that matters: that asks
 * *whether* two neighbouring pixels differ, which a softened ramp answers "yes" to three times
 * over, while this asks *by how much*, which the same ramp divides between three positions without
 * inventing any. So the whole of a softened boundary still totals the step it was before it was
 * softened, and a lattice can be scored on magnitude the way a crisp one is scored on counts.
 *
 * Magnitude is the L1 distance across all four channels. Alpha is one of them for the reason it is
 * part of the exact comparison too: a silhouette edge against transparency is a change like any
 * other, and on a keyed sheet it is often the only one left.
 *
 * `Float64Array` rather than the `Uint32Array` a *count* fits in, and the reason is the **shape** a
 * sheet is allowed to be rather than its size. `MAX_IMAGE_PIXELS` bounds an image's area, not either
 * of its sides — `useImageFile` admits anything with `width × height` inside it — so a 2 × 8,388,608
 * sheet is a legal input, and its one interior column sums 8.4 million steps of up to 1020 apiece:
 * about 8.6 × 10⁹, where a `Uint32Array` element stops at 4.29 × 10⁹. A square sheet never comes
 * close, which is exactly why the bound has to be read off the cap that exists rather than the
 * proportions one imagines.
 */
export interface StepProfile {
  /** `columns[x]` — how much pixel `x` differs from pixel `x - 1`, down the whole column. Index 0 is unused. */
  readonly columns: Float64Array;
  /** `rows[y]` — how much row `y` differs from row `y - 1`, across the whole row. Index 0 is unused. */
  readonly rows: Float64Array;
  /** Every step in the image, both directions together. */
  readonly total: number;
}

/**
 * One pass over the image, totalling the step to each pixel's left and upper neighbour by the column
 * and row it falls on.
 *
 * Reads the four channels directly rather than through `packedColorAt`, which the exact detector
 * uses: that packs a colour so two of them can be compared for equality in one integer, and this
 * needs the channels apart to subtract them.
 */
export function stepProfile(image: ImageData): StepProfile {
  const { width, height, data } = image;
  const columns = new Float64Array(width);
  const rows = new Float64Array(height);
  let total = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * CHANNELS_PER_PIXEL;

      if (x > 0) {
        const step = channelDistance(data, offset, offset - CHANNELS_PER_PIXEL);
        columns[x] = (columns[x] ?? 0) + step;
        total += step;
      }
      if (y > 0) {
        const step = channelDistance(data, offset, offset - width * CHANNELS_PER_PIXEL);
        rows[y] = (rows[y] ?? 0) + step;
        total += step;
      }
    }
  }

  return { columns, rows, total };
}

/** How far apart two pixels are, summed across the four channels. */
function channelDistance(data: Uint8ClampedArray, offset: number, other: number): number {
  let distance = 0;
  for (let channel = 0; channel < CHANNELS_PER_PIXEL; channel += 1) {
    distance += Math.abs((data[offset + channel] ?? 0) - (data[other + channel] ?? 0));
  }
  return distance;
}
