import { MANUAL_GRID_RANGE } from '../constants/quantiser.ts';
import type { TargetSize } from '../types/output.ts';
import type { PixelGrid } from '../types/quantiser.ts';

/**
 * Turning the studio's stated component size into a pixel scale the returned sheet might have been
 * drawn at.
 *
 * The size and the sheet's scale are related only through how many components the sheet carries,
 * which is the relation below. Its answer is therefore a *candidate*, offered beside what detection
 * found and never silently preferred: a generator that left half the canvas empty was drawn at a
 * smaller scale than this suggests.
 *
 * Split from `parseTargetSize` rather than filed with it because this half takes an `ImageData` —
 * see the note there, which records what putting the two together costs.
 */

/**
 * The largest pixel scale at which this sheet could still hold every component at the target size,
 * or `null` when even 1:1 cannot fit them.
 *
 * At a scale of `n` a component occupies `n × width` by `n × height` sheet pixels, so the sheet
 * affords `⌊W / (n·width)⌋ × ⌊H / (n·height)⌋` cells. That count falls as the scale rises, so the
 * largest `n` that still seats `components` of them is the tightest scale the sheet can have been
 * drawn at — the one a generator that used its canvas would have chosen.
 *
 * An **upper bound**, then, rather than a measurement, which is exactly why the tab offers it as a
 * candidate to click rather than adopting it. Measuring the drawn scale properly means finding where
 * one component actually sits, and cutting the sheet into components is a separate tool.
 */
export function targetSizeGrid(image: ImageData, target: TargetSize, components: number): PixelGrid | null {
  if (components < 1) return null;

  for (let grid = MANUAL_GRID_RANGE.max; grid >= MANUAL_GRID_RANGE.min; grid -= 1) {
    const columns = Math.floor(image.width / (grid * target.width));
    const rows = Math.floor(image.height / (grid * target.height));
    if (columns * rows >= components) return grid;
  }

  return null;
}
