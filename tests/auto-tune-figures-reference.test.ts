import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CORPUS_TUNE_FIGURES, expectTuneFigure, tuneSettings } from './autoTuneFigures.ts';
import { loadCorpusSheet, type CorpusSheetName } from './sheetCorpus.ts';
import { PROXY_CROP_CELLS, PROXY_CROP_COUNT } from '../src/constants/autoTune.ts';
import type { TuneReading, TunedDials } from '../src/types/autoTune.ts';
import { autoTune } from '../src/utils/autoTune.ts';
import { candidateReader } from '../src/utils/candidateReader.ts';
import { chooseByPrice } from '../src/utils/chooseByPrice.ts';
import { colorPrice } from '../src/utils/colorPrice.ts';
import { proxyCrops } from '../src/utils/proxyCrops.ts';
import { TUNE_READING_STAGE } from '../src/utils/tuneCellStages.ts';
import { tunedDialsOf, withIncumbent } from '../src/utils/tuneStage.ts';
import { tuneCrop } from '../src/utils/tuneCrop.ts';

/**
 * What `constants/autoTune.ts` states about the reference sheet: where the whole sweep settles, what
 * the reading stage keeps in its first round and why, and the position the narrower sweep it replaced
 * settled on. See `autoTuneFigures.ts` for why the auto-tune figure suites exist.
 *
 * **The first round and the whole sweep are two answers, and the docblock states both.** The reading
 * stage keeps `DOMINANT` in round one, because at the sweep's price of a colour neither averaging
 * reading's extra likeness pays for its extra colours; a later round, ranked against a merge that has
 * folded those colours away, moves it to `K_CENTROID`. The docblock twice described the first answer
 * as the second, which is the drift this suite pins against.
 *
 * `readCandidate` is counted rather than replaced, so every figure is the real pipeline's.
 */
const runs = vi.hoisted(() => ({ count: 0 }));

vi.mock('../src/utils/tuneCandidate.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/utils/tuneCandidate.ts')>();
  return {
    ...actual,
    readCandidate: (...args: Parameters<typeof actual.readCandidate>) => {
      runs.count += 1;
      return actual.readCandidate(...args);
    },
  };
});

/** A likeness to the four places the docblock states it to. */
const places = (reading: TuneReading) => ({
  fidelity: Number(reading.fidelity.toFixed(4)),
  colors: reading.colors,
});

/** The reading stage's first round on one sheet, read the way `autoTune` reads it. */
async function firstReadingRound(name: CorpusSheetName) {
  const sheet = await loadCorpusSheet(name);
  const settings = tuneSettings(sheet, name, false);
  const crops = proxyCrops(sheet, settings.grid, PROXY_CROP_CELLS, PROXY_CROP_COUNT).map((crop) =>
    tuneCrop(crop.image, settings),
  );
  const read = candidateReader(crops, settings);
  const price = colorPrice(crops, settings, read);
  const opening = tunedDialsOf(settings);
  const plan = TUNE_READING_STAGE.plan(opening, settings);
  if ('skipped' in plan) throw new Error('The reading stage never skips, so this is not the stage it was');
  const tried = withIncumbent(plan.candidates, opening);
  const [first, ...rest] = tried.map(read);
  if (first === undefined) throw new Error('withIncumbent returns a non-empty list');
  const at = (vote: TunedDials['vote']) => places(read({ ...opening, vote, outlineExpansion: 0 }));
  return {
    read,
    opening,
    price: price.perColor,
    kept: tried[chooseByPrice([first, ...rest], price.perColor)],
    DOMINANT: at('DOMINANT'),
    INK_WEIGHTED: at('INK_WEIGHTED'),
    K_CENTROID: at('K_CENTROID'),
  };
}

describe('constants/autoTune.ts — the reference sheet', () => {
  let armour: Awaited<ReturnType<typeof firstReadingRound>>;

  beforeAll(async () => {
    armour = await firstReadingRound('armour.png');
  }, 300_000);

  it('settles on K_CENTROID with the merge at 12, at 0.5601 for 58 from 0.5469 for 4292', async () => {
    const sheet = await loadCorpusSheet('armour.png');
    runs.count = 0;
    const outcome = autoTune(sheet, tuneSettings(sheet, 'armour.png', false));

    expectTuneFigure(outcome, CORPUS_TUNE_FIGURES['armour.png'].unkeyed);
    expect(runs.count).toBe(CORPUS_TUNE_FIGURES['armour.png'].unkeyed.runs);
    expect({
      crops: outcome.crops,
      cropEdge: outcome.cropEdge,
      pricePositions: outcome.price.positions,
    }).toEqual({
      crops: 5,
      cropEdge: 240,
      pricePositions: 15,
    });
    expect(outcome.price.perColor.toFixed(6)).toBe('0.000105');
    expect(places(outcome.reading)).toEqual({ fidelity: 0.5601, colors: 58 });
    expect(places(outcome.baseline)).toEqual({ fidelity: 0.5469, colors: 4292 });
  }, 300_000);

  it('keeps DOMINANT in the reading stage’s first round, the cheapest reading and the least faithful', () => {
    expect(armour.DOMINANT).toEqual({ fidelity: 0.5469, colors: 4292 });
    expect(armour.INK_WEIGHTED).toEqual({ fidelity: 0.5525, colors: 5100 });
    expect(armour.K_CENTROID).toEqual({ fidelity: 0.5737, colors: 5109 });
    // What K_CENTROID's extra likeness costs a colour, against the price it has to beat.
    const perColor = (armour.K_CENTROID.fidelity - armour.DOMINANT.fidelity) / (5109 - 4292);
    expect(perColor.toFixed(6)).toBe('0.000033');
    expect(armour.kept?.vote).toBe('DOMINANT');
  });

  it('beats the narrow sweep’s answer, DOMINANT at a merge of 12 and a cleanup of 48, on both counts', () => {
    const narrow = armour.read({ ...armour.opening, vote: 'DOMINANT', colorMerge: 12, fillCleanup: 48 });
    expect(places(narrow)).toEqual({ fidelity: 0.5377, colors: 76 });
  });

  it('keeps DOMINANT on cyborg_healer.png too, where K_CENTROID beats INK_WEIGHTED on both counts', async () => {
    const healer = await firstReadingRound('cyborg_healer.png');
    expect(healer.DOMINANT).toEqual({ fidelity: 0.5125, colors: 6232 });
    expect(healer.INK_WEIGHTED).toEqual({ fidelity: 0.5149, colors: 6895 });
    expect(healer.K_CENTROID).toEqual({ fidelity: 0.5315, colors: 6618 });
    expect(healer.kept?.vote).toBe('DOMINANT');
  }, 300_000);
});
