import { describe, expect, it, vi } from 'vitest';

import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { imageFrom, soften } from '../src/test/images.ts';
import type { QuantisePrologue, QuantiseSettings } from '../src/types/quantiser.ts';
import { autoTune } from '../src/utils/autoTune.ts';
import { tunedDialsOf } from '../src/utils/tuneStage.ts';
import { upscaleNearest } from '../src/utils/upscaleNearest.ts';

/**
 * What the auto-tune sweep pays for work that depends on less than a whole candidate.
 *
 * **A count, not a wall clock**, for the reason `auto-tune-prologue.test.ts` gives. Two things were
 * paid again that did not need to be. The descent ranks the dials in force at every stage, and those
 * are the position the stage before it chose, so it ran positions it had already read: over the eight
 * corpus sheets, 1,176 positions ranked and 743 distinct. And the likeness score converted each crop
 * into OKLab and built its summed-area tables for every candidate, although neither changes while the
 * crop does not. See `candidateReader` and `TuneCrop`.
 *
 * The recorders are `vi.hoisted` because a `vi.mock` factory is hoisted above every import in this
 * file, so anything it closes over has to be hoisted with it.
 */
const seen = vi.hoisted(() => ({
  runs: [] as { readonly prologues: readonly QuantisePrologue[]; readonly settings: QuantiseSettings }[],
  converted: [] as ImageData[],
}));

vi.mock('../src/utils/quantiseImage.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/utils/quantiseImage.ts')>();
  return {
    ...actual,
    quantiseRegions: (...args: Parameters<typeof actual.quantiseRegions>) => {
      seen.runs.push({ prologues: args[0], settings: args[1] });
      return actual.quantiseRegions(...args);
    },
  };
});

vi.mock('../src/utils/oklabPlanes.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/utils/oklabPlanes.ts')>();
  return {
    ...actual,
    oklabPlanes: (...args: Parameters<typeof actual.oklabPlanes>) => {
      seen.converted.push(args[0]);
      return actual.oklabPlanes(...args);
    },
  };
});

/** A whole sweep of the fixture, which is well past Vitest's own five seconds — see `autoTune.test.ts`. */
vi.setConfig({ testTimeout: 60_000 });

const GRID = 2;

/**
 * Pixel art big enough that the sweep reads more than one window, so "once a crop" and "once a
 * sweep" are different claims. At a grid of 2 `proxyCrops` finds two.
 */
const ART = imageFrom(80, 80, (x, y) => {
  if (x % 37 === 0) return { r: 14, g: 12, b: 18, a: 255 };
  if (y % 29 === 0) return { r: 245, g: 230, b: 150, a: 255 };
  return x < 40 ? { r: 60, g: 90, b: 150, a: 255 } : { r: 180, g: 110, b: 70, a: 255 };
});

/** What a model hands back: the art drawn at a scale of 2, then resampled so its edges soften. */
const SHEET = soften(upscaleNearest(ART, GRID));

const SETTINGS: QuantiseSettings = { ...QUANTISE_DEFAULT_DIALS, grid: GRID, key: null, reduction: null };

/** One sweep of the fixture, recorded from a clean start, and the crops it ran on in the order it met them. */
function sweep() {
  seen.runs.length = 0;
  seen.converted.length = 0;
  const outcome = autoTune(SHEET, SETTINGS);
  return { outcome, prologues: [...new Set(seen.runs.flatMap((run) => run.prologues))] };
}

describe('the auto-tune sweep against work it has already done', () => {
  it('runs each position once, over every crop, however often the descent ranks it', () => {
    const { outcome, prologues } = sweep();

    // The sweep this is a claim about: more than one crop, and a descent that ranked some position
    // more than once. Without the second, the assertions below would hold over a sweep that never
    // repeated itself, and the cache would be untested.
    expect(prologues).toHaveLength(outcome.crops);
    expect(outcome.crops).toBeGreaterThan(1);
    expect(seen.runs.length).toBeLessThan(outcome.candidates);

    // Every run quantises every crop together, as the regions of one sheet — see `quantiseRegions`
    // — and no position is run twice.
    for (const run of seen.runs) expect(run.prologues).toEqual(prologues);
    const positions = seen.runs.map((run) => JSON.stringify(tunedDialsOf(run.settings)));
    expect(new Set(positions).size).toBe(positions.length);
  });

  it('converts each crop into OKLab once for the whole sweep', () => {
    const { outcome, prologues } = sweep();

    expect(prologues).toHaveLength(outcome.crops);
    // A candidate's own result is converted once per run, which is the part of the score that does
    // vary; the crop it is scored against is converted once, where it used to be converted per run.
    for (const { source } of prologues) {
      expect(seen.converted.filter((image) => image === source)).toHaveLength(1);
    }
  });
});
