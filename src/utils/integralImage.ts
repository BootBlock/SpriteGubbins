/**
 * A summed-area table over a plane, and the four reads that answer any rectangle in it.
 *
 * The table is `(width + 1) × (height + 1)` with a zero row and a zero column, so
 * {@link rectangleSum} needs no bounds tests and no special case at the top-left corner. That is
 * what turns a sliding window from `O(window²)` per position into `O(1)`, and it is the whole reason
 * the auto-tune sweep can afford a sliding window at all: on a proxy crop the alternative is
 * sixty-four reads per position per quantity, five quantities deep, once per candidate.
 *
 * `Float64Array` throughout, because the tables both callers build accumulate squares — 255² times
 * the pixel count, which is past where a 32-bit float still counts exactly.
 *
 * A pair of functions in one file rather than two, because neither is any use alone: the layout of
 * the table *is* the contract between them, and a second file would be free to disagree about the
 * zero row.
 */

/**
 * The summed-area table over `plane`, or over the product of `plane` and `other` where one is given.
 *
 * The product form is what an SSIM covariance needs, and taking it here rather than materialising a
 * product plane first saves an allocation the size of the image on three of the five tables.
 */
export function integralImage(
  plane: Float64Array,
  width: number,
  height: number,
  other?: Float64Array,
): Float64Array {
  const stride = width + 1;
  const table = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let row = 0;
    for (let x = 0; x < width; x += 1) {
      const value = plane[y * width + x] ?? 0;
      row += other === undefined ? value : value * (other[y * width + x] ?? 0);
      table[(y + 1) * stride + x + 1] = row + (table[y * stride + x + 1] ?? 0);
    }
  }
  return table;
}

/**
 * The sum over the rectangle whose top-left pixel is `(x, y)`.
 *
 * `width` is the *plane's* width, not the table's — the stride is worked out here, so no caller has
 * to remember the extra column.
 */
export function rectangleSum(
  table: Float64Array,
  width: number,
  x: number,
  y: number,
  rectWidth: number,
  rectHeight: number,
): number {
  const stride = width + 1;
  const bottom = y + rectHeight;
  const right = x + rectWidth;
  return (
    (table[bottom * stride + right] ?? 0) -
    (table[y * stride + right] ?? 0) -
    (table[bottom * stride + x] ?? 0) +
    (table[y * stride + x] ?? 0)
  );
}
