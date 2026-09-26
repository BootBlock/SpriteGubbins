import { beforeAll, describe, expect, it, vi } from 'vitest';
import { meanPaletteError } from './meanPaletteError.ts';
import { CORPUS_SHEETS, type CorpusSheetName, loadCorpus } from './sheetCorpus.ts';
import { packColor } from '../src/utils/imageData.ts';
import { buildPalette } from '../src/utils/wuQuantiser.ts';
import type { Rgba } from '../src/types/quantiser.ts';

/**
 * The corpus half of what the `BLEND_END_GAP` docblock in `constants/quantiser.ts` states: why the
 * eight reference sheets cannot place the floor, and so why the fixtures in
 * `quantiser-figures-blend-weighting.test.ts` do. See `calibrationSettings.ts` for why the
 * docblock-figure suites exist.
 *
 * A file of its own rather than a block in that suite, because it decodes all eight sheets and
 * Vitest gives each file to one worker. The dial is varied by replacing its export with a getter, so
 * the reading measured is `blendWeightedHistogram` itself.
 */

/** Eight sheets of one to two megapixels, and a palette search over each at three floors. */
vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const dial = vi.hoisted(() => ({ end: 0 }));

vi.mock('../src/constants/quantiser.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/constants/quantiser.ts')>();
  dial.end = actual.BLEND_END_GAP;
  return Object.defineProperties({ ...actual }, { BLEND_END_GAP: { get: () => dial.end, enumerable: true } });
});

/** `read` with the floor at `end`, and the floor back where it was afterwards. */
function atEnd<T>(end: number, read: () => T): T {
  const shipped = dial.end;
  dial.end = end;
  try {
    return read();
  } finally {
    dial.end = shipped;
  }
}

/** A palette as its sorted packed colours, so two runs compare exactly whatever their order. */
const signature = (palette: readonly Rgba[]): string =>
  [...palette]
    .map(packColor)
    .sort((left, right) => left - right)
    .join(',');

describe('the blend end gap over the corpus', () => {
  let corpus: ReadonlyMap<CorpusSheetName, ImageData>;

  beforeAll(async () => {
    corpus = await loadCorpus();
  });

  const sheet = (name: CorpusSheetName): ImageData => {
    const image = corpus.get(name);
    if (image === undefined) throw new Error(`The corpus is missing ${name}`);
    return image;
  };

  it.each(CORPUS_SHEETS)('3 and 5 each move the palette 4 chooses for %s at 16', (name) => {
    const image = sheet(name);
    const at = (end: number): string => atEnd(end, () => signature(buildPalette(image, 16)));
    const shipped = at(4);
    expect(at(3)).not.toBe(shipped);
    expect(at(5)).not.toBe(shipped);
  });

  it('the mean error on the reference sheet zigzags with the floor at 64', () => {
    const image = sheet('armour.png');
    const errors = [2, 4, 6, 8].map((end) =>
      atEnd(end, () => Number(meanPaletteError(image, buildPalette(image, 64)).toFixed(3))),
    );
    expect(errors).toEqual([2.066, 2.029, 2.097, 2.038]);
  });
});
