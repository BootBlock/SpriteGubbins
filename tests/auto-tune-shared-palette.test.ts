import { describe, expect, it, vi } from 'vitest';

import { PROXY_CROP_CELLS, PROXY_CROP_COUNT } from '../src/constants/autoTune.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import type { QuantiseSettings } from '../src/types/quantiser.ts';
import { colorHistogram } from '../src/utils/imageData.ts';
import { proxyCrops } from '../src/utils/proxyCrops.ts';
import { quantiseRegions } from '../src/utils/quantiseImage.ts';
import { readCandidate } from '../src/utils/tuneCandidate.ts';
import { tuneCrop } from '../src/utils/tuneCrop.ts';
import { tunedDialsOf } from '../src/utils/tuneStage.ts';
import { loadCorpusSheet } from './sheetCorpus.ts';

/**
 * The auto-tune sweep's crops under a colour budget, on the reference sheet.
 *
 * The sheet shares one palette across all its art, and the crops stand in for it. Run one at a time,
 * each crop chose a palette of its own, so the five crops of `test_sprites/armour.png` held far more
 * than the budget between them and every candidate was ranked against palettes the reader would never
 * get. Quantised together as regions of one sheet — see `quantiseRegions` — they hold at most the
 * budget, which is what the sheet holds.
 */
/** A decode of the reference sheet and eleven runs over its crops, well past Vitest's own five seconds. */
vi.setConfig({ testTimeout: 60_000 });

const GRID = 6;
const BUDGET = 16;

const SETTINGS: QuantiseSettings = {
  ...QUANTISE_DEFAULT_DIALS,
  grid: GRID,
  key: null,
  reduction: { kind: 'MAX_COLORS', maxColors: BUDGET },
};

describe('the auto-tune sweep’s crops under a colour budget', () => {
  it('hold at most the budget between them, as the sheet does', async () => {
    const sheet = await loadCorpusSheet('armour.png');
    const crops = proxyCrops(sheet, GRID, PROXY_CROP_CELLS, PROXY_CROP_COUNT).map((crop) =>
      tuneCrop(crop.image, SETTINGS),
    );
    const dials = tunedDialsOf(SETTINGS);

    // The premise: one at a time, the crops choose palettes that differ, so between them they hold
    // more than the budget. Without it the assertion below would hold over crops that happened to
    // agree, and would test nothing.
    const alone = new Set(
      crops.flatMap(({ prologue }) =>
        quantiseRegions([prologue], { ...SETTINGS, ...dials }).flatMap((image) => [
          ...colorHistogram(image).keys(),
        ]),
      ),
    );
    expect(crops).toHaveLength(PROXY_CROP_COUNT);
    expect(alone.size).toBeGreaterThan(BUDGET);

    const together = new Set(
      quantiseRegions(
        crops.map(({ prologue }) => prologue),
        { ...SETTINGS, ...dials },
      ).flatMap((image) => [...colorHistogram(image).keys()]),
    );
    expect(together.size).toBeLessThanOrEqual(BUDGET);
    // And what a candidate is ranked by is that figure, rather than one crop's count or their mean.
    expect(readCandidate(dials, crops, SETTINGS).colors).toBe(together.size);
  });
});
