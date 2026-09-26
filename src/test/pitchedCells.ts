import { imageFrom } from './images.ts';
import { sequence } from './sequence.ts';

/** Never painted: every position falls in a cell the stream coloured. */
const BLACK = { r: 0, g: 0, b: 0, a: 255 };

/**
 * A square sheet of cells `pitch` pixels wide, whole or fractional, each a colour drawn from a seeded
 * stream — art with no structure but its pitch.
 *
 * A fractional pitch lays its cells on `⌊k × pitch⌋`, so art at 4.75 runs spacings of 5, 5, 5 and 4,
 * which is how a generator's drift reaches the scale readings. Random colours rather than a formula
 * of the cell index, so no content periodicity sits beside the pitch for a reading to find instead.
 */
export function pitchedCells(size: number, pitch: number, seed: number): ImageData {
  const next = sequence(seed);
  const cells = Math.ceil(size / pitch) + 1;
  const colours = Array.from({ length: cells * cells }, () => ({
    r: Math.floor(next() * 256),
    g: Math.floor(next() * 256),
    b: Math.floor(next() * 256),
    a: 255,
  }));
  return imageFrom(
    size,
    size,
    (x, y) => colours[Math.floor(y / pitch) * cells + Math.floor(x / pitch)] ?? BLACK,
  );
}
