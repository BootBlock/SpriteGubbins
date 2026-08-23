import type { TuneReading, TunedDials } from '../types/autoTune.ts';
import type { QuantiseSettings } from '../types/quantiser.ts';
import { cropImage } from './cropImage.ts';
import { quantiseImage } from './quantiseImage.ts';
import { meanSsim } from './ssim.ts';
import { upscaleNearest } from './upscaleNearest.ts';

/** One window of the sheet, and the artwork a candidate's result is judged against. */
export interface Sample {
  readonly crop: ImageData;
  /**
   * The crop as the reader wants it — keyed and hardened, where either is in force.
   *
   * **Not the raw crop**, and the difference is the whole comparison on a keyed sheet. A candidate's
   * result has its background cleared, so measuring it against a crop that still carries the key
   * field would score every candidate against a field none of them produces. The same holds for the
   * edge hardening, which is why `autoTune` applies both, in the pipeline's own order: a candidate's
   * silhouette is hard, and a reference that still carried its fringe would score every one of them
   * against a softness none of them produces. Putting both sides in the same terms is the point.
   */
  readonly reference: ImageData;
}

/**
 * How one set of dial positions does across the crops: how faithfully it reproduces them, and what
 * it spends doing it.
 *
 * The sweep's inner loop, in its own file because it is a second responsibility rather than a helper
 * — `autoTune` decides *which* positions to try, and this decides what one position is worth.
 *
 * **Fidelity is measured on the result re-upscaled by the grid**, which is what makes a downscale
 * comparable with the artwork it came from at all: the pipeline's output is one pixel per cell, and
 * the crop is one pixel per source pixel. Nearest neighbour, so the magnification invents no colour
 * and moves no edge — the comparison is against what the reader would see at 1:1 in the preview.
 *
 * **Averaged over the crops rather than taken from the best of them**, because the dials are being
 * chosen for the whole sheet: a position that is excellent on one window and poor on the other two
 * is the wrong answer, and a maximum would pick it.
 *
 * Pure, like everything else here. The caller passes the same `settings` to every candidate and
 * varies only the swept dials, so the grid, the keying and the colour reduction are constant across
 * a comparison — which is what makes two candidates' readings comparable at all.
 */
export function readCandidate(
  dials: TunedDials,
  samples: readonly Sample[],
  settings: QuantiseSettings,
): TuneReading {
  let fidelity = 0;
  let colors = 0;

  for (const sample of samples) {
    // **The anti-aliasing is forced off, whatever the tab has it set to.** The sweep is choosing
    // dials that all run *ahead* of it, and it ranks a candidate on two figures the pass would
    // corrupt: it moves the result back toward the smooth source, which is what `fidelity` measures,
    // and every coverage it writes is another entry in `colors`, which is what the elbow trades that
    // fidelity against. Measured on `test_sprites/armour.png` at a budget of 16, the same sweep
    // reports 15.7 → 6.0 colours with the pass off and 58.7 → 36.7 with it on — a figure about the
    // fringe rather than about the dials being swept, and the one the panel's badge shows. It also
    // saves every candidate a pass it could not be ranked by.
    const result = quantiseImage(sample.crop, { ...settings, ...dials, antiAlias: 'OFF' });
    const magnified = upscaleNearest(result.image, settings.grid);
    // The mesh is measured per transform and may cut a crop into a whole number of cells that is not
    // the crop's own edge over the grid — a drifting sheet is exactly what `boundaryMesh` exists for.
    // So the two are trimmed to what they share rather than assumed equal, and the trim is a copy
    // only where there is something to trim.
    const width = Math.min(magnified.width, sample.reference.width);
    const height = Math.min(magnified.height, sample.reference.height);
    fidelity += meanSsim(trim(sample.reference, width, height), trim(magnified, width, height));
    colors += result.colors;
  }

  return { fidelity: fidelity / samples.length, colors: colors / samples.length };
}

/** The image itself where it is already this size, and its top-left rectangle where it is larger. */
function trim(image: ImageData, width: number, height: number): ImageData {
  return image.width === width && image.height === height ? image : cropImage(image, 0, 0, width, height);
}
