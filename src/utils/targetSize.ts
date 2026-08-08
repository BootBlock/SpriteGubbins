import { MANUAL_GRID_RANGE } from '../constants/quantiser.ts';
import type { TargetSize } from '../types/output.ts';
import type { PixelGrid } from '../types/quantiser.ts';

/**
 * Reading the studio's `spriteTargetSize` as a pixel scale the returned sheet might have been drawn
 * at.
 *
 * The field is free prose — the shipped presets hold *"48 × 96 px assembled (2 metres tall at 48 px
 * per metre)"* — and it names a **component** size, not a sheet scale. The two are related only
 * through how many components the sheet carries, which is the relation below. Its answer is
 * therefore a *candidate*, offered beside what detection found and never silently preferred: a
 * generator that left half the canvas empty was drawn at a smaller scale than this suggests.
 */

/**
 * The first `W × H` pair in the text, or `null` where there is none.
 *
 * A pair is required rather than a lone number, and that is what makes the parse safe on prose like
 * *"2 metres tall at 48 px per metre"* — three numbers, no size among them. `×`, `x` and `*` are all
 * accepted because all three are typed for the same thing, and the first match wins so a trailing
 * *"at 48 px per metre"* cannot overrule the size it follows.
 */
export function parseTargetSize(text: string): TargetSize | null {
  const match = /(\d{1,5})\s*[×x*]\s*(\d{1,5})/iu.exec(text);
  if (match === null) return null;

  const width = Number(match[1]);
  const height = Number(match[2]);
  // A capture that matched is always a run of digits, so this rejects only the degenerate `0 × 0`.
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) return null;
  return { width, height };
}

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
