import type { AspectRatio, PixelExtent } from '../types/output.ts';

/**
 * The canvas a prompt is composed against, which is a canvas this app never sees.
 *
 * A generator decides the pixel dimensions of what it returns; the prompt only asks for a shape. So
 * when the compiler has to state a figure that depends on how much room the sheet has — the
 * whole-number scale a native pixel grid is presented at — it reasons from a *nominal* canvas rather
 * than from a measurement. The figure it derives is stated as a floor, so the canvas has to be small
 * enough that a real sheet is never *smaller*: an underestimate costs a little background, and an
 * overestimate asks for an enlargement the canvas cannot hold, which the generator would reconcile
 * by resampling — the one thing the rule it feeds exists to rule out.
 */

/**
 * The long edge of that nominal canvas.
 *
 * 1024 sits under what the current image models return at every shape the studio offers: GPT Image's
 * frames are 1024 × 1024 and 1536 × 1024, Midjourney's 16:9 lands near 1456 × 816, and the Gemini and
 * Seedream models go further again. Taken as the *long* edge it is a square sheet exactly and every
 * other shape with room to spare — 1024 × 576 against Midjourney's own 16:9, which is smaller on both
 * axes.
 *
 * **The one named target it does not fit is SD 1.5**, which draws at 512, and that is a target the
 * whole specification already overruns: `constants/models.ts` records its documented ceiling as the
 * 77-token CLIP context, against a prompt of some thousands. A sheet that arrives from it has been
 * generated from a truncated brief the block this figure feeds never reached.
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
