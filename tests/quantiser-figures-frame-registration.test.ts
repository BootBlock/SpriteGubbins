import { describe, expect, it } from 'vitest';
import { CORPUS_SHEETS, loadCorpusSheet } from './sheetCorpus.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { DEFAULT_KEY_TOLERANCE, DEFAULT_SPRITE_GAP, FRAME_DRIFT_SEARCH } from '../src/constants/quantiser.ts';
import { affordableDriftReach } from '../src/utils/affordableDriftReach.ts';
import { coverageMask } from '../src/utils/coverageMask.ts';
import { createImage, fromHex, pixelOffset } from '../src/utils/imageData.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import { registrationWords } from '../src/utils/registrationWords.ts';
import { spriteSegments } from '../src/utils/spriteSegments.ts';
import { spriteStrips } from '../src/utils/spriteStrips.ts';
import type { CoverageMask, SpriteBox } from '../src/types/quantiser.ts';

/**
 * The figures the frame registration argues `FRAME_SWEEP_BUDGET` from. See `calibrationSettings.ts`
 * for why the docblock-figure suites exist.
 */
describe('the frame registration — the figures its budget is argued from', () => {
  /**
   * The sheet `FRAME_SWEEP_BUDGET`'s docblock states its before-and-after on: four discs of
   * radius 500 on a 4096 × 1100 sheet, the shape issue #470 measured. Synthetic on purpose, because
   * the figure is about frames far larger than any the corpus holds, which is the case the budget
   * exists for.
   */
  function discs(): ImageData {
    const width = 4096;
    const image = createImage(width, 1100);
    for (const [centreX, centreY] of [
      [524, 550],
      [1549, 551],
      [2572, 549],
      [3590, 552],
    ] as const) {
      for (let y = 0; y < image.height; y += 1) {
        for (let x = centreX - 500; x < centreX + 500; x += 1) {
          const across = (x - centreX) / 500;
          const down = (y - centreY) / 500;
          if (across * across + down * down > 1) continue;
          image.data[pixelOffset(width, x, y) + 3] = 255;
        }
      }
    }
    return image;
  }

  /** Each strip's frames packed, as `sheetStrips` packs them before it registers anything. */
  const masksOf = (image: ImageData, boxes: readonly SpriteBox[]): CoverageMask[][] =>
    spriteStrips(boxes).map((row) => row.map((box) => coverageMask(image, box)));

  it('reads the four discs at a reach of five, 4,228,224 words a frame against 226,965,572 reads', () => {
    const image = discs();
    const found = spriteSegments(image, DEFAULT_SPRITE_GAP);
    const boxes = found.kind === 'SEGMENTED' ? found.boxes : [];
    expect(boxes.map((box) => [box.width, box.height, box.pixels])).toEqual(
      Array.from({ length: 4 }, () => [1000, 1001, 785_348]),
    );

    const masks = masksOf(image, boxes);
    const reach = affordableDriftReach(masks);
    expect(reach).toBe(5);

    // The old sweep read the image up to once per opaque reference pixel for each of the full
    // reach's candidates; the new one touches at most `registrationWords` of each frame's mask.
    const fullReachCandidates = (2 * FRAME_DRIFT_SEARCH + 1) ** 2;
    const [reference, frame] = masks[0] ?? [];
    if (reference === undefined || frame === undefined) throw new Error('the discs form no strip');
    expect(fullReachCandidates * 785_348).toBe(226_965_572);
    expect(registrationWords(reference, frame, reach)).toBe(4_228_224);
    expect(Math.round(226_965_572 / 4_228_224)).toBe(54);
  });

  it('narrows no sheet of the corpus, keyed and read at a grid of 1', async () => {
    const magenta = fromHex('#FF00FF');
    if (magenta === null) throw new Error('the key colour no longer parses');
    for (const name of CORPUS_SHEETS) {
      const result = quantiseImage(await loadCorpusSheet(name), {
        ...QUANTISE_DEFAULT_DIALS,
        grid: 1,
        key: { color: magenta, tolerance: DEFAULT_KEY_TOLERANCE },
        reduction: null,
      });
      const boxes = result.sprites.kind === 'SEGMENTED' ? result.sprites.boxes : [];
      expect(spriteStrips(boxes).length, name).toBeGreaterThan(0);
      expect(affordableDriftReach(masksOf(result.image, boxes)), name).toBe(FRAME_DRIFT_SEARCH);
    }
  }, 900_000);
});
