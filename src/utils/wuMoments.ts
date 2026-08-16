/**
 * The cumulative moment table Wu's quantiser reads its box statistics out of.
 *
 * The whole point of Wu's method is that the statistics of *any* axis-aligned box — its pixel
 * count, its channel sums, its sum of squares — are answered by eight array reads rather than by
 * walking the colours inside it. That is what makes the search's cost depend on the size of this
 * table and not on the size of the image: a 4096 × 4096 sheet and a 64 × 64 one are cumulated once
 * apiece and searched identically afterwards.
 *
 * The table is a 32-bin-per-channel histogram of RGB, stored at {@link WU_SIDE} = 33 per axis. The
 * extra row is not padding: every box statistic below is an inclusion–exclusion difference that
 * reads the plane *behind* the box's lower bound, so bin 1 needs a bin 0 holding zero. Bins are
 * `channel >> 3`, so each covers eight adjacent byte values.
 *
 * **Alpha is not an axis here, and that is a limit of this table rather than a decision about
 * colour.** A fourth axis would multiply it by 33 — tens of megabytes, rebuilt on every settings
 * change — so this pass sees three channels and the table stays about 1.4 MB. Alpha is a channel
 * like the other three everywhere it matters, and `exactSplit.ts` is where it gets its say: that
 * pass splits across all four at full precision, which is what lets a soft edge hold a palette slot
 * of its own instead of being folded onto the body colour behind it.
 *
 * Pure, and allocation-bounded: the five arrays are 33³ entries each whatever the image, which is
 * about 1.4 MB in total.
 */

/** Bins per axis: 32 of them, plus index 0, which is the zero plane inclusion–exclusion reads. */
export const WU_SIDE = 33;

const CELLS = WU_SIDE * WU_SIDE * WU_SIDE;

/** Which bin a channel byte falls in — 1 to 32, leaving 0 as the prefix sums' base plane. */
export function wuBin(channel: number): number {
  return (channel >> 3) + 1;
}

/** Where a bin triple sits in the flat table. */
export function wuCell(red: number, green: number, blue: number): number {
  return (red * WU_SIDE + green) * WU_SIDE + blue;
}

/**
 * The cell a packed colour belongs to — binning and the packing read in one place.
 *
 * Both sides of the search have to agree about which cell a colour is in: this table is built by
 * one walk over the histogram and read back by another, and a colour filed under a different cell
 * than the one whose moments it contributed to would put it in the wrong box. Stating it once is
 * what makes that impossible rather than merely unlikely.
 */
export function wuCellOfKey(key: number): number {
  // The packing is `((r * 256 + g) * 256 + b) * 256 + a` — see `packColor`. Alpha is dropped: this
  // table has no axis for it, and `exactSplit` is where it gets its say.
  return wuCell(
    wuBin(Math.floor(key / 16777216) % 256),
    wuBin(Math.floor(key / 65536) % 256),
    wuBin(Math.floor(key / 256) % 256),
  );
}

/**
 * The five cumulated moments, each indexed by {@link wuCell}.
 *
 * After {@link buildMoments} every entry holds the total over the whole sub-box from the origin to
 * that bin, which is what lets {@link boxSum} answer for an arbitrary box by differencing corners.
 */
export interface WuMoments {
  /** Pixels. */
  readonly weight: Float64Array;
  /** Σ red, Σ green, Σ blue — the numerators of a box's mean colour. */
  readonly red: Float64Array;
  readonly green: Float64Array;
  readonly blue: Float64Array;
  /** Σ (r² + g² + b²), which is what turns a box's mean into its variance. */
  readonly squares: Float64Array;
}

/** A box of bins: each bound *exclusive* below and *inclusive* above, as the differencing needs. */
export interface WuBox {
  r0: number;
  r1: number;
  g0: number;
  g1: number;
  b0: number;
  b1: number;
}

/** The axes a box can be cut along. */
export type WuAxis = 'r' | 'g' | 'b';

/**
 * The moment table for a histogram of packed colours, cumulated and ready to difference.
 *
 * Built from the colour histogram rather than from the pixels: the histogram has already excluded
 * fully transparent pixels — which is what keeps a keyed field from claiming palette slots — and it
 * is one entry per *colour*, so a sheet of sixteen million pixels and a few thousand colours is
 * walked a few thousand times here.
 */
export function buildMoments(histogram: ReadonlyMap<number, number>): WuMoments {
  const moments: WuMoments = {
    weight: new Float64Array(CELLS),
    red: new Float64Array(CELLS),
    green: new Float64Array(CELLS),
    blue: new Float64Array(CELLS),
    squares: new Float64Array(CELLS),
  };

  for (const [key, count] of histogram) {
    // Unpacked here rather than through `unpackColor` because the moments need the channel values
    // themselves, not only the cell — and an object per distinct colour is an allocation this walk
    // has no use for. The cell comes from {@link wuCellOfKey} so the binning is stated once.
    const r = Math.floor(key / 16777216) % 256;
    const g = Math.floor(key / 65536) % 256;
    const b = Math.floor(key / 256) % 256;
    const at = wuCellOfKey(key);
    // Read-then-write rather than `+=`, which `noUncheckedIndexedAccess` will not allow on an
    // indexed element: every one of these indices is in range by construction, and the `?? 0` is
    // what the compiler asks for rather than a case that can arise.
    moments.weight[at] = (moments.weight[at] ?? 0) + count;
    moments.red[at] = (moments.red[at] ?? 0) + r * count;
    moments.green[at] = (moments.green[at] ?? 0) + g * count;
    moments.blue[at] = (moments.blue[at] ?? 0) + b * count;
    moments.squares[at] = (moments.squares[at] ?? 0) + (r * r + g * g + b * b) * count;
  }

  cumulate(moments);
  return moments;
}

/**
 * Turn per-bin totals into totals-from-the-origin, in one pass per axis.
 *
 * The running `line` and `area` accumulators are what make this linear in the table rather than
 * cubic: each bin adds the row total behind it, then the plane above it, then the volume before it.
 */
function cumulate(moments: WuMoments): void {
  const tables = [moments.weight, moments.red, moments.green, moments.blue, moments.squares];
  const area = new Float64Array(WU_SIDE);

  for (const table of tables) {
    for (let r = 1; r < WU_SIDE; r += 1) {
      area.fill(0);
      for (let g = 1; g < WU_SIDE; g += 1) {
        let line = 0;
        for (let b = 1; b < WU_SIDE; b += 1) {
          line += table[wuCell(r, g, b)] ?? 0;
          area[b] = (area[b] ?? 0) + line;
          table[wuCell(r, g, b)] = (table[wuCell(r - 1, g, b)] ?? 0) + (area[b] ?? 0);
        }
      }
    }
  }
}

/**
 * One moment totalled over a box, by inclusion–exclusion across its eight corners.
 *
 * The eight-term alternating sum is the 3D analogue of `total = far − near`: each corner at a lower
 * bound subtracts the slab in front of it, and the corners where two or three lower bounds meet add
 * back what has been subtracted twice.
 */
export function boxSum(box: WuBox, table: Float64Array): number {
  const at = (r: number, g: number, b: number): number => table[wuCell(r, g, b)] ?? 0;
  return (
    at(box.r1, box.g1, box.b1) -
    at(box.r1, box.g1, box.b0) -
    at(box.r1, box.g0, box.b1) +
    at(box.r1, box.g0, box.b0) -
    at(box.r0, box.g1, box.b1) +
    at(box.r0, box.g1, box.b0) +
    at(box.r0, box.g0, box.b1) -
    at(box.r0, box.g0, box.b0)
  );
}

/**
 * The part of a box's moment that sits *behind* its lower bound on one axis — the half of a
 * candidate split that does not move as the cut position sweeps.
 *
 * Negated because it is the far face of the region being cut away: {@link topSum} adds the sweeping
 * face to it, and the pair together is the lower half's total at that cut.
 */
export function bottomSum(box: WuBox, axis: WuAxis, table: Float64Array): number {
  const at = (r: number, g: number, b: number): number => table[wuCell(r, g, b)] ?? 0;
  switch (axis) {
    case 'r':
      return (
        -at(box.r0, box.g1, box.b1) +
        at(box.r0, box.g1, box.b0) +
        at(box.r0, box.g0, box.b1) -
        at(box.r0, box.g0, box.b0)
      );
    case 'g':
      return (
        -at(box.r1, box.g0, box.b1) +
        at(box.r1, box.g0, box.b0) +
        at(box.r0, box.g0, box.b1) -
        at(box.r0, box.g0, box.b0)
      );
    case 'b':
      return (
        -at(box.r1, box.g1, box.b0) +
        at(box.r1, box.g0, box.b0) +
        at(box.r0, box.g1, box.b0) -
        at(box.r0, box.g0, box.b0)
      );
  }
}

/** The sweeping face of a candidate split: the box's moment up to `position` on one axis. */
export function topSum(box: WuBox, axis: WuAxis, position: number, table: Float64Array): number {
  const at = (r: number, g: number, b: number): number => table[wuCell(r, g, b)] ?? 0;
  switch (axis) {
    case 'r':
      return (
        at(position, box.g1, box.b1) -
        at(position, box.g1, box.b0) -
        at(position, box.g0, box.b1) +
        at(position, box.g0, box.b0)
      );
    case 'g':
      return (
        at(box.r1, position, box.b1) -
        at(box.r1, position, box.b0) -
        at(box.r0, position, box.b1) +
        at(box.r0, position, box.b0)
      );
    case 'b':
      return (
        at(box.r1, box.g1, position) -
        at(box.r1, box.g0, position) -
        at(box.r0, box.g1, position) +
        at(box.r0, box.g0, position)
      );
  }
}
