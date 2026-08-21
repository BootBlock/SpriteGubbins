/**
 * PNG's per-scanline prefilters — the step between the raw pixel bytes and the deflate stream.
 *
 * Every row of a PNG carries a leading byte naming one of five transforms applied to it, each
 * predicting a byte from its neighbours and storing the difference. Deflate then compresses the
 * residuals rather than the pixels, which is most of where a PNG's size comes from: a ramp climbing
 * by one across a row is 256 distinct bytes under filter 0 and 256 copies of the same byte under
 * filter 1, and deflate has far more to work with in the second.
 *
 * **Which filters a caller offers is the caller's decision, not this file's**, which is why the
 * candidate list is an argument. The two colour types this app writes want different answers, and
 * the reasoning is in `encodePng`: a truecolour sheet is numeric in every channel and filters well,
 * while a palette index is a *name* whose arithmetic means nothing — the difference between entry 7
 * and entry 4 is 3 only in the sense that two strangers' phone numbers differ.
 *
 * Pure: bytes in, bytes out.
 */

/** The five filter types, in the spec's own order — the value each scanline's leading byte holds. */
export const PNG_FILTERS = [0, 1, 2, 3, 4] as const;

/** Filter 0 alone: every scanline stored as it stands. */
export const PNG_FILTER_NONE = [0] as const;

/**
 * One byte, filtered — `raw` at `at`, predicted from the three bytes the spec names.
 *
 * `left` is the byte one pixel back on this row, `up` the byte at this position on the previous row,
 * and `upLeft` one pixel back on that. Each is zero where it falls outside the image, which is what
 * makes the first row and the first pixel of every row well defined.
 */
function filterByte(type: number, value: number, left: number, up: number, upLeft: number): number {
  switch (type) {
    case 1:
      return (value - left) & 0xff;
    case 2:
      return (value - up) & 0xff;
    case 3:
      return (value - ((left + up) >> 1)) & 0xff;
    case 4:
      return (value - paeth(left, up, upLeft)) & 0xff;
    default:
      return value;
  }
}

/**
 * The Paeth predictor: whichever of the three neighbours is nearest to `left + up − upLeft`.
 *
 * Ties go to `left`, then `up`, exactly as the spec's own pseudocode orders them — a decoder
 * reconstructs by running this same function, so a different tie-break is a different image.
 */
function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const toLeft = Math.abs(estimate - left);
  const toUp = Math.abs(estimate - up);
  const toUpLeft = Math.abs(estimate - upLeft);
  if (toLeft <= toUp && toLeft <= toUpLeft) return left;
  return toUp <= toUpLeft ? up : upLeft;
}

/**
 * How costly a filtered scanline looks to the compressor that has not run yet.
 *
 * The minimum-sum-of-absolute-differences heuristic, reading each byte as **signed** — so 255 counts
 * as 1 rather than as 255, because a residual of −1 is as compressible as one of +1 and the byte is
 * only holding it in two's complement. This is libpng's own default heuristic, and it is a heuristic:
 * it estimates entropy without deflating five times, which is what makes trying every filter
 * affordable at all.
 */
function scanlineCost(row: Uint8Array): number {
  let sum = 0;
  for (const byte of row) {
    sum += byte < 128 ? byte : 256 - byte;
  }
  return sum;
}

/** What `filterScanlines` needs: the raw rows, their shape, and which filters it may choose from. */
export interface FilterInput {
  /** Row-major pixel bytes, `rowBytes × height` long, unfiltered. */
  readonly raw: Uint8Array;
  readonly rowBytes: number;
  readonly height: number;
  /** The pixel stride in bytes — 1 for an 8-bit palette index, 4 for RGBA. */
  readonly bytesPerPixel: number;
  /** The filter types to try, cheapest-looking winner taken; see {@link PNG_FILTERS}. */
  readonly candidates: readonly number[];
}

/**
 * The scanlines with a filter byte in front of each, ready to be deflated into `IDAT`.
 *
 * Each row is tried under every candidate and the cheapest kept, which is the standard adaptive
 * strategy. The previous row is read **unfiltered** — a decoder reconstructs row by row, so what a
 * filter predicts from is the reconstructed bytes, never the residuals of the row above.
 */
export function filterScanlines({
  raw,
  rowBytes,
  height,
  bytesPerPixel,
  candidates,
}: FilterInput): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array((rowBytes + 1) * height);
  const trial = new Uint8Array(rowBytes);
  const best = new Uint8Array(rowBytes);

  for (let y = 0; y < height; y += 1) {
    const rowAt = y * rowBytes;
    const upAt = rowAt - rowBytes;
    let bestType = candidates[0] ?? 0;
    let bestCost = Number.POSITIVE_INFINITY;

    for (const type of candidates) {
      for (let at = 0; at < rowBytes; at += 1) {
        const left = at >= bytesPerPixel ? (raw[rowAt + at - bytesPerPixel] ?? 0) : 0;
        const up = y > 0 ? (raw[upAt + at] ?? 0) : 0;
        const upLeft = y > 0 && at >= bytesPerPixel ? (raw[upAt + at - bytesPerPixel] ?? 0) : 0;
        trial[at] = filterByte(type, raw[rowAt + at] ?? 0, left, up, upLeft);
      }
      const cost = scanlineCost(trial);
      if (cost < bestCost) {
        bestCost = cost;
        bestType = type;
        best.set(trial);
      }
    }

    out[y * (rowBytes + 1)] = bestType;
    out.set(best, y * (rowBytes + 1) + 1);
  }

  return out;
}
