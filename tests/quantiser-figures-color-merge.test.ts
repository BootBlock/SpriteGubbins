import { beforeAll, describe, expect, it } from 'vitest';
import { calibrationSettings } from './calibrationSettings.ts';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';

/**
 * The colour counts `COLOR_MERGE_RANGE`'s docblock is calibrated by. See `calibrationSettings.ts`
 * for why the docblock-figure suites exist.
 *
 * **Measured through the colour budget, which is why they went stale unnoticed.** The ladder is what
 * the merge makes of the budget's sixty-four entries, so every change to how those entries are
 * chosen moves it: Wu replacing median cut moved the twelve-step rung once, and the k-means rounds
 * `buildPalette` now runs after the Wu cut moved two of the three again, with nothing pinning them.
 */
describe("COLOR_MERGE_RANGE's calibration points", () => {
  let sheet: ImageData;

  beforeAll(async () => {
    sheet = await loadCorpusSheet('armour.png');
  }, 120_000);

  it('settles the budget of 64 to 29 colours at 12, 16 at 24 and 6 at 48', () => {
    // The docblock's own conditions: grid 6, the ink-weighted reading at its opening line strength of
    // 1.5×, a budget of 64, no keying, and every other dial where it opens.
    const colorsAt = (colorMerge: number) =>
      quantiseImage(sheet, calibrationSettings({ vote: 'INK_WEIGHTED', colorMerge })).colors;
    expect([0, 12, 24, 48].map(colorsAt)).toEqual([64, 29, 16, 6]);
  }, 300_000);
});
