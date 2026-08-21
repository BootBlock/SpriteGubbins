import { PROXY_CROP_CELLS, PROXY_CROP_COUNT } from '../constants/autoTune.ts';
import type { TuneOutcome, TuneStageReport, TunedDials } from '../types/autoTune.ts';
import type { QuantiseSettings } from '../types/quantiser.ts';
import { keyBackground } from './keyBackground.ts';
import { proxyCrops } from './proxyCrops.ts';
import { readCandidate } from './tuneCandidate.ts';
import type { Sample } from './tuneCandidate.ts';
import { chooseByElbow } from './tuneScore.ts';
import { TUNE_STAGES, withIncumbent } from './tuneStages.ts';

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
 * sheet of 16.8 million pixels; three windows of forty cells is what keeps the sweep to the few
 * seconds `constants/autoTune.ts` measures rather than a minute. See `proxyCrops` for how the
 * windows are chosen and why they are aligned to the grid's lattice.
 *
 * **Each candidate is scored on how faithfully its result reproduces the crop and how few colours it
 * spends doing it** — see `readCandidate` — and the two are traded by the elbow rather than by a
 * weight nobody could defend, which is `chooseByElbow`.
 *
 * **Every stage ranks the positions in force alongside its own**, which is `withIncumbent`: a stage
 * that cannot separate its candidates therefore leaves each dial exactly where the reader had it,
 * and a stage that moves one has compared it against the one it replaced.
 *
 * **The third scorer the roadmap listed — how sharply the result sits on its lattice — is not here,
 * and the reason is that it cannot separate anything this function is choosing between.** Every
 * candidate is judged on its result magnified by the same grid, and a nearest-neighbour magnification
 * puts *all* of a result's change exactly on that lattice — which is the quantity
 * `GRID_ESTIMATION_THRESHOLD` scores, so it is 1 for every candidate however the dials moved. The
 * grid is settled before this runs, by measurement or by the reader, so the question a lattice score
 * asks has already been answered. `autoTune.test.ts` demonstrates the pair: candidates whose
 * fidelities are far apart put every one of their steps on the lattice alike.
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
  const baseline = readCandidate(settled, samples, settings);
  let reading = baseline;
  // The starting position counts: it was run, and every stage below ranks it against its own.
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

    const tried = withIncumbent(plan.candidates, settled);
    const readings = tried.map((dials) => readCandidate(dials, samples, settings));
    const chosenFirst = readings[0];
    // `tried` is a non-empty list by its own type, so this holds; the check is what
    // `noUncheckedIndexedAccess` asks of an index rather than a case that arises.
    if (chosenFirst === undefined) continue;
    const chosen = chooseByElbow([chosenFirst, ...readings.slice(1)]);
    settled = tried[chosen] ?? settled;
    reading = readings[chosen] ?? reading;
    candidates += tried.length;

    stages.push({
      stage: stage.name,
      candidates: tried.length,
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
