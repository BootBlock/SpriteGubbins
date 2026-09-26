import { COVERAGE_FLOOR } from '../constants/quantiser.ts';
import { pixelOffset } from './imageData.ts';
import { srgbToOklab } from './oklab.ts';
import { oklabLattice } from './oklabLattice.ts';

/** A colour that stands, where it sits, and the order it came to stand in. */
interface Keeper {
  readonly key: number;
  readonly L: number;
  readonly a: number;
  readonly b: number;
  readonly rank: number;
}

/**
 * The colour merge: every colour in the image folded into the most popular colour within reach of
 * it, so near-duplicates collapse sheet-wide.
 *
 * The failure this serves is the one the per-pixel cleanup cannot touch: *dense* speckle. A
 * reduced sheet keeps several entries a dozen steps apart for what the eye reads as one
 * surface, and neighbouring pixels alternate between them everywhere — so no pixel is ever the
 * lone dissenter a neighbourhood pass can outvote, and the fills stay dithered however hard that
 * pass runs. The redundancy is in the *palette*, and this pass removes it there: colours are
 * ranked by how many pixels carry them, each colour in rank order either stands (no keeper within
 * the tolerance) or folds into the highest-ranked keeper it sits within tolerance of, and every
 * pixel of a folded colour is repainted with its keeper. One decision per colour, applied
 * everywhere at once — which is what makes a green panel become *one* green rather than a
 * negotiation, and what makes the per-pixel cleanup effective afterwards, because majorities can
 * finally form.
 *
 * Population order is what keeps it honest: the colours that stand are the ones the sheet
 * actually uses most, so a surface's dominant shade absorbs its satellites rather than the other
 * way round — and rank ties break by packed value, so the outcome is deterministic on every
 * input. Distance is straight-line **scaled OKLab** against the caller's tolerance — each unique
 * colour converted once, so what a rung of the dial folds is a perceptual difference, the same
 * one everywhere in the gamut. RGB distance was not that: it held near-identical dark fills
 * apart while folding light tones a reader tells easily, so one dial value over-merged one end
 * of the sheet to reach the other. **Unlike the cleanup, the tolerance is this pass's only line
 * defence** — there is no neighbourhood majority to protect a stroke — and OKLab widens that
 * defence where it matters, spacing ink from a dark fill as far apart as a reader sees them. The
 * top rungs can still reach from near-black ink to a dark shadow fill and will fold whichever of
 * the two the sheet uses less. That is offered knowingly: it is the flattening a heavy merge
 * *is*, and the preview sits beside the dial. Colour means RGB bytes and alpha is coverage,
 * untouched: colours tally across their alphas, and a repainted pixel keeps its own. Pixels under
 * `COVERAGE_FLOOR` are outside it entirely, because their channels are rounding noise rather than a
 * colour to rank or repaint. A tolerance of zero returns the input's bytes unchanged.
 *
 * The keeper search is bucketed on `oklabLattice`, a lattice of tolerance-sized cells over the
 * OKLab axes, so each colour consults only the twenty-seven cells that could hold a keeper within
 * reach rather than every keeper so far — which is what keeps the pass near-linear on the worst
 * input the app admits: a sheet quantised at a grid of 1 with its colours left alone can carry
 * *millions* of distinct colours, and the plain quadratic scan measured a quarter of a minute there.
 */
export function mergeColors(image: ImageData, tolerance: number): ImageData {
  const output = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
  if (tolerance <= 0) return output;
  const limit = tolerance * tolerance;

  const counts = new Map<number, number>();
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const at = pixelOffset(image.width, x, y);
      if ((image.data[at + 3] ?? 0) < COVERAGE_FLOOR) continue;
      const key = ((image.data[at] ?? 0) * 256 + (image.data[at + 1] ?? 0)) * 256 + (image.data[at + 2] ?? 0);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([key]) => key);
  // Keepers filed on the tolerance lattice; `rank` is insertion order, which is what "the
  // highest-ranked keeper within tolerance" is judged by across cells.
  const keepers = oklabLattice<Keeper>(tolerance);
  const target = new Map<number, number>();
  const nearby: Keeper[] = [];
  let standing = 0;

  for (const key of ranked) {
    const color = srgbToOklab((key >>> 16) & 0xff, (key >>> 8) & 0xff, key & 0xff);
    let home = key;
    let homeRank = Infinity;
    keepers.near(color, nearby);
    for (const keeper of nearby) {
      if (keeper.rank >= homeRank) continue;
      const dL = color.L - keeper.L;
      const dA = color.a - keeper.a;
      const dB = color.b - keeper.b;
      if (dL * dL + dA * dA + dB * dB <= limit) {
        home = keeper.key;
        homeRank = keeper.rank;
      }
    }
    if (home === key) {
      keepers.add(color, { key, L: color.L, a: color.a, b: color.b, rank: standing });
      standing += 1;
    } else {
      target.set(key, home);
    }
  }
  if (target.size === 0) return output;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const at = pixelOffset(image.width, x, y);
      if ((output.data[at + 3] ?? 0) < COVERAGE_FLOOR) continue;
      const key =
        ((output.data[at] ?? 0) * 256 + (output.data[at + 1] ?? 0)) * 256 + (output.data[at + 2] ?? 0);
      const home = target.get(key);
      if (home === undefined) continue;
      output.data[at] = (home >>> 16) & 0xff;
      output.data[at + 1] = (home >>> 8) & 0xff;
      output.data[at + 2] = home & 0xff;
    }
  }

  return output;
}
