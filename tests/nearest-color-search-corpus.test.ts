import { beforeAll, describe, expect, it } from 'vitest';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { bruteForceNearest } from '../src/test/bruteForceNearest.ts';
import { colorHistogram, unpackColor } from '../src/utils/imageData.ts';
import { nearestColorSearch } from '../src/utils/nearestColorSearch.ts';
import { buildPalette } from '../src/utils/wuQuantiser.ts';

/**
 * The indexed palette search against every entry scored, over every distinct colour of the
 * reference sheet.
 *
 * The search prunes, and a pruning rule that is wrong by one comparison changes a pixel only where
 * two entries sit exactly as far from a colour — rare enough that a hand-built fixture can miss it
 * and common enough across `armour.png`'s 218,978 colours to be met. 64 and 256 are the budgets the
 * search's speed was measured at, and 16 is a palette small enough for the gaps between entries to
 * be wide.
 */
describe('nearestColorSearch on armour.png', () => {
  let sheet: ImageData;
  beforeAll(async () => {
    sheet = await loadCorpusSheet('armour.png');
  }, 120_000);

  it.each([16, 64, 256])(
    'answers as the brute force does at a budget of %i',
    (budget) => {
      const palette = buildPalette(sheet, budget);
      const nearest = nearestColorSearch(palette);
      let mismatches = 0;
      for (const key of colorHistogram(sheet).keys()) {
        const color = unpackColor(key);
        if (nearest(color) !== bruteForceNearest(color, palette)) mismatches += 1;
      }
      expect(mismatches).toBe(0);
    },
    120_000,
  );
});
