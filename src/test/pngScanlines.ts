/**
 * PNG's scanline reconstruction — the decoder's side of `src/utils/pngFilter.ts`.
 *
 * Test-only, and written from the spec's own formulae rather than by running the encoder's steps
 * backwards: a round trip through shared code proves only that the code agrees with itself. Shared
 * by `decodePng` and by the filter's own tests so there is one reconstruction to be right, rather
 * than two that could both be wrong in the same way.
 */

/** The unfiltered rows, given the filtered stream that carries a filter byte in front of each. */
export function unfilterScanlines(
  filtered: Uint8Array,
  rowBytes: number,
  height: number,
  bytesPerPixel: number,
): Uint8Array {
  const raw = new Uint8Array(rowBytes * height);
  for (let y = 0; y < height; y += 1) {
    const from = y * (rowBytes + 1);
    const filter = filtered[from] ?? 0;
    for (let at = 0; at < rowBytes; at += 1) {
      const left = at >= bytesPerPixel ? (raw[y * rowBytes + at - bytesPerPixel] ?? 0) : 0;
      const up = y > 0 ? (raw[(y - 1) * rowBytes + at] ?? 0) : 0;
      const upLeft = y > 0 && at >= bytesPerPixel ? (raw[(y - 1) * rowBytes + at - bytesPerPixel] ?? 0) : 0;
      raw[y * rowBytes + at] = ((filtered[from + 1 + at] ?? 0) + predict(filter, left, up, upLeft)) & 0xff;
    }
  }
  return raw;
}

/** What each filter type predicted a byte would be, from the spec's reconstruction table. */
function predict(filter: number, left: number, up: number, upLeft: number): number {
  switch (filter) {
    case 1:
      return left;
    case 2:
      return up;
    case 3:
      return (left + up) >> 1;
    case 4: {
      const estimate = left + up - upLeft;
      const toLeft = Math.abs(estimate - left);
      const toUp = Math.abs(estimate - up);
      const toUpLeft = Math.abs(estimate - upLeft);
      if (toLeft <= toUp && toLeft <= toUpLeft) return left;
      return toUp <= toUpLeft ? up : upLeft;
    }
    default:
      return 0;
  }
}

/** The filter byte each scanline of a filtered stream was written under. */
export function scanlineFilters(filtered: Uint8Array, rowBytes: number, height: number): number[] {
  return Array.from({ length: height }, (_, y) => filtered[y * (rowBytes + 1)] ?? 0);
}
