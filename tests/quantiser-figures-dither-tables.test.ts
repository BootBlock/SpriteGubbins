import { beforeAll, describe, expect, it } from 'vitest';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { calibrationSettings } from './calibrationSettings.ts';
import { cellMeanField, meanCellDistance, toConeField } from './cellDistance.ts';
import { boundaryMesh } from '../src/utils/gridMesh.ts';
import { countColors, fromHex } from '../src/utils/imageData.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import type { ColorReduction } from '../src/types/quantiser.ts';

/**
 * The two dither tables `DITHER_CHOICES` and `DITHER_SHORTLIST` state, re-derived from the
 * reference sheet. See `calibrationSettings.ts` for why the docblock-figure suites exist.
 */
describe('the two dither tables', () => {
  let sheet: ImageData;

  beforeAll(async () => {
    sheet = await loadCorpusSheet('armour.png');
  }, 120_000);

  const GAME_BOY = ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F'].map((hex) => {
    const parsed = fromHex(hex);
    if (parsed === null) throw new Error(`not a colour: ${hex}`);
    return parsed;
  });

  /** A row of the tables: the three figures, per pixel and over 4 x 4 and 8 x 8 blocks. */
  const rowOf = (
    reference: Float64Array,
    image: ImageData,
    width: number,
    height: number,
  ): readonly number[] => {
    const field = toConeField(image);
    return [1, 4, 8].map((block) =>
      Number(meanCellDistance(reference, field, width, height, block).toFixed(3)),
    );
  };

  it('DITHER_CHOICES — the budget-32 row, against the source cell means', () => {
    const mesh = boundaryMesh(sheet, 6);
    const reference = cellMeanField(sheet, mesh);
    const reduction: ColorReduction = { kind: 'MAX_COLORS', maxColors: 32 };
    const rows = (['NONE', 'BAYER_4', 'BAYER_8', 'BLUE_NOISE'] as const).map((dither) =>
      rowOf(
        reference,
        quantiseImage(sheet, calibrationSettings({ dither, reduction })).image,
        mesh.x.length,
        mesh.y.length,
      ),
    );

    // Three decimals rather than the docblock's own one, because 15.75 rounds either way and the
    // table says 15.7 — a two-decimal pin would not tell the two apart.
    expect(rows).toEqual([
      [14.335, 4.734, 3.377],
      [15.747, 4.44, 3.116],
      [15.812, 4.472, 3.158],
      [15.757, 4.476, 3.133],
    ]);
  }, 240_000);

  it('DITHER_CHOICES — the two channel-depth rows, against the source cell means', () => {
    // The machines that take the classic per-channel threshold rather than a mixing plan, so the
    // budget row above cannot stand for them: a change to either dither moves only its own rows.
    const mesh = boundaryMesh(sheet, 6);
    const reference = cellMeanField(sheet, mesh);
    const rows = [3, 2].map((bitsPerChannel) =>
      (['NONE', 'BAYER_4', 'BAYER_8', 'BLUE_NOISE'] as const).map((dither) =>
        rowOf(
          reference,
          quantiseImage(
            sheet,
            calibrationSettings({ dither, reduction: { kind: 'CHANNEL_DEPTH', bitsPerChannel } }),
          ).image,
          mesh.x.length,
          mesh.y.length,
        ),
      ),
    );

    expect(rows).toEqual([
      [
        [20.214, 8.019, 6.362],
        [22.24, 4.649, 3.29],
        [22.222, 4.709, 3.261],
        [22.257, 4.879, 3.198],
      ],
      [
        [24.039, 9.564, 7.099],
        [27.518, 5.517, 3.716],
        [27.771, 5.65, 3.587],
        [27.713, 5.905, 3.572],
      ],
    ]);
  }, 240_000);

  it('DITHER_SHORTLIST — the column the constant ships, against the sheet with no palette step', () => {
    const flat = quantiseImage(sheet, calibrationSettings({ reduction: null }));
    const reference = toConeField(flat.image);
    const { width, height } = flat.image;

    expect(width * height).toBe(43_681);
    expect(countColors(flat.image)).toBe(9_975);
    expect(countColors(sheet)).toBe(218_978);

    const budgets: readonly ColorReduction[] = [
      { kind: 'MAX_COLORS', maxColors: 64 },
      { kind: 'MAX_COLORS', maxColors: 16 },
      { kind: 'MAX_COLORS', maxColors: 8 },
      { kind: 'PALETTE', entries: GAME_BOY },
    ];

    expect(
      budgets.map((reduction) =>
        rowOf(
          reference,
          quantiseImage(sheet, calibrationSettings({ dither: 'BLUE_NOISE', reduction })).image,
          width,
          height,
        ),
      ),
    ).toEqual([
      [2.199, 0.75, 0.44],
      [4.264, 1.428, 0.876],
      [6.109, 2.516, 1.645],
      [93.926, 84.982, 87.523],
    ]);
  }, 240_000);
});
