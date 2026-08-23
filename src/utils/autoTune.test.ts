import { describe, expect, it, vi } from 'vitest';
import { PROXY_CROP_CELLS, PROXY_CROP_COUNT, TUNE_ROUNDS } from '../constants/autoTune.ts';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import { imageFrom, soften } from '../test/images.ts';
import { TUNED_DIAL_KEYS, TUNE_STAGE_NAMES } from '../types/autoTune.ts';
import type { TunedDials } from '../types/autoTune.ts';
import type { QuantiseSettings, Rgba } from '../types/quantiser.ts';
import { autoTune } from './autoTune.ts';
import { keyBackground } from './keyBackground.ts';
import { oklabPlanes } from './oklabPlanes.ts';
import { proxyCrops } from './proxyCrops.ts';
import { quantiseImage } from './quantiseImage.ts';
import { meanSsim } from './ssim.ts';
import { readCandidate } from './tuneCandidate.ts';
import { tunedDialsOf } from './tuneStage.ts';
import { upscaleNearest } from './upscaleNearest.ts';

const GRID = 4;

/**
 * Long enough for two whole sweeps of the fixture, which is well past Vitest's own five seconds.
 *
 * The sweep runs the pipeline up to `TUNE_ROUNDS` times over every ladder and every crop, which is
 * the trade `constants/autoTune.ts` argues for — so every test in this file is slow by design rather
 * than by accident. **Set for the whole file rather than on the tests that looked slowest**: a single
 * sweep of this fixture takes several seconds on an idle machine and more than five under the
 * parallelism of the whole suite, so a per-test figure produced a file that passed on its own and
 * failed intermittently in the gate — which is the worst of the three states it could have been in.
 */
vi.setConfig({ testTimeout: 60_000 });
const MAGENTA: Rgba = { r: 255, g: 0, b: 255, a: 255 };

/** 32 × 32 of pixel art: two fills, a dark contour between them, and a bright trim along one edge. */
const ART = imageFrom(32, 32, (x, y) => {
  if (x === 15) return { r: 14, g: 12, b: 18, a: 255 };
  if (y === 4) return { r: 245, g: 230, b: 150, a: 255 };
  return x < 15 ? { r: 60, g: 90, b: 150, a: 255 } : { r: 180, g: 110, b: 70, a: 255 };
});

/** The same art on a magenta field, for the keyed cases. */
const ART_ON_KEY = imageFrom(32, 32, (x, y) => {
  if (x < 4 || x >= 28 || y < 4 || y >= 28) return MAGENTA;
  const at = (y * 32 + x) * 4;
  return {
    r: ART.data[at] ?? 0,
    g: ART.data[at + 1] ?? 0,
    b: ART.data[at + 2] ?? 0,
    a: 255,
  };
});

/** What a model hands back: the art drawn at a scale of 4, then resampled so its edges soften. */
const SHEET = soften(upscaleNearest(ART, GRID));
const KEYED_SHEET = soften(upscaleNearest(ART_ON_KEY, GRID));

const BASE: QuantiseSettings = {
  ...QUANTISE_DEFAULT_DIALS,
  grid: GRID,
  key: null,
  reduction: null,
};

const TUNED_KEYS: readonly (keyof TunedDials)[] = TUNED_DIAL_KEYS;

describe('autoTune', () => {
  it('reports every stage once, in the order they run', () => {
    const outcome = autoTune(SHEET, BASE);

    expect(outcome.stages.map((stage) => stage.stage)).toEqual([...TUNE_STAGE_NAMES]);
  });

  it('counts the positions it ran, including the one the reader arrived with', () => {
    const outcome = autoTune(SHEET, BASE);

    // The ceiling `constants/autoTune.ts` states, and the arithmetic it states it from: every stage
    // is walked at most once a round, and no round can cost more than the dearest branch plus the
    // seven ladders that can carry a reader's own position as an extra. What the total is *made of*
    // is asserted where the per-stage counts are.
    expect(outcome.rounds).toBeGreaterThanOrEqual(1);
    expect(outcome.rounds).toBeLessThanOrEqual(TUNE_ROUNDS);
    expect(outcome.candidates).toBeGreaterThan(1);
    expect(outcome.candidates).toBeLessThanOrEqual(1 + TUNE_ROUNDS * (145 + 7));
  });

  it('says why a stage that could not run did not, and where its dials stand either way', () => {
    const outcome = autoTune(SHEET, BASE);

    for (const stage of outcome.stages) {
      if (stage.skipped === null) expect(stage.candidates).toBeGreaterThan(0);
      // A skipped stage may still carry a count, and that is the rounds rather than a contradiction:
      // the reading can move off `INK_WEIGHTED` in a later round than the one that swept the ink
      // dials, and those positions were still run. `skipped` describes the last round to reach the
      // stage; `candidates` is what the sweep spent on it altogether.
      expect(stage.settled.length).toBeGreaterThan(0);
    }
    // The three anti-aliasing stages are skipped in every round on this sheet, since the tab opens
    // that control at `OFF` and the sweep may not move it — so those are the ones that must be zero.
    for (const name of ['ALIAS_CONTOUR', 'ALIAS_RUN', 'ALIAS_BLEND'] as const) {
      const stage = outcome.stages.find((entry) => entry.stage === name);
      expect(stage?.skipped).not.toBeNull();
      expect(stage?.candidates).toBe(0);
    }
  });

  it('reads the crops it says it read', () => {
    const outcome = autoTune(SHEET, BASE);

    expect(outcome.crops).toBeGreaterThan(0);
    expect(outcome.crops).toBeLessThanOrEqual(PROXY_CROP_COUNT);
    expect(outcome.cropEdge).toBe(
      proxyCrops(SHEET, GRID, PROXY_CROP_CELLS, PROXY_CROP_COUNT)[0]?.image.width,
    );
    expect(outcome.cropEdge % GRID).toBe(0);
  });

  it('answers with the twelve dials it is allowed to move and nothing else', () => {
    const outcome = autoTune(SHEET, BASE);

    expect(Object.keys(outcome.dials).sort()).toEqual([...TUNED_KEYS].sort());
  });

  it('gives the same answer twice for the same sheet and the same settings', () => {
    // A reader who presses Auto twice has not asked for two different answers, and the elbow's ties
    // and the crop chooser's are both settled by order rather than by whatever a sort left behind.
    expect(autoTune(SHEET, BASE)).toEqual(autoTune(SHEET, BASE));
  });

  it('lands somewhere that reproduces the artwork', () => {
    const outcome = autoTune(SHEET, BASE);

    expect(outcome.reading.fidelity).toBeGreaterThan(0.5);
    expect(outcome.reading.colors).toBeGreaterThan(0);
  });

  it('starts from the dials it was handed, and says what they were worth', () => {
    const started: QuantiseSettings = { ...BASE, vote: 'K_CENTROID', colorMerge: 24 };

    const outcome = autoTune(SHEET, started);

    // The baseline is a reading of the positions in force, so a sheet swept from two different
    // starting points reports two different baselines even where the sweep ends in the same place.
    expect(outcome.baseline).not.toEqual(autoTune(SHEET, BASE).baseline);
  });

  it('judges a keyed sheet against a keyed reference, not against the key field', () => {
    // The comparison this guards: a candidate's result has its background cleared, so measuring it
    // against a crop that still carries the magenta would score every candidate against a field none
    // of them produces. Below is what that mistake would measure — far under what the sweep reports.
    //
    // Scored through `readCandidate` rather than by hand, and handed the *raw* crop as its reference,
    // which is precisely the mistake stated as data. A hand-rolled magnify-and-compare would be a
    // second copy of that function's own seam, and the copy would not carry the trim it takes: the
    // mesh is measured per transform, so a keyed crop's result need not be the crop's own edge over
    // the grid.
    const keyed: QuantiseSettings = { ...BASE, key: { color: MAGENTA, tolerance: 16 } };
    const [crop] = proxyCrops(KEYED_SHEET, GRID, PROXY_CROP_CELLS, PROXY_CROP_COUNT);
    expect(crop).toBeDefined();
    if (crop === undefined) return;

    const outcome = autoTune(KEYED_SHEET, keyed);
    const score = (reference: ImageData): number =>
      readCandidate(outcome.dials, [{ crop: crop.image, reference }], keyed).fidelity;

    // The same crop, the same dials, the same magnification — only the reference differs, which is
    // what makes the pair a measurement of the mistake rather than of two unrelated runs. The gap on
    // this fixture is about 0.19, and the floor is a wide band below that rather than a tight fit:
    // what is being asserted is that keying the reference is decisively better, not that it is worth
    // one particular figure.
    expect(score(keyBackground(crop.image, { color: MAGENTA, tolerance: 16 }).image)).toBeGreaterThan(
      score(crop.image) + 0.1,
    );
  });

  it('scores every candidate alike on the lattice while their fidelities differ', () => {
    // Why the roadmap's third scorer is not here, shown as the pair it is. A lattice score asks
    // whether the result sits on the grid; every candidate is judged on its result magnified by that
    // same grid, so all of them put all of their change on it by construction of the magnification.
    // That is exactly the point: it is constant where the score the sweep does use is not.
    const [crop] = proxyCrops(SHEET, GRID, PROXY_CROP_CELLS, PROXY_CROP_COUNT);
    expect(crop).toBeDefined();
    if (crop === undefined) return;

    const base = tunedDialsOf(QUANTISE_DEFAULT_DIALS);
    const far: TunedDials[] = [
      { ...base, vote: 'DOMINANT', outlineExpansion: 0 },
      { ...base, vote: 'INK_WEIGHTED', lineStrength: 3, trimStrength: 3 },
      { ...base, vote: 'K_CENTROID', colorMerge: 48, fillCleanup: 48 },
    ];
    const scores = far.map((dials) => {
      const magnified = upscaleNearest(quantiseImage(crop.image, { ...BASE, ...dials }).image, GRID);
      return {
        lattice: offLatticeShare(magnified, GRID),
        fidelity: meanSsim(crop.image, magnified),
      };
    });

    expect(scores.map((score) => score.lattice)).toEqual([0, 0, 0]);
    // And the fidelities the sweep actually ranks on are not all alike, which is the other half of
    // the claim: one scorer separates these candidates and the other cannot.
    expect(new Set(scores.map((score) => score.fidelity)).size).toBeGreaterThan(1);
  });

  it('stops on a repeat rather than at the round cap, and looks back further than one round', () => {
    const outcome = autoTune(SHEET, BASE);

    // This fixture's descent does not reach a fixed point — it settles into a two-round loop, which
    // is the case `TUNE_ROUNDS`' own docblock says the cap exists for. Comparing only against the
    // round *before* would never see that loop close: narrowed to
    // `sameTunedDials(visited.at(-1), settled)` this fixture runs all six rounds and answers with a
    // different position, which is what makes the assertion falsifiable rather than decorative.
    expect(outcome.rounds).toBeGreaterThan(1);
    expect(outcome.rounds).toBeLessThan(TUNE_ROUNDS);
  });

  it('answers the same way however many times it is pressed', () => {
    // A loop rather than a fixed point still has to give the reader a stable answer: pressing Auto
    // on the sheet it has just tuned must not walk the dials somewhere new each time. Three presses,
    // because a two-round loop would show up on the second and a longer one on the third.
    const first = autoTune(SHEET, BASE);
    const second = autoTune(SHEET, { ...BASE, ...first.dials });
    const third = autoTune(SHEET, { ...BASE, ...second.dials });

    expect(second.dials).toEqual(first.dials);
    expect(third.dials).toEqual(first.dials);
  });

  it('hands back the dials of a stage that was skipped in the last round', () => {
    // The defect rounds introduced: a stage can sweep under one reading and then be skipped because
    // a later round moved off it, which leaves the reader with dial positions chosen under a reading
    // the sweep abandoned — and the panel renders the skip sentence instead of a count, so nothing
    // on screen says they moved. Started from an ink blend the reader has set by hand, so a stage
    // that hands its dials back is visibly distinguishable from one that never had them.
    const started: QuantiseSettings = { ...BASE, lineStrength: 2.5, trimStrength: 1, inkThreshold: 40 };

    const outcome = autoTune(SHEET, started);
    const inkStages = outcome.stages.filter(
      (stage) => stage.stage === 'INK_BLEND' || stage.stage === 'INK_THRESHOLD',
    );

    // The claim is only worth anything if those stages did skip, and if the sweep did leave the
    // reading that makes them live — both of which this fixture does.
    expect(outcome.dials.vote).not.toBe('INK_WEIGHTED');
    for (const stage of inkStages) expect(stage.skipped).toMatch(/blends no ink/);
    expect(outcome.dials.lineStrength).toBe(started.lineStrength);
    expect(outcome.dials.trimStrength).toBe(started.trimStrength);
    expect(outcome.dials.inkThreshold).toBe(started.inkThreshold);
  });

  it('counts a stage’s positions across every round that reached it, skips included', () => {
    const outcome = autoTune(SHEET, BASE);
    const reading = outcome.stages.find((stage) => stage.stage === 'READING');
    const inkBlend = outcome.stages.find((stage) => stage.stage === 'INK_BLEND');

    // `READING` never skips and its ladder is complete, so it costs exactly fifteen a round.
    expect(reading?.candidates).toBe(15 * outcome.rounds);
    // And the ink blend is the other half of the contract: it swept in an earlier round and is
    // skipped in the last, so it reports a reason *and* what it spent. Dropping the carry-forward
    // would leave this at zero while the sweep's own total still counted those positions.
    expect(inkBlend?.skipped).not.toBeNull();
    expect(inkBlend?.candidates).toBeGreaterThan(0);
    expect(outcome.candidates).toBe(1 + outcome.stages.reduce((total, stage) => total + stage.candidates, 0));
  });

  it('refuses a sheet smaller than one cell of the grid in force', () => {
    expect(() =>
      autoTune(
        imageFrom(6, 6, () => MAGENTA),
        { ...BASE, grid: 8 },
      ),
    ).toThrow(/smaller than one cell/);
  });
});

/** The share of neighbouring-pixel change that falls anywhere but on a lattice boundary. */
function offLatticeShare(image: ImageData, grid: number): number {
  const planes = oklabPlanes(image);
  let total = 0;
  let off = 0;
  for (const plane of [planes.L, planes.a, planes.b]) {
    for (let y = 0; y < image.height; y += 1) {
      for (let x = 1; x < image.width; x += 1) {
        const step = Math.abs((plane[y * image.width + x] ?? 0) - (plane[y * image.width + x - 1] ?? 0));
        total += step;
        if (x % grid !== 0) off += step;
      }
    }
  }
  return total === 0 ? 0 : off / total;
}

/**
 * The sweep against the one pass that runs after everything else it moves.
 *
 * `readCandidate` runs the anti-aliasing exactly as the reader pointed it, and the four dials that
 * shape it are swept like any other. The mode is the one setting on that line the sweep may not
 * touch — see `TUNE_ALIAS_STAGES` — so these are the two halves of that: with the control off the
 * sweep never reaches those dials, and with it on it both scores through the pass and moves them.
 */
describe('autoTune against the anti-aliasing pass', () => {
  /**
   * The same kind of art as `ART`, with the contour stepping rather than running down one column.
   *
   * `ART`'s two lines are both axis-aligned, so no run on it terminates in a crossing edge and the
   * anti-aliasing has nothing at all to reconstruct — a fixture that would make every assertion below
   * pass for the wrong reason.
   */
  const STEPPED = imageFrom(32, 32, (x, y) =>
    y < 6 + Math.floor(x / 4) ? { r: 60, g: 90, b: 150, a: 255 } : { r: 220, g: 170, b: 90, a: 255 },
  );
  const STEPPED_SHEET = soften(upscaleNearest(STEPPED, GRID));

  const softened: QuantiseSettings = { ...BASE, antiAlias: 'BOTH', antiAliasPalette: 'BLEND' };

  const DIALS: TunedDials = tunedDialsOf(QUANTISE_DEFAULT_DIALS);

  it('reads a candidate through the pass the reader asked for', () => {
    const crop = { crop: STEPPED_SHEET, reference: STEPPED_SHEET };

    // The same dials read two ways, differing only in where the reader pointed the pass. They must
    // not agree: a reader with the pass on gets the fringe, and the two figures the panel reports
    // are figures about the sheet they are looking at.
    expect(readCandidate(DIALS, [crop], softened)).not.toEqual(readCandidate(DIALS, [crop], BASE));
    expect(readCandidate(DIALS, [crop], softened).colors).toBeGreaterThan(
      readCandidate(DIALS, [crop], BASE).colors,
    );
  });

  it('never reaches the alias dials while the reader has the pass off', () => {
    const outcome = autoTune(STEPPED_SHEET, BASE);

    for (const stage of ['ALIAS_CONTOUR', 'ALIAS_RUN', 'ALIAS_BLEND'] as const) {
      const report = outcome.stages.find((entry) => entry.stage === stage);
      expect(report?.candidates).toBe(0);
      expect(report?.skipped).toMatch(/anti-aliasing control is off/);
    }
    expect(outcome.dials.antiAliasThreshold).toBe(BASE.antiAliasThreshold);
    expect(outcome.dials.antiAliasStrength).toBe(BASE.antiAliasStrength);
    expect(outcome.dials.antiAliasRun).toBe(BASE.antiAliasRun);
    expect(outcome.dials.antiAliasPalette).toBe(BASE.antiAliasPalette);
  });

  it('sweeps the alias dials once the reader has pointed the pass somewhere', () => {
    const outcome = autoTune(STEPPED_SHEET, softened);

    for (const stage of ['ALIAS_CONTOUR', 'ALIAS_RUN', 'ALIAS_BLEND'] as const) {
      const report = outcome.stages.find((entry) => entry.stage === stage);
      expect(report?.skipped).toBeNull();
      expect(report?.candidates).toBeGreaterThan(0);
    }
  });
});
