import { beforeAll, describe, expect, it } from 'vitest';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { calibrationSettings } from './calibrationSettings.ts';
import { cellMeanField, type ConeField } from './cellDistance.ts';
import { ditherFigureRow } from './ditherFigureRow.ts';
import { machineReduction } from './machineReductions.ts';
import { boundaryMesh } from '../src/utils/gridMesh.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import type { ColorReduction } from '../src/types/quantiser.ts';

/**
 * Every row of the table `DITHER_CHOICES` states, re-derived from the reference sheet against the
 * source's own cell means. See `calibrationSettings.ts` for why the docblock-figure suites exist.
 *
 * Its sibling table, `DITHER_SHORTLIST`'s, is pinned by `quantiser-figures-dither-shortlist.test.ts`
 * and `-unrestricted.test.ts`, which sweep the pipeline once per shortlist size.
 */
describe('the DITHER_CHOICES table', () => {
  let sheet: ImageData;
  let reference: ConeField;
  let width: number;
  let height: number;

  beforeAll(async () => {
    sheet = await loadCorpusSheet('armour.png');
    const mesh = boundaryMesh(sheet, 6);
    reference = cellMeanField(sheet, mesh);
    width = mesh.x.length;
    height = mesh.y.length;
  }, 120_000);

  /** One row of the table: flat, then the three patterns, in the order the control offers them. */
  const rowFor = (reduction: ColorReduction): readonly (readonly number[])[] =>
    (['NONE', 'BAYER_4', 'BAYER_8', 'BLUE_NOISE'] as const).map((dither) =>
      ditherFigureRow(
        reference,
        quantiseImage(sheet, calibrationSettings({ dither, reduction })).image,
        width,
        height,
      ),
    );

  it('the budget rows, which move with the palette the sheet is given', () => {
    // A change to the palette builder moves these four and none of the channel-depth rows below.
    expect([64, 32, 16, 8].map((maxColors) => rowFor({ kind: 'MAX_COLORS', maxColors }))).toEqual([
      [
        [12.134, 3.662, 2.311],
        [14.991, 4.223, 2.938],
        [14.995, 4.229, 2.943],
        [15.023, 4.244, 2.943],
      ],
      [
        [13.161, 4.394, 3.025],
        [15.263, 4.386, 3.066],
        [15.534, 4.563, 3.151],
        [15.533, 4.499, 3.079],
      ],
      [
        [13.832, 4.707, 3.341],
        [15.947, 4.442, 3.122],
        [16.015, 4.502, 3.166],
        [16.002, 4.479, 3.096],
      ],
      [
        [15.88, 6.548, 5.146],
        [17.251, 4.763, 3.295],
        [17.315, 4.81, 3.346],
        [17.221, 4.729, 3.259],
      ],
    ]);
  }, 240_000);

  it('the machine rows, whose palettes are stated rather than chosen', () => {
    // The Game Boy's four greens go through the mixing plan, so its dithered cells move with
    // `DITHER_SHORTLIST`; the two channel-depth machines take the classic per-channel threshold and
    // no palette builder, so neither a shortlist nor a palette change moves them.
    expect(
      (['GAME_BOY_DMG', 'MEGA_DRIVE', 'MASTER_SYSTEM'] as const).map((id) => rowFor(machineReduction(id))),
    ).toEqual([
      [
        [92.155, 90.182, 92.039],
        [91.609, 85.729, 87.918],
        [91.604, 85.738, 87.92],
        [91.616, 85.82, 87.931],
      ],
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
});
