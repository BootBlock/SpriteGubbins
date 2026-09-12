import { CHANNELS_PER_PIXEL } from './imageData.ts';

/**
 * How much an image changes at each column and row, as summed magnitude — and the evidence of a
 * boundary the line reader weighs each position by.
 *
 * The one measurement every soft-edged reading is answered from, which is why it has a module of
 * its own: `estimatePixelGrid` reads the magnitude for the *period* the change repeats at,
 * `estimateProfilePeriod` correlates it against a shifted copy of itself for the *distance* the
 * change repeats over, and `boundaryClusters` reads the evidence for *which positions* are boundaries
 * — feeding `boundaryMesh`, `estimateMeshPeriod`, and `bestPhase` for where a regular lattice best
 * sits when no boundaries anchor a mesh. All of them walk the same pass, and a second implementation
 * of the walk would eventually disagree with the first about the same sheet.
 *
 * It differs from `edgeLattice`, which the exact question is asked of, in the one way that matters:
 * that asks *whether* two neighbouring pixels differ, which a softened ramp answers “yes” to three
 * times over, while this asks *by how much*, which the same ramp divides between three positions
 * without inventing any. So the whole of a softened boundary still totals the step it was before it
 * was softened, and a lattice can be scored on magnitude the way a crisp one is scored on counts.
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
 *
 * **It carries the image's dimensions**, one per axis, in the lengths of its arrays — which is why
 * the three estimated readings in `measureSheetScale` take a profile rather than an image and still
 * know how large a scale the sheet could hold. Taking both would let a caller hand one reading a
 * profile of some *other* image, and there is nothing in either value that would catch it; taking
 * the profile alone makes that pairing unrepresentable, and the survey then walks the sheet once for
 * all three.
 */
export interface StepProfile {
  /**
   * `columns[x]` — how much pixel `x` differs from pixel `x - 1`, down the whole column. Index 0 is
   * unused, and the length is the image's width.
   */
  readonly columns: Float64Array;
  /**
   * `rows[y]` — how much row `y` differs from row `y - 1`, across the whole row. Index 0 is unused,
   * and the length is the image's height.
   */
  readonly rows: Float64Array;
  /** The evidence of a boundary at each column, read along the image's rows. */
  readonly columnEvidence: BoundaryEvidence;
  /** The evidence of a boundary at each row, read down the image's columns. */
  readonly rowEvidence: BoundaryEvidence;
  /** Every step in the image, both directions together. */
  readonly total: number;
}

/**
 * What one axis offers the boundary line reader: a figure for each position, and which reading of the
 * axis produced it. Index 0 of `values` is unused, and its length is the axis's.
 *
 * The reading travels with the figures because the reader treats the two differently, and a figure
 * without it would be free to be read the wrong way: a run of neighbouring candidates on an axis read
 * by `MAGNITUDE` is the ramp a resampler spread one boundary across, and on an axis read by
 * `TRANSITIONS` it can be two changes a pixel apart — see `boundaryClusters`.
 */
export interface BoundaryEvidence {
  readonly values: Float64Array;
  readonly reading: BoundaryReading;
}

/** How an axis's boundary evidence was read — see `readAxis` in `stepProfile.ts`. */
export type BoundaryReading = 'TRANSITIONS' | 'MAGNITUDE';

/**
 * Every row of the image, then every column, each read as one scan line.
 *
 * A row is what crosses the column boundaries and a column is what crosses the row boundaries, so
 * each direction's steps are read along the lines that cross them. Every pixel is still compared with
 * its left neighbour once and its upper neighbour once.
 *
 * Reads the four channels directly rather than through `packedColorAt`, which the exact detector
 * uses: that packs a colour so two of them can be compared for equality in one integer, and this
 * needs the channels apart to subtract them.
 */
export function stepProfile(image: ImageData): StepProfile {
  const { width, height, data } = image;
  const across = readAxis(data, {
    lines: height,
    length: width,
    stride: CHANNELS_PER_PIXEL,
    lineStride: width * CHANNELS_PER_PIXEL,
  });
  const down = readAxis(data, {
    lines: width,
    length: height,
    stride: width * CHANNELS_PER_PIXEL,
    lineStride: CHANNELS_PER_PIXEL,
  });

  return {
    columns: across.magnitude,
    rows: down.magnitude,
    columnEvidence: across.evidence,
    rowEvidence: down.evidence,
    total: across.total + down.total,
  };
}

/** The scan lines crossing one axis: how many, how long, and how far apart in the pixel data. */
interface ScanLines {
  readonly lines: number;
  readonly length: number;
  /** From one pixel of a line to the next. */
  readonly stride: number;
  /** From the first pixel of one line to the first of the next. */
  readonly lineStride: number;
}

/** One axis's magnitude, its boundary evidence, and the whole of the change its lines carry. */
interface AxisReading {
  readonly magnitude: Float64Array;
  readonly evidence: BoundaryEvidence;
  readonly total: number;
}

/**
 * Every scan line crossing one axis, totalled into that axis's magnitude and read for its evidence.
 *
 * **An axis drawn crisply is read by its transitions, and any other axis by its magnitude.** On a
 * resampled sheet nearly every neighbouring pair differs, so a count is the same everywhere, and size
 * is the only thing separating an edge from the resampler's ringing — while a softened ramp's three
 * shares still total the step it was before. On crisp art size says nothing about whether a change is
 * a boundary: neighbouring cells 2 apart and stray pixels 210 away put far more magnitude on the
 * strays' columns than on the boundaries', and the line list held the strays alone, so a grid the sheet
 * was not exactly drawn on was walked over them (#279). The exact detector counts transitions, and on
 * a crisp axis the line reader counts them too.
 *
 * **A line is drawn crisply when more than half of its transitions sit beside a step of no change, and
 * an axis when more than half of its changing lines are.** Crisp art changes in isolated steps between
 * runs of one colour; resampled art changes in runs of steps, pixel after pixel. Counting the unchanged
 * steps instead is fooled by a keyed sheet: its sprites sit on a transparent field, so most of every
 * row is no change at all while the art inside each sprite is as resampled as it arrived. The decision
 * is the axis's rather than each line's, for a reason at each end. A line crossing a stray in every
 * cell of three changes on every pixel and looks resampled by its own count, while the lines around it
 * say the art is crisp; and on a resampled sheet, the few lines crossing clean stretches would
 * otherwise be counted in a unit nothing else on the axis is measured in. Half is the point past which
 * most of a line's changes are one kind or the other, a figure rather than a calibrated threshold, so
 * it takes no constant. **No axis of the eight sheets in `test_sprites/` is read by transitions, keyed
 * or not** — `tests/boundary-evidence-corpus.test.ts` pins it — so on real generator output the
 * evidence is the magnitude, exactly as it was before transitions were read at all.
 *
 * **Read by transitions, each line holds one vote, split evenly between its transitions.** A boundary
 * collects a share from nearly every line that crosses it and a stray from the few that pass through
 * it, and a line crowded with changes — one crossing a stray in every cell — says less about each of
 * them than a line crossing boundaries alone.
 *
 * A line with no change on it adds nothing to either.
 */
function readAxis(data: Uint8ClampedArray, scan: ScanLines): AxisReading {
  const { lines, length, stride, lineStride } = scan;
  const magnitude = new Float64Array(length);
  const votes = new Float64Array(length);
  const steps = new Uint16Array(length);
  let total = 0;
  let changing = 0;
  let crisp = 0;

  for (let line = 0; line < lines; line += 1) {
    const origin = line * lineStride;
    let sum = 0;
    for (let index = 1; index < length; index += 1) {
      const offset = origin + index * stride;
      const step = channelDistance(data, offset, offset - stride);
      steps[index] = step;
      magnitude[index] = (magnitude[index] ?? 0) + step;
      sum += step;
    }
    total += sum;
    if (sum === 0) continue;

    let transitions = 0;
    let isolated = 0;
    for (let index = 1; index < length; index += 1) {
      if ((steps[index] ?? 0) === 0) continue;
      transitions += 1;
      // A neighbour past either end of the line is not a step of no change: there is no step there.
      if ((index > 1 && steps[index - 1] === 0) || (index < length - 1 && steps[index + 1] === 0)) {
        isolated += 1;
      }
    }
    changing += 1;
    if (isolated * 2 > transitions) crisp += 1;
    const share = 1 / transitions;
    for (let index = 1; index < length; index += 1) {
      if ((steps[index] ?? 0) > 0) votes[index] = (votes[index] ?? 0) + share;
    }
  }

  const reading: BoundaryReading = crisp * 2 > changing ? 'TRANSITIONS' : 'MAGNITUDE';
  return { magnitude, evidence: { values: reading === 'TRANSITIONS' ? votes : magnitude, reading }, total };
}

/** How far apart two pixels are, summed across the four channels. */
function channelDistance(data: Uint8ClampedArray, offset: number, other: number): number {
  let distance = 0;
  for (let channel = 0; channel < CHANNELS_PER_PIXEL; channel += 1) {
    distance += Math.abs((data[offset + channel] ?? 0) - (data[other + channel] ?? 0));
  }
  return distance;
}
