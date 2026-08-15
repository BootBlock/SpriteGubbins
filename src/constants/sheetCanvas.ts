import type { AspectRatio, PixelExtent } from '../types/output.ts';

/**
 * The canvas a prompt is composed against, which is a canvas this app never sees.
 *
 * A generator decides the pixel dimensions of what it returns; the prompt only asks for a shape. So
 * when the compiler has to state a figure that depends on how much room the sheet has — the
 * whole-number scale a native pixel grid is presented at — it reasons from a *nominal* canvas rather
 * than from a measurement, and the honest way to pick one is the smallest sheet any of the named
 * targets returns. Every figure derived from it then fits on the ones that come back larger, which
 * is the direction that costs a little background rather than a cropped or resampled sheet.
 */

/**
 * The long edge of that nominal canvas.
 *
 * 1024 because it is the short edge of what the current image models return at these shapes — GPT
 * Image's landscape frame is 1536 × 1024, Midjourney's 16:9 lands near 1456 × 816 — and taking it as
 * the *long* edge leaves headroom under all of them. It is also the sheet the resolution profiles
 * are already reasoned against in `promptText/renderStyle.ts`, so the two agree about how large a
 * figure a stated scale produces.
 */
const NOMINAL_LONG_EDGE = 1024;

/**
 * That canvas per sheet shape, with the long edge at {@link NOMINAL_LONG_EDGE} and the short edge
 * floored from the ratio the identifier names.
 *
 * Written out rather than derived from the identifier at runtime, because parsing a union member's
 * name for arithmetic makes the spelling of an identifier load-bearing. `sheetCanvas.test.ts` reads
 * the ratio back out of each name and fails on a pair that does not match it, which is the same
 * guarantee without the fragility.
 */
export const NOMINAL_SHEET_SIZE: Readonly<Record<AspectRatio, PixelExtent>> = {
  WIDE_16_9: { width: NOMINAL_LONG_EDGE, height: 576 },
  SQUARE_1_1: { width: NOMINAL_LONG_EDGE, height: NOMINAL_LONG_EDGE },
  TALL_9_16: { width: 576, height: NOMINAL_LONG_EDGE },
  ULTRAWIDE_21_9: { width: NOMINAL_LONG_EDGE, height: 438 },
};

/**
 * How much room one component is given on the sheet, as a multiple of its own size.
 *
 * The layout section asks for components "generously and uniformly spaced", and a scale derived from
 * components packed edge to edge would be a scale that leaves nowhere for that spacing to go — the
 * generator would have to shrink the artwork to obey both, which is the silent rescale this whole
 * arrangement exists to prevent. 1.5 gives each component a clear gutter half its own size on each
 * axis, which is what "generously spaced" looks like at sprite scale.
 *
 * It also absorbs the fact that the target size names a *typical whole* component: a hand or a boot
 * is drawn in proportion beside a figure and occupies a good deal less than a full cell, so a sheet
 * planned on full cells throughout has room in hand rather than short.
 */
export const SHEET_CELL_PITCH = 1.5;
