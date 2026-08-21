import { SYMMETRY_AXIS_SEARCH, SYMMETRY_SWEEP_BUDGET } from '../constants/quantiser.ts';
import type { SpriteBox, SpriteSymmetry } from '../types/quantiser.ts';
import { FULLY_TRANSPARENT, pixelOffset } from './imageData.ts';
import type { MutableOklab } from './oklab.ts';
import { srgbToOklabInto } from './oklab.ts';
import { pixelDistance } from './pixelDistance.ts';

/**
 * Each sprite's best vertical mirror axis, how much of it actually mirrors about that axis, and
 * whether the snap is entitled to settle it.
 *
 * The question a *sprite* raises that nothing before this pass asks. Generators return figures whose
 * two halves have drifted apart — a helmet crest a pixel off centre, a pauldron two shades lighter
 * on one side, a boot that lost its buckle — and none of that is visible at the magnification a
 * whole sheet fits in. Front and back facings of a character are drawn symmetric by convention, so
 * how far a returned sprite sits from that convention is a measurement of how well the generator
 * complied.
 *
 * **Axis by exhaustive scoring, in the axis-voting lineage this is grounded in.** Every candidate
 * mirror line is scored twice over the pixels it pairs up: by the **share of pairs agreeing** within
 * the tolerance, and by the **mean distance** across them. The distances are the same scaled-OKLab
 * figures every colour dial on this tab is stated in, measured by the shared {@link pixelDistance} —
 * colour and coverage on four axes of one span, so a limb present on one side and absent on the
 * other scores as far apart as black is from white.
 *
 * **The share is what the winner is chosen by, and the mean breaks its ties.** Choosing on the mean
 * alone puts the search on a different quantity from the one the confidence floor is stated in, and
 * the two disagree exactly where a sprite is *bimodal* — which is the shape an asymmetric appendage
 * produces. An axis pairing 950 pixels exactly and leaving 50 unmatched across the full alpha span
 * has a worse mean than an axis missing every pair by a hair, and a far better share; the mean would
 * name the second, report 0% about it, and have the floor refuse a sprite that mirrors 95% about the
 * first. Ranking on the share and settling ties on the mean keeps the reported figure, the gate and
 * the search all describing one axis — and at a loose tolerance, where many candidates saturate at a
 * share of 1, the mean is what decides, so the distance criterion still does the work wherever the
 * share cannot.
 *
 * **Candidate axes step by half a pixel**, because a sprite an even number of pixels wide has no
 * centre column: its mirror line falls *between* two columns. Both are ordinary, and a search that
 * only tried whole columns would report the nearer one along with a confidence halved by the
 * half-pixel registration error it had introduced itself.
 *
 * **The search is centred on the box and bounded three ways.** A tight bounding box centres a
 * symmetric sprite exactly, so the box centre is the prior; what moves the true axis off it is an
 * asymmetric appendage, which shifts the centre by half of however far that appendage sticks out. The
 * reach is therefore {@link SYMMETRY_AXIS_SEARCH} drawn pixels, narrowed to a quarter of the box's
 * width — past which a candidate leaves more of the sprite unpaired than it pairs up — and narrowed
 * again by {@link SYMMETRY_SWEEP_BUDGET}, which is what stops one very large sprite turning a
 * keystroke into seconds of work.
 *
 * **That third bound costs almost nothing, because the reach is absolute and sprites are not.** Eight
 * pixels either way is a real correction on a sprite 32 across and is four tenths of one per cent on
 * a sprite 2048 across, where the appendage that moved the centre would have to be a thousand pixels
 * long for the sweep to reach it. So the sheets the budget narrows are the sheets the extra
 * candidates were never going to help, and the reference sheet — fifteen sprites at 24 to 35 pixels
 * across — is not narrowed at all.
 *
 * An axis genuinely further out than the reach comes back as a **low confidence about the centre**,
 * which is the honest answer rather than a wrong axis stated confidently.
 *
 * **Only pairs where at least one side carries coverage are counted.** A pair of empty pixels is not
 * evidence of anything, and a bounding box is mostly empty at its corners — counting those would
 * report a sprite holding a diagonal sword as almost perfectly symmetric, because the sword is a
 * handful of pixels against a box full of agreeing emptiness.
 *
 * Pure. It runs on the finished sheet in drawn pixels, over the boxes `spriteSegments` found there,
 * so everything it says is stated in the coordinates the preview draws and the panel reports.
 *
 * **The bounds are what make it affordable**, and the reference sheet is where that was measured: a
 * `CHECK` over its fifteen sprites costs about a **thirtieth** of the whole pipeline's work on the
 * same sheet. The budget is what makes that hold on sheets the reference sheet says nothing about —
 * the sweep visits at most {@link SYMMETRY_SWEEP_BUDGET} pixels however the sprites are shaped,
 * which is one pass over the largest sheet this tab admits.
 */
export function sheetSymmetry(
  image: ImageData,
  boxes: readonly SpriteBox[],
  tolerance: number,
  /** The share a sprite must already reach before the snap may settle it, or `null` to snap none. */
  floor: number | null,
): SpriteSymmetry[] {
  // One reach for the whole sheet rather than one per sprite, because the budget is a statement about
  // the *pass*: bounded per sprite, a sheet of two hundred sprites would spend two hundred times it.
  // Every sprite is searched to the same depth, which is also what keeps two sprites of one size on
  // one sheet comparable with each other.
  const reach = affordableReach(boxes);

  return boxes.map((box) => {
    const { axis, confidence, paired } = bestAxis(image, box, tolerance, reach);
    // A sprite with no pairs at all — one column wide — is symmetric about its own column and has
    // nothing whatever to settle, so the snap must not claim it. Marked, it would cost a copy of the
    // sheet and a second segmentation to rewrite no pixel, and the panel would print "settled" on a
    // row where nothing was. A pole, a spear and a rope are all one column wide.
    return { box, axis, confidence, snapped: paired && floor !== null && confidence >= floor };
  });
}

/**
 * How far either side of centre every sprite on this sheet may be searched, in drawn pixels.
 *
 * The sweep is `4 × reach + 1` passes over each box, so the whole pass costs that many times the
 * sprites' combined area — and {@link SYMMETRY_SWEEP_BUDGET} is the ceiling that product may not
 * cross. Divided out and floored to a reach, with a floor of zero: a sheet whose sprites are large
 * enough to exhaust the budget on their own is searched about the box centre alone, which is where a
 * sprite that large has its axis anyway.
 */
function affordableReach(boxes: readonly SpriteBox[]): number {
  const area = boxes.reduce((total, box) => total + box.width * box.height, 0);
  if (area === 0) return SYMMETRY_AXIS_SEARCH;
  const sweeps = Math.floor(SYMMETRY_SWEEP_BUDGET / area);
  return Math.max(0, Math.min(SYMMETRY_AXIS_SEARCH, Math.floor((sweeps - 1) / 4)));
}

/**
 * The mirror line one sprite scores best about, and the share of its pairs that agree there.
 *
 * The box's pixels are converted to OKLab **once**, into flat arrays the candidate sweep then reads
 * without touching the image again — the conversion is by far the most expensive step, and a search
 * that redid it per candidate would pay for it up to thirty-three times over. The arrays cover the
 * box's own extent rather than the sheet's, so a sheet of twelve sprites allocates twelve small
 * scratches instead of one the size of the result.
 *
 * Candidates are tried **outward from the box centre** and an improvement has to be strict on both
 * figures, so a tie falls to the axis nearest the centre. That is what makes the answer stable: a
 * flat-coloured sprite mirrors perfectly about every axis its silhouette allows, and with no order to
 * the sweep the winner would be whichever candidate the loop happened to reach last.
 */
function bestAxis(
  image: ImageData,
  box: SpriteBox,
  tolerance: number,
  sheetReach: number,
): { axis: number; confidence: number; paired: boolean } {
  const patch = readPatch(image, box);

  // Doubled coordinates throughout, so a half-pixel axis is still an integer and the partner of
  // column `x` is the plain subtraction `doubled − x`. An even doubled value puts the line down a
  // column's middle; an odd one puts it on the seam between two columns.
  const centre = 2 * box.left + box.width - 1;
  // A quarter of the width, because past that a candidate leaves more of the sprite unpaired than it
  // pairs up — and never past what the sheet's own budget affords.
  const reach = Math.min(sheetReach, Math.floor(box.width / SEARCH_WIDTH_SHARE));

  let bestDoubled = centre;
  let best = { score: Number.POSITIVE_INFINITY, confidence: -1, counted: 0 };

  for (const step of outward(2 * reach)) {
    const scored = scoreAxis(patch, box, centre + step, tolerance);
    const better =
      scored.confidence > best.confidence ||
      (scored.confidence === best.confidence && scored.score < best.score);
    if (!better) continue;
    bestDoubled = centre + step;
    best = scored;
  }

  return { axis: bestDoubled / 2, confidence: best.confidence, paired: best.counted > 0 };
}

/** One over the share of its own width a sprite may be searched either side of centre — see above. */
const SEARCH_WIDTH_SHARE = 4;

/** `0, −1, +1, −2, +2, …` out to `±reach` — the order that makes a tie fall to the box centre. */
function* outward(reach: number): Generator<number> {
  yield 0;
  for (let step = 1; step <= reach; step += 1) {
    yield -step;
    yield step;
  }
}

/** One sprite's pixels in OKLab, converted once for the whole candidate sweep to read. */
interface Patch {
  readonly L: Float32Array;
  readonly a: Float32Array;
  readonly b: Float32Array;
  readonly alpha: Uint8Array;
}

/** The box's pixels, brought out of the sheet's bytes into the four flat arrays above. */
function readPatch(image: ImageData, box: SpriteBox): Patch {
  const { left, top, width, height } = box;
  const count = width * height;
  const patch: Patch = {
    L: new Float32Array(count),
    a: new Float32Array(count),
    b: new Float32Array(count),
    alpha: new Uint8Array(count),
  };

  const color: MutableOklab = { L: 0, a: 0, b: 0 };
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const from = pixelOffset(image.width, left + column, top + row);
      const at = row * width + column;
      const alpha = image.data[from + 3] ?? 0;
      patch.alpha[at] = alpha;
      // A cleared pixel's colour is never compared — see `pixelDistance` — so converting it would be
      // work spent on bytes nobody can see, on the pixels a bounding box holds most of.
      if (alpha === FULLY_TRANSPARENT) continue;
      srgbToOklabInto(color, image.data[from] ?? 0, image.data[from + 1] ?? 0, image.data[from + 2] ?? 0);
      patch.L[at] = color.L;
      patch.a[at] = color.a;
      patch.b[at] = color.b;
    }
  }

  return patch;
}

/**
 * One candidate axis scored: the mean distance across the pairs it makes, and the share agreeing.
 *
 * **Every unordered pair is visited exactly once**, which takes a condition rather than the obvious
 * `partner > column`. A pixel whose partner falls off the *left* of the box has the smaller column of
 * the two outside the box, so it would never be reached as a left-hand member and its asymmetry
 * would go uncounted — while the mirror case on the right was counted, quietly biasing the search
 * toward axes left of centre.
 *
 * A partner outside the box is measured as **fully transparent**, which is what makes an off-centre
 * candidate pay for the region it cannot pair: the box is the sprite's whole extent, so a pixel with
 * no counterpart inside it has no counterpart at all.
 *
 * `score` is the mean rather than the sum, so candidates pairing different numbers of pixels stay
 * comparable. A candidate pairing none — reachable only where the box is one column wide — scores
 * zero and is perfectly confident, because a single column *is* symmetric about itself; `counted` is
 * what lets the caller tell that apart from a sprite that genuinely mirrors, which matters because
 * there is nothing there for a snap to rewrite.
 */
function scoreAxis(
  patch: Patch,
  box: SpriteBox,
  doubled: number,
  tolerance: number,
): { score: number; confidence: number; counted: number } {
  const { left, width, height } = box;
  const first: MutableOklab = { L: 0, a: 0, b: 0 };
  const second: MutableOklab = { L: 0, a: 0, b: 0 };

  let sum = 0;
  let counted = 0;
  let matched = 0;

  for (let row = 0; row < height; row += 1) {
    const start = row * width;
    for (let column = 0; column < width; column += 1) {
      const here = left + column;
      const partner = doubled - here;
      if (partner === here) continue;
      const inside = partner >= left && partner < left + width;
      if (inside && partner < here) continue;

      const at = start + column;
      const alpha = patch.alpha[at] ?? 0;
      const otherAt = start + (partner - left);
      const otherAlpha = inside ? (patch.alpha[otherAt] ?? 0) : FULLY_TRANSPARENT;
      if (alpha === FULLY_TRANSPARENT && otherAlpha === FULLY_TRANSPARENT) continue;

      first.L = patch.L[at] ?? 0;
      first.a = patch.a[at] ?? 0;
      first.b = patch.b[at] ?? 0;
      second.L = inside ? (patch.L[otherAt] ?? 0) : 0;
      second.a = inside ? (patch.a[otherAt] ?? 0) : 0;
      second.b = inside ? (patch.b[otherAt] ?? 0) : 0;

      const distance = pixelDistance(first, alpha, second, otherAlpha);
      sum += distance;
      counted += 1;
      if (distance <= tolerance) matched += 1;
    }
  }

  if (counted === 0) return { score: 0, confidence: 1, counted };
  return { score: sum / counted, confidence: matched / counted, counted };
}
