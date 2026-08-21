import { PROXY_CROP_CELLS, PROXY_CROP_COUNT } from '../constants/autoTune.ts';
import type { TuneOutcome, TuneReading, TuneStageReport, TunedDials } from '../types/autoTune.ts';
import type { QuantiseSettings } from '../types/quantiser.ts';
import { cropImage } from './cropImage.ts';
import { keyBackground } from './keyBackground.ts';
import { proxyCrops } from './proxyCrops.ts';
import { quantiseImage } from './quantiseImage.ts';
import { meanSsim } from './ssim.ts';
import { TUNE_STAGES } from './tuneStages.ts';
import { chooseByElbow } from './tuneScore.ts';
import { upscaleNearest } from './upscaleNearest.ts';

/** One window of the sheet, and the artwork a candidate's result is judged against. */
interface Sample {
  readonly crop: ImageData;
  /**
   * The crop as the reader wants it — keyed, where keying is in force.
   *
   * **Not the raw crop**, and the difference is the whole comparison on a keyed sheet. A candidate's
   * result has its background cleared, so measuring it against a crop that still carries the key
   * field would score every candidate against a field none of them produces. Keying the reference
   * puts both sides in the same terms.
   */
  readonly reference: ImageData;
}

/**
 * Where this sheet's dials want to be, found by running them.
 *
 * **The one thing on the Quantise tab that answers a question rather than asking one.** Eighteen
 * dials arrive at their opening positions, which are a guess that suits some sheets and not others,
 * and nothing on screen says which kind of sheet is in front of the reader. This sweeps the dials
 * that a fidelity score can honestly rank — see {@link TunedDials} for the ones it will not touch and
 * why each is a rule — and reports where the sheet itself says they belong.
 *
 * **It reads crops, not the sheet.** Every candidate runs the whole pipeline, and the tab admits a
 * sheet of 16.8 million pixels; three windows of forty cells is what makes the sweep a second or two
 * rather than a minute. See `proxyCrops` for how the windows are chosen and why they are aligned to
 * the grid's lattice.
 *
 * **Each candidate is scored on how faithfully its result reproduces the crop and how few colours it
 * spends doing it**, and the two are traded by the elbow rather than by a weight nobody could
 * defend — see `chooseByElbow`. Fidelity is measured on the result *re-upscaled* by the grid, which
 * is what makes a downscale comparable with the artwork it came from at all.
 *
 * **The third scorer the roadmap listed — how sharply the result sits on its lattice — is not here,
 * and the reason is that it cannot separate anything this function is choosing between.** Every
 * candidate is judged on its result magnified by the same grid, and a nearest-neighbour magnification
 * puts *all* of a result's change exactly on that lattice — which is the quantity
 * `GRID_ESTIMATION_THRESHOLD` scores, and it is 1 for every candidate however the dials moved. The
 * grid is settled before this runs, by measurement or by the reader, so the question a lattice score
 * asks has already been answered. `autoTune.test.ts` pins it: candidates whose fidelity is far apart
 * put every one of their steps on the lattice alike.
 *
 * Pure, like everything else in this directory, which is what lets `autoTuneWorker.ts` run it on a
 * thread without a line of it changing.
 *
 * Throws where the sheet is smaller than one cell of the grid in force, which is the one state with
 * no window to read and therefore nothing to say.
 */
export function autoTune(image: ImageData, settings: QuantiseSettings): TuneOutcome {
  const crops = proxyCrops(image, settings.grid, PROXY_CROP_CELLS, PROXY_CROP_COUNT);
  const first = crops[0];
  if (first === undefined) {
    throw new Error('This sheet is smaller than one cell of the grid in force, so there is nothing to sweep');
  }

  const samples: readonly Sample[] = crops.map((crop) => ({
    crop: crop.image,
    reference: settings.key === null ? crop.image : keyBackground(crop.image, settings.key).image,
  }));

  let settled = tunedDialsOf(settings);
  const baseline = read(settled, samples, settings);
  let reading = baseline;
  // The starting position counts: it was run, and it is one of the answers the elbow could return.
  let candidates = 1;
  const stages: TuneStageReport[] = [];

  for (const stage of TUNE_STAGES) {
    const plan = stage.plan(settled);
    if ('skipped' in plan) {
      stages.push({
        stage: stage.name,
        candidates: 0,
        skipped: plan.skipped,
        settled: stage.describe(settled),
      });
      continue;
    }

    const readings = plan.candidates.map((dials) => read(dials, samples, settings));
    const chosenFirst = readings[0];
    // The plan's candidates are a non-empty list by their own type, so this holds; the check is what
    // `noUncheckedIndexedAccess` asks of an index rather than a case that arises.
    if (chosenFirst === undefined) continue;
    const chosen = chooseByElbow([chosenFirst, ...readings.slice(1)]);
    settled = plan.candidates[chosen] ?? settled;
    reading = readings[chosen] ?? reading;
    candidates += plan.candidates.length;

    stages.push({
      stage: stage.name,
      candidates: plan.candidates.length,
      skipped: null,
      settled: stage.describe(settled),
    });
  }

  return {
    dials: settled,
    crops: crops.length,
    cropEdge: first.image.width,
    candidates,
    reading,
    baseline,
    stages,
  };
}

/**
 * How one set of positions does across the crops.
 *
 * Averaged over the crops rather than taken from the best of them, because the dials are being
 * chosen for the whole sheet: a position that is excellent on one window and poor on the other two
 * is the wrong answer, and a maximum would pick it.
 */
function read(dials: TunedDials, samples: readonly Sample[], settings: QuantiseSettings): TuneReading {
  let fidelity = 0;
  let colors = 0;

  for (const sample of samples) {
    const result = quantiseImage(sample.crop, { ...settings, ...dials });
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

/**
 * The swept dials, read off a full settings object.
 *
 * Written out rather than spread, because {@link TunedDials} is a deliberate subset: a `...settings`
 * here would carry the grid, the keying and the dials the sweep must not move into the value the
 * stages then vary.
 */
function tunedDialsOf(settings: QuantiseSettings): TunedDials {
  return {
    vote: settings.vote,
    outlineExpansion: settings.outlineExpansion,
    lineStrength: settings.lineStrength,
    trimStrength: settings.trimStrength,
    inkThreshold: settings.inkThreshold,
    colorMerge: settings.colorMerge,
    fillCleanup: settings.fillCleanup,
    cleanupPasses: settings.cleanupPasses,
  };
}
