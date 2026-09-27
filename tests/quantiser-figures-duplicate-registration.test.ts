import { beforeAll, describe, expect, it } from 'vitest';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { DUPLICATE_TOLERANCE_RANGE } from '../src/constants/quantiser.ts';
import { duplicateSprites } from '../src/utils/duplicateSprites.ts';
import { createImage, fromHex, pixelOffset } from '../src/utils/imageData.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import { snapDuplicates } from '../src/utils/snapDuplicates.ts';
import { spriteDistance } from '../src/utils/spriteEquality.ts';
import type { SpriteBox } from '../src/types/quantiser.ts';

/**
 * The figure `DUPLICATE_REGISTRATION_REACH` states. See `calibrationSettings.ts` for why the
 * docblock-figure suites exist.
 *
 * Each of `test_sprites/armour.png`'s 15 sprites, quantised at a grid of 6 and keyed on `#FF00FF` at
 * tolerance 24 with no palette step, is paired with a copy of itself carrying one extra pixel on one
 * edge. The pixel is the first drawn pixel along that edge, in reading order, repeated one step
 * outward — the smallest change keying makes to a silhouette. Laid corner to corner at the top rung
 * of the dial, the pair matches where that pixel sits on the right or bottom edge and never where it
 * sits on the left or top, because there it moves the corner. Registered first, every pair matches
 * and every fold is made.
 */
describe('registerSprites — the figure DUPLICATE_REGISTRATION_REACH states', () => {
  let sheet: ImageData;
  let sprites: readonly SpriteBox[];

  beforeAll(async () => {
    const magenta = fromHex('#FF00FF');
    if (magenta === null) throw new Error('the key colour no longer parses');
    const result = quantiseImage(await loadCorpusSheet('armour.png'), {
      ...QUANTISE_DEFAULT_DIALS,
      grid: 6,
      key: { color: magenta, tolerance: 24 },
      reduction: null,
    });
    sheet = result.image;
    sprites = result.sprites.kind === 'SEGMENTED' ? result.sprites.boxes : [];
  }, 120_000);

  type Edge = 'left' | 'top' | 'right' | 'bottom';

  /**
   * A sheet holding `box`'s artwork twice, the second copy with one pixel added outside `edge`, and
   * the two boxes the pair fills.
   */
  const pairOf = (box: SpriteBox, edge: Edge): { image: ImageData; boxes: [SpriteBox, SpriteBox] } => {
    const margin = 4;
    const pitch = box.width + 2 * margin;
    const image = createImage(2 * pitch, box.height + 2 * margin);
    const stamp = (left: number, column: number, row: number, from = { column, row }): void => {
      const read = pixelOffset(sheet.width, box.left + from.column, box.top + from.row);
      image.data.set(
        sheet.data.subarray(read, read + 4),
        pixelOffset(image.width, left + column, margin + row),
      );
    };
    for (let row = 0; row < box.height; row += 1) {
      for (let column = 0; column < box.width; column += 1) {
        stamp(margin, column, row);
        stamp(pitch + margin, column, row);
      }
    }

    const drawn = (column: number, row: number): boolean =>
      (sheet.data[pixelOffset(sheet.width, box.left + column, box.top + row) + 3] ?? 0) > 0;
    const along = edge === 'left' || edge === 'right' ? box.height : box.width;
    const fixed = { left: 0, top: 0, right: box.width - 1, bottom: box.height - 1 }[edge];
    const vertical = edge === 'left' || edge === 'right';
    const step = edge === 'left' || edge === 'top' ? -1 : 1;
    const at = Array.from({ length: along }, (_, index) => index).find((index) =>
      vertical ? drawn(fixed, index) : drawn(index, fixed),
    );
    if (at === undefined) {
      throw new Error(`sprite at ${String(box.left)}, ${String(box.top)} has no ${edge} pixel`);
    }
    const [column, row] = vertical ? [fixed, at] : [at, fixed];
    const [outColumn, outRow] = vertical ? [column + step, row] : [column, row + step];
    stamp(pitch + margin, outColumn, outRow, { column, row });

    const copy: SpriteBox = {
      left: pitch + margin + Math.min(0, outColumn),
      top: margin + Math.min(0, outRow),
      width: box.width + (vertical ? 1 : 0),
      height: box.height + (vertical ? 0 : 1),
      pixels: box.pixels + 1,
    };
    return { image, boxes: [{ ...box, left: margin, top: margin }, copy] };
  };

  const top = DUPLICATE_TOLERANCE_RANGE.max;

  it.each([
    ['right', 15],
    ['bottom', 15],
    ['left', 0],
    ['top', 0],
  ] as const)('on the %s edge, matches %i of 15 pairs laid corner to corner', (edge, expected) => {
    expect(sprites).toHaveLength(15);
    const matched = sprites.filter((box) => {
      const { image, boxes } = pairOf(box, edge);
      return spriteDistance(image, boxes[0], boxes[1], { x: 0, y: 0 }, top) <= top;
    });
    expect(matched).toHaveLength(expected);
  });

  it.each(['right', 'bottom', 'left', 'top'] as const)(
    'groups and folds all 15 pairs on the %s edge',
    (edge) => {
      expect(sprites).toHaveLength(15);
      const outcomes = sprites.map((box) => {
        const { image, boxes } = pairOf(box, edge);
        const groups = duplicateSprites(image, boxes, top);
        return [groups.length, snapDuplicates(image, groups, boxes, 0).folded];
      });
      expect(outcomes).toEqual(sprites.map(() => [1, 1]));
    },
  );
});
