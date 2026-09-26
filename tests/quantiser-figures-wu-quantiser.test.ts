import { beforeAll, describe, expect, it } from 'vitest';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { colorHistogram, countColors, unpackColor } from '../src/utils/imageData.ts';
import { nearestColorSearch } from '../src/utils/nearestColorSearch.ts';
import { srgbToOklab } from '../src/utils/oklab.ts';
import { pixelDistanceOf } from '../src/utils/pixelDistance.ts';
import { buildPalette } from '../src/utils/wuQuantiser.ts';
import type { Rgba } from '../src/types/quantiser.ts';

/**
 * The error ladder `wuQuantiser`'s module docblock states, re-derived from the reference sheet. See
 * `calibrationSettings.ts` for why the docblock-figure suites exist.
 */
describe("wuQuantiser's error ladder", () => {
  let sheet: ImageData;

  beforeAll(async () => {
    sheet = await loadCorpusSheet('armour.png');
  }, 120_000);

  /**
   * How far the average pixel sits from the palette entry it is drawn with, in scaled OKLab.
   *
   * Read off the histogram rather than the pixels, which is cheaper and is also the right
   * question. Cheaper because a colour's distance to its entry is a property of the colour, so the
   * sheet's 1.57 million pixels are 218,978 conversions weighted by their own counts. Right
   * because `colorHistogram` leaves fully transparent pixels out, and those are exactly the pixels
   * `applyPalette` passes through untouched — a mean over the whole field would dilute the error
   * with cleared ground nothing drew an entry on. That is also why `meanCellDistance` next door is
   * not the seam to reach for here: it converts every pixel, so it agrees with this to six
   * decimals on a truecolour sheet and parts company on a keyed one.
   *
   * **The histogram is the unweighted one, deliberately.** `blendWeightedHistogram` decides what a
   * colour is worth while the palette is being *chosen*; this asks what the chosen palette cost
   * the reader, and there every pixel counts once. Conflating the two is what would make the
   * ladder a score the weighting could game.
   *
   * `pixelDistanceOf` rather than a distance spelled here, for the reason its own docblock gives.
   * It measures coverage as a fourth axis, which costs nothing on this reading: the corpus sheets
   * are truecolour, so every colour in the histogram is opaque, and every entry `buildPalette`
   * returns is a colour the sheet holds.
   */
  function meanPaletteError(image: ImageData, palette: readonly Rgba[]): number {
    const nearest = nearestColorSearch(palette);
    let total = 0;
    let pixels = 0;
    for (const [key, count] of colorHistogram(image)) {
      const color = unpackColor(key);
      const entry = nearest(color);
      if (entry === null) throw new Error('an empty palette has no entry to measure against');
      const from = srgbToOklab(color.r, color.g, color.b);
      const to = srgbToOklab(entry.r, entry.g, entry.b);
      total += count * pixelDistanceOf(from.L, from.a, from.b, color.a, to.L, to.a, to.b, entry.a);
      pixels += count;
    }
    return total / pixels;
  }

  it('the four budgets the module docblock states', () => {
    // The other two figures in the same sentence, which is the whole of what it states about the
    // sheet: a ladder read off a different image is a different claim, and these say it is not.
    expect(countColors(sheet)).toBe(218_978);
    expect([sheet.width, sheet.height]).toEqual([1254, 1254]);

    // Three decimals, because that is the precision the docblock states them to. Pinning fewer
    // would let a restatement round its way out of a move the search had genuinely made.
    expect(
      [16, 32, 64, 256].map((budget) =>
        Number(meanPaletteError(sheet, buildPalette(sheet, budget)).toFixed(3)),
      ),
    ).toEqual([4.697, 3.287, 2.447, 1.676]);
  }, 240_000);
});
