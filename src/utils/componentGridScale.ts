import type { PixelExtent } from '../types/output.ts';

/**
 * How many times over a sheet can hold a grid of components at a stated cell size.
 *
 * One question asked in two directions, which is why it is one function. The quantiser asks it of a
 * sheet it has been *given* — "at what scale could this returned image have been drawn?" — and the
 * prompt compiler asks it of a sheet it is about to *request* — "what whole-number enlargement can
 * the canvas be expected to hold?". Both are the same search, and two implementations of it would
 * eventually disagree about the same sheet: the tab would offer a scale the prompt never asked for.
 *
 * Pure arithmetic on plain numbers, so it stays out of the DOM program — `targetSizeGrid` takes an
 * `ImageData` and this does not, which is what lets `src/constants/promptText/` reach it. See the
 * note in `targetSize.ts`, which records what ignoring that boundary costs.
 */

/**
 * The largest whole-number scale at which `components` cells of `cell` still fit inside `sheet`, or
 * `null` when even 1:1 cannot seat them.
 *
 * At a scale of `n` a cell occupies `n × cell.width` by `n × cell.height` sheet pixels, so the sheet
 * affords `⌊W / (n·width)⌋ × ⌊H / (n·height)⌋` of them. Both factors fall as the scale rises, so the
 * count is monotonic and the first scale counting down from the ceiling is the largest that fits.
 *
 * The ceiling is the geometry's own — the scale at which a single cell fills the sheet — rather than
 * a number chosen here. A caller that needs a lower bound than the sheet imposes clamps the answer,
 * which is safe precisely because of that monotonicity: every scale below one that fits also fits.
 *
 * `cell` is not required to be whole. A caller spacing its components apart pays for the gutter by
 * inflating the cell, and a component 16 pixels wide given half its own width of clearance is a cell
 * of 24 — but at 1.5× a 15-pixel component it is 22.5, and rounding that would quietly change the
 * answer at exactly the small sizes where one pixel is a large share of the cell.
 */
export function componentGridScale(sheet: PixelExtent, cell: PixelExtent, components: number): number | null {
  // A cell with no extent seats an unbounded number of components, which makes the ceiling below
  // infinite and the loop unbounded. There is no scale to report for it, so there is none to search.
  if (components < 1 || cell.width < 1 || cell.height < 1) return null;

  const ceiling = Math.min(Math.floor(sheet.width / cell.width), Math.floor(sheet.height / cell.height));

  for (let scale = ceiling; scale >= 1; scale -= 1) {
    const columns = Math.floor(sheet.width / (scale * cell.width));
    const rows = Math.floor(sheet.height / (scale * cell.height));
    if (columns * rows >= components) return scale;
  }

  return null;
}
