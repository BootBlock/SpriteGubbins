import { beforeAll, describe, expect, it } from 'vitest';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { meanPaletteError } from './meanPaletteError.ts';
import { countColors } from '../src/utils/imageData.ts';
import { blendWeightedHistogram } from '../src/utils/blendHistogram.ts';
import { lloydRefine } from '../src/utils/lloydRefine.ts';
import { buildPalette } from '../src/utils/wuQuantiser.ts';
import { wuPalette } from '../src/utils/wuPalette.ts';
import { PALETTE_REFINE_ROUNDS } from '../src/constants/quantiser.ts';

/**
 * The error ladders `wuQuantiser`'s module docblock and `PALETTE_REFINE_ROUNDS` state, re-derived
 * from the reference sheet. See `calibrationSettings.ts` for why the docblock-figure suites exist.
 */
describe("wuQuantiser's error ladder", () => {
  let sheet: ImageData;

  beforeAll(async () => {
    sheet = await loadCorpusSheet('armour.png');
  }, 120_000);

  it('the four budgets the module docblock states, refined and from the cut alone', () => {
    // The other two figures in the same sentence, which is the whole of what it states about the
    // sheet: a ladder read off a different image is a different claim, and these say it is not.
    expect(countColors(sheet)).toBe(218_978);
    expect([sheet.width, sheet.height]).toEqual([1254, 1254]);

    // Three decimals, because that is the precision the docblock states them to. Pinning fewer
    // would let a restatement round its way out of a move the search had genuinely made.
    const budgets = [16, 32, 64, 256];
    expect(
      budgets.map((budget) => Number(meanPaletteError(sheet, buildPalette(sheet, budget)).toFixed(3))),
    ).toEqual([3.673, 2.675, 2.029, 1.3]);
    // The cut alone is the palette `lloydRefine` starts from, which is the comparison the docblock
    // draws. `wuPalette` is the shipped cut, so this half is the shipped code without the rounds.
    const histogram = blendWeightedHistogram(sheet);
    expect(
      budgets.map((budget) => Number(meanPaletteError(sheet, wuPalette(histogram, budget)).toFixed(3))),
    ).toEqual([4.697, 3.303, 2.447, 1.739]);
  }, 240_000);

  it('the rounds ladder PALETTE_REFINE_ROUNDS states, at the default budget', () => {
    const histogram = blendWeightedHistogram(sheet);
    const cut = wuPalette(histogram, 64);
    expect(
      [4, 8, 16, PALETTE_REFINE_ROUNDS, 64].map((rounds) =>
        Number(meanPaletteError(sheet, lloydRefine(histogram, cut, rounds)).toFixed(3)),
      ),
    ).toEqual([2.051, 2.042, 2.047, 2.029, 2.029]);
  }, 240_000);
});
