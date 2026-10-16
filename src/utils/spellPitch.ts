import type { PixelGrid } from '../types/quantiser.ts';

/**
 * The whole scale a measured pitch is offered as across an axis `extent` pixels long: the integer
 * at or below it, unless the integer above cannot be told from it anywhere on the sheet.
 *
 * A reading that measures a pitch to a fraction of a pixel still has to offer a whole one, and the
 * two integers either side of it are not equally wrong. The finer under-reduces, which the reader
 * sees in the preview and can finish; the coarser merges some of the art's own cells, which nothing
 * afterwards can undo. So a fractional pitch is floored, never rounded (#479).
 *
 * **The integer above is coarser only where the difference adds up to a pixel.** Art at `n − f`
 * falls behind a lattice of `n` by `f` a cell, so across the sheet's `extent / n` cells it slips
 * `extent × f / n` pixels, and while that is under one the lattice of `n` cuts every cell the art
 * has. That is also what keeps an integer pitch whole: a reading's measurement carries noise,
 * and the softened and jittered fixtures at pitches 5, 6, 7 and 9 measure up to 9 × 10⁻⁵ under
 * their integer — a slip of a hundredth of a pixel across the sheet, where a bare floor offered the
 * integer below. The margin comes from the sheet rather than from a constant, so it widens as the
 * sheet shrinks and the measurement coarsens with it.
 */
export function spellPitch(measured: number, extent: number): PixelGrid {
  const above = Math.ceil(measured);
  return (above - measured) * (extent / above) < 1 ? above : Math.floor(measured);
}
