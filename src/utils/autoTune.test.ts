import { describe, expect, it } from 'vitest';
import { PROXY_CROP_CELLS, PROXY_CROP_COUNT } from '../constants/autoTune.ts';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import { imageFrom, soften } from '../test/images.ts';
import { TUNE_STAGE_NAMES } from '../types/autoTune.ts';
import type { TunedDials } from '../types/autoTune.ts';
import type { QuantiseSettings, Rgba } from '../types/quantiser.ts';
import { autoTune } from './autoTune.ts';
import { oklabPlanes } from './oklabPlanes.ts';
import { proxyCrops } from './proxyCrops.ts';
import { quantiseImage } from './quantiseImage.ts';
import { meanSsim } from './ssim.ts';
import { upscaleNearest } from './upscaleNearest.ts';

const GRID = 4;
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

const TUNED_KEYS: readonly (keyof TunedDials)[] = [
  'vote',
  'outlineExpansion',
  'lineStrength',
  'trimStrength',
  'inkThreshold',
  'colorMerge',
  'fillCleanup',
  'cleanupPasses',
];

describe('autoTune', () => {
  it('reports every stage once, in the order they run', () => {
    const outcome = autoTune(SHEET, BASE);

    expect(outcome.stages.map((stage) => stage.stage)).toEqual([...TUNE_STAGE_NAMES]);
  });

  it('counts the positions it ran, including the one the reader arrived with', () => {
    const outcome = autoTune(SHEET, BASE);

    const swept = outcome.stages.reduce((total, stage) => total + stage.candidates, 0);
    expect(outcome.candidates).toBe(swept + 1);
    expect(outcome.candidates).toBeLessThanOrEqual(65);
  });

  it('says why a stage that could not run did not', () => {
    const outcome = autoTune(SHEET, BASE);

    for (const stage of outcome.stages) {
      if (stage.skipped === null) expect(stage.candidates).toBeGreaterThan(0);
      else expect(stage.candidates).toBe(0);
      expect(stage.settled.length).toBeGreaterThan(0);
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

  it('answers with the eight dials it is allowed to move and nothing else', () => {
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
    const keyed: QuantiseSettings = { ...BASE, key: { color: MAGENTA, tolerance: 16 } };
    const [crop] = proxyCrops(KEYED_SHEET, GRID, PROXY_CROP_CELLS, PROXY_CROP_COUNT);
    expect(crop).toBeDefined();
    if (crop === undefined) return;

    const outcome = autoTune(KEYED_SHEET, keyed);
    const againstTheField = meanSsim(
      crop.image,
      upscaleNearest(quantiseImage(crop.image, { ...keyed, ...outcome.dials }).image, GRID),
    );

    expect(outcome.reading.fidelity).toBeGreaterThan(againstTheField + 0.2);
  });

  it('scores every candidate alike on the lattice while their fidelities differ', () => {
    // Why the roadmap's third scorer is not here, shown as the pair it is. A lattice score asks
    // whether the result sits on the grid; every candidate is judged on its result magnified by that
    // same grid, so all of them put all of their change on it by construction of the magnification.
    // That is exactly the point: it is constant where the score the sweep does use is not.
    const [crop] = proxyCrops(SHEET, GRID, PROXY_CROP_CELLS, PROXY_CROP_COUNT);
    expect(crop).toBeDefined();
    if (crop === undefined) return;

    const far: TunedDials[] = [
      { ...QUANTISE_DEFAULT_DIALS, vote: 'DOMINANT', outlineExpansion: 0 },
      { ...QUANTISE_DEFAULT_DIALS, vote: 'INK_WEIGHTED', lineStrength: 3, trimStrength: 3 },
      { ...QUANTISE_DEFAULT_DIALS, vote: 'K_CENTROID', colorMerge: 48, fillCleanup: 48 },
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
