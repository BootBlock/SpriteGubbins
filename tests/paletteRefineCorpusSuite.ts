import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PALETTE_REFINE_ROUNDS } from '../src/constants/quantiser.ts';
import { blendWeightedHistogram } from '../src/utils/blendHistogram.ts';
import { lloydRefine } from '../src/utils/lloydRefine.ts';
import { wuPalette } from '../src/utils/wuPalette.ts';
import { meanPaletteError } from './meanPaletteError.ts';
import { type CorpusSheetName, loadCorpus } from './sheetCorpus.ts';

/**
 * That the refinement rounds improve on the Wu cut on every corpus sheet, by the range
 * `PALETTE_REFINE_ROUNDS` states: at budgets of 16, 32, 64 and 256, the mean error per pixel after
 * the rounds is 11% to 35% below the cut's.
 *
 * **Every sheet, because the armour ladder alone could hide a loss.** A snapped round can raise the
 * error, and the pass keeps the best palette by the *weighted* error it minimises, while this
 * measures the plain error a reader sees. A sheet where the two disagree could come out worse than
 * the cut, and the flat tiles, the thin strokes of the UI sheet and the rust of the vehicles are
 * three different ways for that to show.
 *
 * Run as two files, `palette-refine-corpus-first-half.test.ts` and `-second-half.test.ts`, each over
 * one of `CORPUS_HALVES`, so the two halves can take two workers.
 */

/** The sheets are one to two megapixels each, and each budget runs the cut and the rounds. */
vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const BUDGETS = [16, 32, 64, 256] as const;

/** The least and the most the rounds lower the error by, as fractions of the cut's error. */
const LEAST_GAIN = 0.11;
const MOST_GAIN = 0.35;

export function paletteRefineCorpusSuite(sheets: readonly CorpusSheetName[]): void {
  describe('the refinement rounds over the corpus', () => {
    let corpus: ReadonlyMap<CorpusSheetName, ImageData>;

    beforeAll(async () => {
      corpus = await loadCorpus(sheets);
    });

    it.each(sheets)('lowers the error of %s at every budget, within the stated range', (name) => {
      const image = corpus.get(name);
      if (image === undefined) throw new Error(`The corpus is missing ${name}`);
      const histogram = blendWeightedHistogram(image);

      for (const budget of BUDGETS) {
        const cut = wuPalette(histogram, budget);
        const before = meanPaletteError(image, cut);
        const after = meanPaletteError(image, lloydRefine(histogram, cut, PALETTE_REFINE_ROUNDS));
        const gain = 1 - after / before;
        const label = `${name} at ${String(budget)}: ${before.toFixed(3)} → ${after.toFixed(3)}`;
        expect(gain, label).toBeGreaterThanOrEqual(LEAST_GAIN);
        expect(gain, label).toBeLessThan(MOST_GAIN);
      }
    });
  });
}
