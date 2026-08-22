import {
  BLEND_EDGE_GAP,
  BLEND_END_GAP,
  BLEND_STRAIGHTNESS,
  BLEND_VOTE_WEIGHT,
} from '../constants/quantiser.ts';
import { alphaAt, CHANNELS_PER_PIXEL, FULLY_OPAQUE, FULLY_TRANSPARENT, packedColorAt } from './imageData.ts';
import { srgbToOklabInto, type MutableOklab } from './oklab.ts';
import { pixelDistanceOf } from './pixelDistance.ts';

/**
 * The image's colours and how much each one is worth when a **palette** is chosen: a pixel that sits
 * partway between the two beside it counts for a fraction of one that does not.
 *
 * **What it is for.** A budget's palette is chosen from the sheet's own histogram, and on a generated
 * sheet the anti-aliased fringes between regions are a large population of colours that exist nowhere
 * but on a boundary. Counted pixel for pixel with the art's flat colours they claim slots the art
 * needed — a budget of 24 on a fixture whose art uses 24 colours kept 21 of them and spent three
 * slots on blends — and the reduction then merges genuine art tones onto shared entries. Weighting
 * the histogram against those pixels is what `buildPalette` reads instead; `constants/quantiser.ts`
 * holds the four figures and what each was measured against.
 *
 * **The reading is betweenness, not edge strength.** A pixel is a blend when, on either axis, its two
 * opposite neighbours are at least {@link BLEND_EDGE_GAP} apart and it sits on the run joining them —
 * within {@link BLEND_STRAIGHTNESS} of it by the triangle inequality, and at least
 * {@link BLEND_END_GAP} from each end. An edge-strength reading cannot do this job: the pixels of a
 * drawn contour have the same local gradient as the pixels of the fringe beside it, and suppressing
 * an outline is the failure the whole vote layer exists to prevent. Betweenness separates them,
 * because a contour is *darker than both* of the things it runs between rather than partway between
 * them.
 *
 * **Only fully opaque pixels are ever read as blends**, on either side of the test — the same
 * restriction `lineAwareWinner` places on its tally, and here for a second reason as well. A soft
 * *alpha* edge is a blend by the same geometry, and this app has decided the opposite way about
 * those: `exactSplit` splits on alpha at full precision precisely so a fade-out can hold a slot of
 * its own instead of coming back opaque. So coverage takes no part in the reading, and a translucent
 * pixel keeps its whole vote. Fully transparent pixels are left out altogether, as `colorHistogram`
 * leaves them out.
 *
 * **Nothing is removed.** Every colour in the image is a key here with a weight above zero, so the
 * set a palette is chosen from is the set the image contains, and `buildPalette`'s early answer for
 * an image already inside its budget is unchanged. {@link BLEND_VOTE_WEIGHT} says what a sheet made
 * entirely of transitions does, and why it is the same thing it did before this pass existed.
 *
 * Pure, and bounded in what it allocates: three rows of the image in scaled OKLab, whatever the
 * sheet's height. The reading never looks further than one row either side, and the whole-image
 * alternative is not cheap — `oklabPlanes` holds three `Float64Array`s of one entry per pixel, which
 * at this tab's 4096 × 4096 ceiling is four hundred megabytes. That is also why this converts rather
 * than calling it: those planes fold coverage into the colour, taking a cleared pixel towards black,
 * and the reading here has to keep the two apart.
 */
export function blendWeightedHistogram(image: ImageData): ReadonlyMap<number, number> {
  const { width, height, data } = image;
  const counts = new Map<number, number>();
  // One scratch object for the whole image, as the pipeline's other hot paths keep: the alternative
  // is one allocation per pixel of a sheet this tab admits sixteen million of.
  const scratch: MutableOklab = { L: 0, a: 0, b: 0 };
  let above = emptyRow(width);
  let here = emptyRow(width);
  let below = emptyRow(width);

  if (height > 0) fillRow(here, image, 0, scratch);
  if (height > 1) fillRow(below, image, 1, scratch);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * CHANNELS_PER_PIXEL;
      const alpha = alphaAt(data, at);
      if (alpha === FULLY_TRANSPARENT) continue;
      const key = packedColorAt(data, at);
      const weight = isBlend(above, here, below, x, y, width, height, alpha) ? BLEND_VOTE_WEIGHT : 1;
      counts.set(key, (counts.get(key) ?? 0) + weight);
    }
    // Roll the window down a row, re-filling the row that has just left it rather than allocating a
    // fourth — which is what keeps this pass's memory a function of the width alone.
    const retired = above;
    above = here;
    here = below;
    below = retired;
    if (y + 2 < height) fillRow(below, image, y + 2, scratch);
  }

  return counts;
}

/** One row of the image in scaled OKLab, with its coverages, as the three-row window holds it. */
interface Row {
  /** Three entries per pixel: lightness, then the two chroma axes. */
  readonly lab: Float64Array;
  readonly alpha: Uint8Array;
}

function emptyRow(width: number): Row {
  return { lab: new Float64Array(width * 3), alpha: new Uint8Array(width) };
}

function fillRow(row: Row, image: ImageData, y: number, scratch: MutableOklab): void {
  const { data, width } = image;
  for (let x = 0; x < width; x += 1) {
    const at = (y * width + x) * CHANNELS_PER_PIXEL;
    srgbToOklabInto(scratch, data[at] ?? 0, data[at + 1] ?? 0, data[at + 2] ?? 0);
    row.lab[x * 3] = scratch.L;
    row.lab[x * 3 + 1] = scratch.a;
    row.lab[x * 3 + 2] = scratch.b;
    row.alpha[x] = alphaAt(data, at);
  }
}

/**
 * Whether the pixel at `x` of the middle row lies partway between the two beside it, on either axis.
 *
 * The horizontal axis is asked first and the vertical only where it did not answer, which is the
 * cheap order rather than a preference: a blend on one axis is a blend, and a pixel on a vertical
 * edge is answered by its own row without the neighbouring rows being read at all. A pixel on an edge
 * of the image has no opposite pair on that axis and is simply not asked about it.
 */
function isBlend(
  above: Row,
  here: Row,
  below: Row,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha: number,
): boolean {
  if (alpha !== FULLY_OPAQUE) return false;
  if (
    x > 0 &&
    x + 1 < width &&
    here.alpha[x - 1] === FULLY_OPAQUE &&
    here.alpha[x + 1] === FULLY_OPAQUE &&
    liesBetween(here, x - 1, here, x, here, x + 1)
  ) {
    return true;
  }
  return (
    y > 0 &&
    y + 1 < height &&
    above.alpha[x] === FULLY_OPAQUE &&
    below.alpha[x] === FULLY_OPAQUE &&
    liesBetween(above, x, here, x, below, x)
  );
}

/**
 * Whether `middle` sits on the run from `low` to `high`, far enough from each end to be partway along
 * it, with all three colours fully opaque.
 *
 * The span is tested first because it is the answer for almost every pixel of a shaded sheet, and it
 * is the only one of the three distances that can be computed without reading the middle pixel at
 * all. Every distance is `pixelDistanceOf` at full coverage on all three sides, so this measures
 * colour distance with exactly what the rest of the tab measures it with.
 */
function liesBetween(
  low: Row,
  lowAt: number,
  middle: Row,
  middleAt: number,
  high: Row,
  highAt: number,
): boolean {
  const lowL = low.lab[lowAt * 3] ?? 0;
  const lowA = low.lab[lowAt * 3 + 1] ?? 0;
  const lowB = low.lab[lowAt * 3 + 2] ?? 0;
  const highL = high.lab[highAt * 3] ?? 0;
  const highA = high.lab[highAt * 3 + 1] ?? 0;
  const highB = high.lab[highAt * 3 + 2] ?? 0;
  const span = pixelDistanceOf(lowL, lowA, lowB, FULLY_OPAQUE, highL, highA, highB, FULLY_OPAQUE);
  if (span < BLEND_EDGE_GAP) return false;

  const midL = middle.lab[middleAt * 3] ?? 0;
  const midA = middle.lab[middleAt * 3 + 1] ?? 0;
  const midB = middle.lab[middleAt * 3 + 2] ?? 0;
  const fromLow = pixelDistanceOf(lowL, lowA, lowB, FULLY_OPAQUE, midL, midA, midB, FULLY_OPAQUE);
  if (fromLow < BLEND_END_GAP) return false;
  const toHigh = pixelDistanceOf(midL, midA, midB, FULLY_OPAQUE, highL, highA, highB, FULLY_OPAQUE);
  if (toHigh < BLEND_END_GAP) return false;

  return fromLow + toHigh <= span + BLEND_STRAIGHTNESS;
}
