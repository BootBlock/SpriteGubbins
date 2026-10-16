import { beforeAll, describe, expect, it } from 'vitest';
import { calibrationSettings } from './calibrationSettings.ts';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';

/**
 * The cliff `colorReduction`'s module docblock argues the snap distance's off position from. See
 * `calibrationSettings.ts` for why the docblock-figure suites exist.
 *
 * **One half is measured through the budget and the other through everything upstream of it**, and
 * the second half had drifted from 10,031 before the budget's own palette changed: the count the
 * sheet arrives at the palette step with moves with the reading, the keying and the cleanup passes,
 * and nothing held it.
 */
describe("colorReduction's snap-distance cliff", () => {
  let sheet: ImageData;

  beforeAll(async () => {
    sheet = await loadCorpusSheet('armour.png');
  }, 120_000);

  it('takes the reference sheet from 64 colours to 9,975 with the budget taken away', () => {
    // Grid 6, no keying, every dial where it opens and the studio's budget of 64 in force.
    const budgeted = quantiseImage(sheet, calibrationSettings());
    expect(budgeted.colors).toBe(64);

    // The alternative the docblock describes left the sheet unreduced, so that is what is counted:
    // what arrives at the palette step with no reduction in its place.
    expect(quantiseImage(sheet, calibrationSettings({ reduction: null })).colors).toBe(9_975);
  }, 300_000);
});
