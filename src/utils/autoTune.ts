import { PROXY_CROP_CELLS, PROXY_CROP_COUNT, TUNE_ROUNDS } from '../constants/autoTune.ts';
import type { TuneOutcome, TuneStageName, TunedDials } from '../types/autoTune.ts';
import type { QuantiseSettings } from '../types/quantiser.ts';
import { hardenSilhouette } from './hardenSilhouette.ts';
import { keyBackground } from './keyBackground.ts';
import { proxyCrops } from './proxyCrops.ts';
import { readCandidate } from './tuneCandidate.ts';
import type { Sample } from './tuneCandidate.ts';
import { chooseByElbow } from './tuneScore.ts';
import { restoreSkipped, sameTunedDials, tunedDialsOf, withIncumbent } from './tuneStage.ts';
import { TUNE_STAGES } from './tuneStages.ts';

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
 * sheet of 16.8 million pixels; five windows of forty cells is what keeps the sweep to the minute
 * `constants/autoTune.ts` costs it at rather than the hour the sheet itself would take. See
 * `proxyCrops` for how the windows are chosen and why they are aligned to the grid's lattice.
 *
 * **Each candidate is scored on how faithfully its result reproduces the crop and how few colours it
 * spends doing it** — see `readCandidate` — and the two are traded by the elbow rather than by a
 * weight nobody could defend, which is `chooseByElbow`.
 *
 * **Every stage ranks the positions in force alongside its own**, which is `withIncumbent`: a stage
 * that cannot separate its candidates therefore leaves each dial exactly where the reader had it, and
 * a stage that moves one has compared it against the one it replaced.
 *
 * **It goes round the stages until one of them ends somewhere it has already been**, up to
 * `TUNE_ROUNDS` times. One pass down a coordinate descent settles each dial against the ones ahead of
 * it in the pipeline and against the *opening positions* of the ones behind it, which is only half an
 * answer; a second round re-asks every one of those questions from where the first left everything.
 *
 * **The stop is a repeat of any earlier round's position, not only of the round before.** What the
 * stages descend on is not a scalar objective — the elbow ranks a pair of figures and its knee moves
 * with the candidate set — so a round can end somewhere it has been two rounds earlier and go round
 * that loop for ever. Measured on the reference sheet the descent reaches a fixed point at the fifth
 * round; on three of the other corpus sheets it reaches one at the second. A repeat of *any* position
 * already seen means every later round would retrace the same ground, which is what makes stopping
 * there a fact about the descent rather than a budget running out. `TUNE_ROUNDS` is what bounds the
 * case where none is found.
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
    // **The edge hardening is applied to the reference too**, and for the reason the keying is: a
    // candidate's result has been hardened, so a reference that still carried its soft outline would
    // score every candidate against a fringe none of them produces. Both sides in the same terms, in
    // the pipeline's own order — key first, then harden.
    reference: hardenSilhouette(
      settings.key === null ? crop.image : keyBackground(crop.image, settings.key).image,
      settings.silhouetteThreshold,
    ),
  }));

  const opening = tunedDialsOf(settings);
  let settled = opening;
  const baseline = readCandidate(settled, samples, settings);
  let reading = baseline;
  // The starting position counts: it was run, and every stage below ranks it against its own.
  let candidates = 1;
  const spent = new Map<TuneStageName, number>();
  let skips = new Map<TuneStageName, string>();
  // Seeded with where the reader started, so a first round that moves nothing is a first round that
  // ends the sweep — the same fact every later round's repeat states.
  const visited: TunedDials[] = [settled];
  let rounds = 0;

  while (rounds < TUNE_ROUNDS) {
    rounds += 1;
    // Rebuilt each round rather than accumulated, because a skip is a fact about the round it
    // happened in: a stage that skipped in round one and swept in round two is a stage that ran.
    skips = new Map();

    for (const stage of TUNE_STAGES) {
      const plan = stage.plan(settled, settings);
      if ('skipped' in plan) {
        skips.set(stage.name, plan.skipped);
        // **And its dials go back where the reader had them, here rather than at the end.** Rounds
        // are what make this necessary at all: a stage can sweep under one reading and then be
        // skipped because a later round moved off it, which leaves positions chosen under a reading
        // the sweep has abandoned — measured on `test_sprites/armour.png`, a line strength of 2 and
        // an ink threshold of 56 both settled under `INK_WEIGHTED` and survived the descent's move
        // to `K_CENTROID`. They reach no pixel of the result, because each skip predicate is exactly
        // the pipeline's own gate; they reach the *tab*, where they are two sliders the reader never
        // touched sitting somewhere new, ready to take effect the moment they change the control
        // that was gating them.
        //
        // **Inside the round rather than after the last one**, so the position the descent carries
        // is one it would report — which is what keeps the fixed point `visited` looks for a fixed
        // point of the answer rather than of an intermediate the restore then moves. It also puts
        // the reader's own ink dials back into the *next* round's reading stage, which is
        // `withIncumbent`'s principle one level up: a reading is ranked against the dials in force
        // rather than against ones an abandoned branch left behind.
        settled = restoreSkipped(settled, opening, stage);
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
      // Whatever earlier rounds spent on this stage stands: the count is what the sweep cost, and a
      // stage that ran in round one and skipped in round two did both.
      spent.set(stage.name, (spent.get(stage.name) ?? 0) + tried.length);
    }

    // A round that ended anywhere the descent has already stood is the round that ends the sweep:
    // every stage is a function of the position it starts from, so retracing that position retraces
    // every answer after it. That covers a fixed point and a longer loop alike.
    if (visited.some((seen) => sameTunedDials(seen, settled))) break;
    visited.push(settled);
  }

  return {
    dials: settled,
    crops: crops.length,
    cropEdge: first.image.width,
    rounds,
    candidates,
    reading,
    baseline,
    // Built here rather than as each stage ran, and in the order the stages run: a phrase describes
    // where a dial *ends up*, and a stage that ran early in the last round is describing a position
    // a later stage's restore may still have moved. Each stage reads only its own dials, so one pass
    // over the final position describes every one of them correctly.
    stages: TUNE_STAGES.map((stage) => ({
      stage: stage.name,
      candidates: spent.get(stage.name) ?? 0,
      skipped: skips.get(stage.name) ?? null,
      settled: stage.describe(settled),
    })),
  };
}
