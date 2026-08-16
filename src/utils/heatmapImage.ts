import { DIFFERENCE_RAMP } from '../constants/differenceRamp.ts';
import { DIFFERENCE_PRECISION } from '../constants/quantiser.ts';
import type { DifferenceMap } from '../types/quantiser.ts';
import { CHANNELS_PER_PIXEL, createImage } from './imageData.ts';
import { oklabToSrgb, oklchToOklab } from './oklab.ts';
import type { Oklab } from './oklab.ts';

/**
 * The difference map as something to look at: one pixel per output pixel, coloured by how far that
 * pixel sits from the source it replaced.
 *
 * On the main thread rather than in the worker, and that is the whole reason `DifferenceMap` carries
 * distances instead of pixels. `scale` — what counts as the top of the ramp — is a control in the
 * preview, and a reader turning it is asking to look at the same measurement more or less closely.
 * Painted in the worker, every turn of that control would be a round trip and a second copy of the
 * result; painted here it is one pass over a value the preview is holding anyway.
 *
 * **It is one pass over the *result*, which is `grid²` times smaller than the sheet — except at a
 * grid of 1, where it is the sheet.** That is the case this loop is written for: 16.8 million cells
 * is the most `MAX_IMAGE_PIXELS` admits, and at that size the pass is about 80ms of render-phase
 * main thread. Anything careless here — a typed-array view per pixel was the first attempt — turns
 * a click on a scale rung into the kind of freeze `quantiseWorker.ts` exists to have removed.
 *
 * **The scale is a rung the reader picks, never the map's own peak.** Normalising each map against
 * itself would make every sheet look equally damaged and — far worse — would re-colour the whole
 * frame whenever a dial moved the single worst cell, so the one comparison this view exists for,
 * between the map before a change and the map after it, would be the one it could not support.
 *
 * Fully opaque throughout, zero difference included: the frame this lands in is otherwise showing
 * the *user's* artwork, and a heatmap the artwork came through would be read as part of it.
 */
export function heatmapImage(map: DifferenceMap, scale: number): ImageData {
  const image = createImage(map.width, map.height);
  // The map is stored as `distance × DIFFERENCE_PRECISION`, so the ceiling is converted into those
  // units once rather than every cell being converted out of them.
  const ceiling = scale * DIFFERENCE_PRECISION;
  const top = RAMP_STEPS - 1;

  for (let cell = 0; cell < map.cells.length; cell += 1) {
    const level = Math.min(top, Math.round(((map.cells[cell] ?? 0) / ceiling) * top));
    const from = level * CHANNELS_PER_PIXEL;
    const at = cell * CHANNELS_PER_PIXEL;
    // Four writes rather than `data.set(RAMP.subarray(…))`, which reads better and builds a typed
    // array object per pixel: measured at 16.8 million cells, the view form costs about 650ms
    // against about 80ms for this. That is a difference the neat spelling cannot afford here — see
    // the note above on where this runs.
    image.data[at] = RAMP[from] ?? 0;
    image.data[at + 1] = RAMP[from + 1] ?? 0;
    image.data[at + 2] = RAMP[from + 2] ?? 0;
    image.data[at + 3] = RAMP[from + 3] ?? 0;
  }

  return image;
}

/** How many colours the ramp is resolved to — one for every level a byte can carry. */
const RAMP_STEPS = 256;

/**
 * The ramp, resolved once at module load: {@link RAMP_STEPS} colours from the page ground to `rose`,
 * as RGBA bytes ready to copy straight into an image.
 *
 * Built once because it does not depend on the scale — the scale decides which level a cell lands
 * on, not what a level looks like — so rebuilding it per repaint would spend a few hundred cube
 * roots producing the same 256 colours again.
 *
 * **Interpolated in OKLab's rectangular form**, which is what `oklchToOklab` exists for and what the
 * stylesheet's own `color-mix(in oklab, …)` does. Blending the polar form instead would take the
 * first segment — a near-neutral ground to a saturated green — the long way round through cyan, the
 * one hue this app reserves for meaning *live*.
 */
const RAMP: Uint8ClampedArray = buildRamp();

function buildRamp(): Uint8ClampedArray {
  const stops = DIFFERENCE_RAMP.map(({ oklch }) => oklchToOklab(oklch[0], oklch[1], oklch[2]));
  const bytes = new Uint8ClampedArray(RAMP_STEPS * CHANNELS_PER_PIXEL);
  const segments = stops.length - 1;

  for (let step = 0; step < RAMP_STEPS; step += 1) {
    // Where this step falls along the whole ramp, as a segment and a position within it. The last
    // step lands exactly on the final stop: clamping the segment is what keeps it on the last pair
    // rather than indexing one past the end.
    const along = (step / (RAMP_STEPS - 1)) * segments;
    const segment = Math.min(segments - 1, Math.floor(along));
    // Neither `??` is a reachable case: `DIFFERENCE_RAMP` is a fixed four-stop tuple and `segment`
    // is clamped to its last pair. They are what `noUncheckedIndexedAccess` asks for on a computed
    // index — the same reason `spectrumStopAt` carries one.
    const from = stops[segment] ?? NEUTRAL;
    const to = stops[segment + 1] ?? NEUTRAL;
    const color = oklabToSrgb(mix(from, to, along - segment));

    const at = step * CHANNELS_PER_PIXEL;
    bytes[at] = color.r;
    bytes[at + 1] = color.g;
    bytes[at + 2] = color.b;
    bytes[at + 3] = color.a;
  }

  return bytes;
}

/** What an unreachable index would resolve to — see the note at its two uses. */
const NEUTRAL: Oklab = { L: 0, a: 0, b: 0 };

/** One point along the straight line between two OKLab colours. */
function mix(from: Oklab, to: Oklab, at: number): Oklab {
  return {
    L: from.L + (to.L - from.L) * at,
    a: from.a + (to.a - from.a) * at,
    b: from.b + (to.b - from.b) * at,
  };
}
